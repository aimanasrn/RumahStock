import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { databaseHarness } from "./database-harness";
async function main() {
  const db = await databaseHarness();
  let passed = 0;
  const owner = randomUUID(),
    member = randomUUID(),
    outsider = randomUUID(),
    newcomer = randomUUID();
  for (const [id, name] of [
    [owner, "Owner"],
    [member, "Member"],
    [outsider, "Outsider"],
    [newcomer, "Newcomer"],
  ])
    await db.query("insert into auth.users(id,raw_user_meta_data) values($1,$2)", [
      id,
      JSON.stringify({ name }),
    ]);
  async function as(user: string | null) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
    await db.exec(`set role ${user ? "authenticated" : "anon"}`);
  }
  async function act(action: string, payload: Record<string, unknown> = {}) {
    return (
      await db.query<{ result: Record<string, unknown> }>(
        "select public.household_action($1,$2::jsonb) as result",
        [action, JSON.stringify(payload)],
      )
    ).rows[0].result;
  }
  async function check(name: string, fn: () => Promise<void>) {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  }
  async function rejects(fn: () => Promise<unknown>, pattern: RegExp) {
    await assert.rejects(fn, pattern);
  }
  await as(owner);
  const home = await act("create_household", { name: "Test home" });
  const hid = String(home.id);
  await check("creator is the only owner and a shared list is created", async () => {
    const rows = await db.query<{ role: string }>("select role from public.household_members");
    assert.equal(rows.rows[0].role, "owner");
    assert.equal((await db.query("select * from public.shopping_lists")).rows.length, 1);
  });
  await check("one household per user", async () => {
    await rejects(() => act("create_household", { name: "Second home" }), /already belong/);
  });
  await check("direct role self-assignment is denied", async () => {
    await rejects(
      () => db.query("update public.household_members set role='member' where user_id=$1", [owner]),
      /permission denied/,
    );
  });
  const invitation = await act("create_invitation");
  const token = String(invitation.token);
  await check("only token hashes are stored, tokens are not readable", async () => {
    assert.match(token, /^[a-f0-9]{64}$/);
    await rejects(
      () => db.query("select token_hash from public.household_invitations"),
      /permission denied/,
    );
  });
  await as(member);
  await act("join_household", { token });
  await check("invitation gives a member role, never an owner role", async () => {
    assert.equal(
      (
        await db.query<{ role: string }>(
          "select role from public.household_members where user_id=$1",
          [member],
        )
      ).rows[0].role,
      "member",
    );
  });
  await check("member cannot create invitations", async () => {
    await rejects(() => act("create_invitation"), /Only the household owner/);
  });
  await check("member cannot remove members", async () => {
    await rejects(() => act("remove_member", { user_id: owner }), /Only the household owner/);
  });
  await check("member cannot rename household", async () => {
    await rejects(
      () => act("rename_household", { name: "Malicious rename" }),
      /Only the household owner/,
    );
  });
  await as(newcomer);
  await check("invitation cannot be reused", async () => {
    await rejects(() => act("join_household", { token }), /invalid, expired, or already used/);
  });
  await as(owner);
  const revoked = await act("create_invitation");
  await act("revoke_invitation", { id: revoked.id });
  await as(newcomer);
  await check("revoked invitation is rejected", async () => {
    await rejects(() => act("join_household", { token: revoked.token }), /invalid, expired/);
  });
  await as(owner);
  const expired = await act("create_invitation");
  await db.exec("reset role");
  await db.query(
    "update public.household_invitations set expires_at=now()-interval '1 hour' where id=$1",
    [expired.id],
  );
  await as(newcomer);
  await check("expired invitation is rejected", async () => {
    await rejects(() => act("join_household", { token: expired.token }), /invalid, expired/);
  });
  await as(owner);
  const base = {
    name: "Rice",
    barcode: "0012345678905",
    brand: "",
    package_size: "5 kg",
    category: "Food and pantry",
    notes: "",
    source: "manual",
    status: "low",
  };
  const product = await act("save_product", base);
  const pid = String(product.id);
  await check("barcode stays a string with leading zeros", async () => {
    assert.equal(
      (
        await db.query<{ barcode: string }>("select barcode from public.products where id=$1", [
          pid,
        ])
      ).rows[0].barcode,
      "0012345678905",
    );
  });
  await check("same household cannot duplicate a barcode", async () => {
    await rejects(() => act("save_product", base), /unique constraint/);
  });
  const noBarcode = await act("save_product", { ...base, name: "Market fish", barcode: "" });
  await check("market purchases without barcodes are supported", async () => {
    assert.equal(
      (
        await db.query<{ barcode: null }>("select barcode from public.products where id=$1", [
          noBarcode.id,
        ])
      ).rows[0].barcode,
      null,
    );
  });
  const entry = await act("add_entry", {
    product_id: pid,
    quantity: 3,
    purchase_unit: "bag",
    priority: "urgent",
  });
  const eid = String(entry.id);
  await check("pending entry is unique and requires explicit quantity replacement", async () => {
    await rejects(
      () => act("add_entry", { product_id: pid, quantity: 1, purchase_unit: "bag" }),
      /already on your list/,
    );
    assert.equal(
      (await db.query("select * from public.shopping_list_entries where status='pending'")).rows
        .length,
      1,
    );
  });
  await check("zero requested quantity is rejected", async () => {
    await rejects(
      () => act("edit_entry", { id: eid, quantity: 0, priority: "normal", expected_version: 1 }),
      /check constraint/,
    );
  });
  const purchase = {
    product_id: pid,
    entry_id: eid,
    expected_version: 1,
    quantity: 1,
    purchase_unit: "bag",
    unit_price: 23.45,
    store: "Test market",
    purchase_date: "2026-10-01",
    status: "enough",
    request_id: randomUUID(),
  };
  await check("negative price rolls back without purchases or availability changes", async () => {
    await rejects(
      () => act("record_purchase", { ...purchase, unit_price: -1 }),
      /valid quantity and unit price/,
    );
    assert.equal((await db.query("select * from public.purchases")).rows.length, 0);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.household_items where product_id=$1",
          [pid],
        )
      ).rows[0].status,
      "low",
    );
  });
  await check("future purchase dates are rejected", async () => {
    await rejects(
      () => act("record_purchase", { ...purchase, purchase_date: "2999-01-01" }),
      /future/,
    );
  });
  await check("incompatible purchase units are rejected", async () => {
    await rejects(
      () => act("record_purchase", { ...purchase, purchase_unit: "bottle" }),
      /listed purchase unit/,
    );
  });
  await check("over-purchase of shopping entry is rejected", async () => {
    await rejects(() => act("record_purchase", { ...purchase, quantity: 4 }), /no greater/);
  });
  const receipt = await act("record_purchase", purchase);
  await check(
    "partial purchase, price, availability and remaining quantity commit together",
    async () => {
      const e = (
        await db.query<{ quantity: string; status: string; version: number }>(
          "select quantity,status,version from public.shopping_list_entries where id=$1",
          [eid],
        )
      ).rows[0];
      assert.equal(Number(e.quantity), 2);
      assert.equal(e.status, "pending");
      assert.equal(e.version, 2);
      assert.equal(
        (
          await db.query<{ status: string }>(
            "select status from public.household_items where product_id=$1",
            [pid],
          )
        ).rows[0].status,
        "enough",
      );
      assert.equal(
        Number(
          (
            await db.query<{ line_total: string }>(
              "select line_total from public.purchase_line_items",
            )
          ).rows[0].line_total,
        ),
        23.45,
      );
    },
  );
  await check("identical retry returns same receipt without a duplicate", async () => {
    assert.equal((await act("record_purchase", purchase)).id, receipt.id);
    assert.equal((await db.query("select * from public.purchases")).rows.length, 1);
    assert.equal((await db.query("select * from public.purchase_line_items")).rows.length, 1);
  });
  await check("reusing idempotency key with changed payload is rejected", async () => {
    await rejects(() => act("record_purchase", { ...purchase, unit_price: 4 }), /another purchase/);
  });
  await as(member);
  await check("second member cannot record from a stale shopping version", async () => {
    await rejects(
      () => act("record_purchase", { ...purchase, request_id: randomUUID() }),
      /Someone updated/,
    );
  });
  await check("second member sees shared list and can finish remaining purchase", async () => {
    await act("record_purchase", {
      ...purchase,
      quantity: 2,
      expected_version: 2,
      request_id: randomUUID(),
    });
    const e = (
      await db.query<{ status: string; purchased_by: string }>(
        "select status,purchased_by from public.shopping_list_entries where id=$1",
        [eid],
      )
    ).rows[0];
    assert.equal(e.status, "purchased");
    assert.equal(e.purchased_by, member);
  });
  await check("purchased entry cannot be purchased twice with a new key", async () => {
    await rejects(
      () =>
        act("record_purchase", {
          ...purchase,
          quantity: 2,
          expected_version: 3,
          request_id: randomUUID(),
        }),
      /shopping entry has changed/,
    );
  });
  await act("save_product", { ...base, id: pid, name: "Renamed rice", package_size: "10 kg" });
  await act("archive_product", { product_id: pid });
  await check("archiving and editing preserve purchase name and package snapshots", async () => {
    const l = (
      await db.query<{ product_name: string; package_size: string }>(
        "select product_name,package_size from public.purchase_line_items limit 1",
      )
    ).rows[0];
    assert.equal(l.product_name, "Rice");
    assert.equal(l.package_size, "5 kg");
    assert.equal((await db.query("select * from public.purchase_line_items")).rows.length, 2);
  });
  await as(outsider);
  const otherHome = await act("create_household", { name: "Other home" });
  await check("unrelated household cannot read private household tables", async () => {
    for (const table of [
      "products",
      "household_items",
      "shopping_lists",
      "shopping_list_entries",
      "purchases",
      "purchase_line_items",
      "household_members",
    ]) {
      assert.equal(
        (await db.query(`select * from public.${table} where household_id=$1`, [hid])).rows.length,
        0,
        table,
      );
    }
  });
  await check("unrelated household cannot see profiles or invitations", async () => {
    assert.equal(
      (await db.query("select * from public.profiles where id=$1", [owner])).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select id from public.household_invitations where household_id=$1", [hid]))
        .rows.length,
      0,
    );
  });
  await check("cross-household status and shopping mutations are blocked", async () => {
    await rejects(
      () => act("set_status", { product_id: noBarcode.id, status: "out" }),
      /not found/,
    );
    await rejects(
      () => act("add_entry", { product_id: noBarcode.id, quantity: 1, purchase_unit: "pack" }),
      /not found/,
    );
  });
  await check("client cannot inject another household in product payload", async () => {
    const p = await act("save_product", { ...base, household_id: hid });
    assert.equal(
      (
        await db.query<{ household_id: string }>(
          "select household_id from public.products where id=$1",
          [p.id],
        )
      ).rows[0].household_id,
      otherHome.id,
    );
  });
  await check("storage policy blocks cross-household uploads", async () => {
    await rejects(
      () =>
        db.query("insert into storage.objects(bucket_id,name) values('product-images',$1)", [
          `${hid}/fake.png`,
        ]),
      /row-level security/,
    );
  });
  await check("storage allows household folder and blocks other household reads", async () => {
    await db.query("insert into storage.objects(bucket_id,name) values('product-images',$1)", [
      `${otherHome.id}/test.png`,
    ]);
    await as(owner);
    assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  });
  await check("malicious cross-household image path is rejected", async () => {
    await rejects(
      () => act("save_product", { ...base, barcode: "", image_path: `${otherHome.id}/test.png` }),
      /check constraint/,
    );
  });
  await act("remove_member", { user_id: member });
  await as(member);
  await check("removed member loses all household data and write access", async () => {
    assert.equal((await db.query("select * from public.products")).rows.length, 0);
    await rejects(
      () => act("set_status", { product_id: noBarcode.id, status: "out" }),
      /Create or join/,
    );
  });
  await as(null);
  await check("anonymous callers cannot invoke mutation RPC or read tables", async () => {
    await rejects(() => act("create_household", { name: "Anonymous home" }), /permission denied/);
    await rejects(() => db.query("select * from public.products"), /permission denied/);
  });
  await db.exec("reset role");
  await check("every public table has RLS enabled", async () => {
    const rows = await db.query<{ relname: string }>(
      "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    );
    assert.deepEqual(rows.rows, []);
  });
  await check("privileged functions are kept outside the exposed public schema", async () => {
    const rows = await db.query(
      "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef",
    );
    assert.equal(rows.rows.length, 0);
  });
  console.log(
    `\n${passed} database checks passed using PostgreSQL (PGlite). Auth, Storage schemas are test harnesses; hosted Supabase and Realtime transport are separate checks.`,
  );
  await db.close();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
