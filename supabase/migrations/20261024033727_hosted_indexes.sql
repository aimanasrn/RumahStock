-- Cover household-scoped foreign keys and actor lookups identified by hosted advisors.
create index invitations_created_by on public.household_invitations(created_by);
create index invitations_used_by on public.household_invitations(used_by);
create index items_household_product on public.household_items(household_id,product_id);
create index items_updated_by on public.household_items(updated_by);
create index households_created_by on public.households(created_by);
create index lines_household_entry on public.purchase_line_items(household_id,entry_id);
create index lines_household_product on public.purchase_line_items(household_id,product_id);
create index lines_household_purchase on public.purchase_line_items(household_id,purchase_id);
create index purchases_recorded_by on public.purchases(recorded_by);
create index entries_added_by on public.shopping_list_entries(added_by);
create index entries_household_list on public.shopping_list_entries(household_id,list_id);
create index entries_household_product on public.shopping_list_entries(household_id,product_id);
create index entries_purchased_by on public.shopping_list_entries(purchased_by);
