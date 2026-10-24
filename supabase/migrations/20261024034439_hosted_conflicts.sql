-- PostgREST 14 retries SQLSTATE 40001 indefinitely. Business conflicts use HTTP 409 instead.
create or replace function private.perform_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); hid uuid; role_name text; pid uuid; lid uuid; result_id uuid;
 prod public.products; ent public.shopping_list_entries; inv public.household_invitations; existing public.purchases;
 qty numeric; price numeric; unit_name text; token text; target uuid; pdate date;
begin
 if uid is null then raise exception 'Please sign in again.' using errcode='42501'; end if;
 select household_id,role into hid,role_name from public.household_members where user_id=uid for share;
 if action='update_profile' then
  update public.profiles set name=trim(payload->>'name'),updated_at=now() where id=uid; return '{}'::jsonb;
 end if;
 if action in ('create_household','join_household') then
  -- Serializes concurrent create/join attempts for the same user.
  perform 1 from public.profiles where id=uid for update;
  if exists(select 1 from public.household_members where user_id=uid) then raise exception 'You already belong to a household.'; end if;
  if action='create_household' then
   insert into public.households(name,created_by) values(trim(payload->>'name'),uid) returning id into hid;
   insert into public.household_members values(uid,hid,'owner',now());
   insert into public.shopping_lists(household_id) values(hid);
  else
   select * into inv from public.household_invitations where token_hash=encode(sha256(convert_to(payload->>'token','UTF8')),'hex') for update;
   if not found or inv.revoked_at is not null or inv.used_at is not null or inv.expires_at<=now() then raise exception 'This invitation is invalid, expired, or already used.'; end if;
   hid:=inv.household_id;
   insert into public.household_members values(uid,hid,'member',now());
   update public.household_invitations set used_by=uid,used_at=now() where id=inv.id;
  end if;
  return jsonb_build_object('id',hid);
 end if;
 if hid is null then raise exception 'Create or join a household first.' using errcode='42501'; end if;
 if action in ('create_invitation','revoke_invitation','remove_member','rename_household') then
  if role_name<>'owner' then raise exception 'Only the household owner can do this.' using errcode='42501'; end if;
  if action='create_invitation' then
   if (select count(*) from public.household_invitations where household_id=hid and expires_at>now() and revoked_at is null and used_at is null)>=20 then raise exception 'Revoke an invitation before creating another.'; end if;
   token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
   insert into public.household_invitations(household_id,token_hash,created_by) values(hid,encode(sha256(convert_to(token,'UTF8')),'hex'),uid) returning id into result_id;
   return jsonb_build_object('id',result_id,'token',token);
  elsif action='revoke_invitation' then
   update public.household_invitations set revoked_at=now() where id=(payload->>'id')::uuid and household_id=hid;
  elsif action='remove_member' then
   delete from public.household_members where user_id=(payload->>'user_id')::uuid and household_id=hid and role='member';
  else update public.households set name=trim(payload->>'name'),updated_at=now() where id=hid;
  end if;
  return '{}'::jsonb;
 end if;
 if action='save_product' then
  if payload->>'id' is not null then
   pid:=(payload->>'id')::uuid;
   select * into prod from public.products where id=pid and household_id=hid for update;
   if not found then raise exception 'Item not found.' using errcode='42501'; end if;
   update public.products set name=trim(payload->>'name'),barcode=nullif(trim(payload->>'barcode'),''),brand=coalesce(payload->>'brand',''),package_size=coalesce(payload->>'package_size',''),category=payload->>'category',notes=coalesce(payload->>'notes',''),image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,source=coalesce(payload->>'source','manual'),updated_at=now() where id=pid;
  else
   insert into public.products(household_id,name,barcode,brand,package_size,category,notes,source,image_path)
   values(hid,trim(payload->>'name'),nullif(trim(payload->>'barcode'),''),coalesce(payload->>'brand',''),coalesce(payload->>'package_size',''),payload->>'category',coalesce(payload->>'notes',''),coalesce(payload->>'source','manual'),payload->>'image_path') returning id into pid;
  end if;
  insert into public.household_items(product_id,household_id,status,updated_by) values(pid,hid,coalesce(payload->>'status','enough'),uid)
  on conflict(product_id) do update set status=excluded.status,updated_by=uid,updated_at=now();
  return jsonb_build_object('id',pid);
 end if;
 if action in ('edit_entry','remove_entry') then
  select * into ent from public.shopping_list_entries where id=(payload->>'id')::uuid and household_id=hid for update;
  if not found or ent.status<>'pending' then raise exception 'This entry is no longer pending. Refresh your list.'; end if;
  if ent.version<>(payload->>'expected_version')::int then raise exception 'Someone updated this item. Refresh and try again.' using errcode='PT409'; end if;
  if action='remove_entry' then
   update public.shopping_list_entries set status='removed',version=version+1,updated_at=now() where id=ent.id;
  else
   update public.shopping_list_entries set quantity=(payload->>'quantity')::numeric,priority=payload->>'priority',notes=coalesce(payload->>'notes',''),version=version+1,updated_at=now() where id=ent.id;
  end if;
  return '{}'::jsonb;
 end if;
 pid:=(payload->>'product_id')::uuid;
 -- Serializes product/list/purchase operations. Archived items retain their history.
 select * into prod from public.products where id=pid and household_id=hid and archived_at is null for update;
 if not found then raise exception 'Item not found or archived.' using errcode='42501'; end if;
 if action='set_status' then
  update public.household_items set status=payload->>'status',updated_by=uid,updated_at=now() where product_id=pid;
 elsif action='archive_product' then
  if exists(select 1 from public.shopping_list_entries where product_id=pid and status='pending') then raise exception 'Remove this item from the shopping list before archiving.'; end if;
  update public.products set archived_at=now(),updated_at=now() where id=pid;
 elsif action='add_entry' then
  select id into lid from public.shopping_lists where household_id=hid;
  select * into ent from public.shopping_list_entries where list_id=lid and product_id=pid and status='pending' for update;
  if found then
   if coalesce((payload->>'replace')::boolean,false) is not true then raise exception 'This item is already on your list. Choose Update quantity to replace the pending quantity.' using errcode='23505'; end if;
   if ent.purchase_unit<>lower(trim(payload->>'purchase_unit')) then raise exception 'Purchase unit differs. Edit or remove the existing entry first.'; end if;
   update public.shopping_list_entries set quantity=(payload->>'quantity')::numeric,priority=coalesce(payload->>'priority','normal'),notes=coalesce(payload->>'notes',''),version=version+1,updated_at=now() where id=ent.id;
   return jsonb_build_object('id',ent.id);
  end if;
  insert into public.shopping_list_entries(household_id,list_id,product_id,quantity,purchase_unit,priority,notes,added_by)
  values(hid,lid,pid,(payload->>'quantity')::numeric,lower(trim(payload->>'purchase_unit')),coalesce(payload->>'priority','normal'),coalesce(payload->>'notes',''),uid) returning id into result_id;
  return jsonb_build_object('id',result_id);
 elsif action='record_purchase' then
  -- Same key + identical payload returns the original receipt, including on retry after a lost response.
  perform pg_advisory_xact_lock(hashtextextended(hid::text||(payload->>'request_id'),0));
  select * into existing from public.purchases where household_id=hid and request_id=(payload->>'request_id')::uuid;
  if found then
   if existing.request_payload<>payload or existing.recorded_by<>uid then raise exception 'This submission key was already used for another purchase.'; end if;
   return jsonb_build_object('id',existing.id,'replayed',true);
  end if;
  qty:=(payload->>'quantity')::numeric; price:=(payload->>'unit_price')::numeric; unit_name:=lower(trim(payload->>'purchase_unit')); pdate:=(payload->>'purchase_date')::date;
  if qty is null or qty<=0 or qty>10000 or qty<>round(qty,3) or price is null or price<0 or price>1000000 or price<>round(price,2) then raise exception 'Enter a valid quantity and unit price.'; end if;
  if pdate is null or pdate>(now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Purchase date cannot be in the future.'; end if;
  if payload->>'entry_id' is not null then
   select * into ent from public.shopping_list_entries where id=(payload->>'entry_id')::uuid and household_id=hid for update;
   if not found or ent.product_id<>pid or ent.status<>'pending' then raise exception 'This shopping entry has changed. Refresh your list.'; end if;
   if ent.version<>(payload->>'expected_version')::int or payload->>'expected_version' is null then raise exception 'Someone updated this item. Refresh and try again.' using errcode='PT409'; end if;
   if unit_name<>ent.purchase_unit or qty>ent.quantity then raise exception 'Use the listed purchase unit and a quantity no greater than the remaining amount.'; end if;
  end if;
  insert into public.purchases(household_id,store,purchase_date,recorded_by,request_id,request_payload) values(hid,coalesce(payload->>'store',''),pdate,uid,(payload->>'request_id')::uuid,payload) returning id into result_id;
  insert into public.purchase_line_items(household_id,purchase_id,product_id,entry_id,product_name,package_size,quantity,purchase_unit,unit_price)
  values(hid,result_id,pid,(payload->>'entry_id')::uuid,prod.name,prod.package_size,qty,unit_name,price);
  if ent.id is not null then
   update public.shopping_list_entries set quantity=case when qty<quantity then quantity-qty else quantity end,status=case when qty<quantity then 'pending' else 'purchased' end,purchased_by=uid,version=version+1,updated_at=now() where id=ent.id;
  end if;
  update public.household_items set status=payload->>'status',updated_by=uid,updated_at=now() where product_id=pid;
  return jsonb_build_object('id',result_id);
 else raise exception 'Unknown action.';
 end if;
 return '{}'::jsonb;
end $$;
