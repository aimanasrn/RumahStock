import { test } from "node:test";
import assert from "node:assert/strict";
import { demoSnapshot } from "../src/lib/demo";
import { estimate, latestPrice, monthlySpend, localDate, money } from "../src/lib/domain";
import { mutationSchema, purchaseSchema } from "../src/lib/validation";
test("estimates exclude unknown prices and multiply compatible quantities precisely", () => {
  const d = demoSnapshot();
  assert.deepEqual(estimate(d.entries, d.products, d.lines, d.purchases), {
    subtotal: "72.30",
    missing: 2,
  });
});
test("package size and purchase unit must both match historical price", () => {
  const d = demoSnapshot(),
    p = d.products[0];
  assert.equal(
    latestPrice({ ...p, package_size: "2 L" }, "bottle", d.lines, d.purchases),
    undefined,
  );
  assert.equal(latestPrice(p, "pack", d.lines, d.purchases), undefined);
});
test("latest price uses purchase date, not late data entry date", () => {
  const d = demoSnapshot(),
    p = d.products[0],
    line = d.lines[0];
  d.purchases.push({
    ...d.purchases[0],
    id: "older",
    purchase_date: "2026-09-01",
    created_at: "2026-10-25T00:00:00Z",
  });
  d.lines.unshift({
    ...line,
    id: "older-line",
    purchase_id: "older",
    unit_price: 100,
    created_at: "2026-10-25T00:00:00Z",
  });
  assert.equal(latestPrice(p, "bottle", d.lines, d.purchases)?.unit_price, 7.5);
});
test("actual spending uses purchase dates and line totals", () => {
  const d = demoSnapshot();
  assert.equal(monthlySpend(d.lines, d.purchases, "2026-10"), "89.10");
  assert.equal(monthlySpend(d.lines, d.purchases, "2026-09"), "0.00");
});
test("missing all prices yields zero subtotal without claiming a total", () => {
  const d = demoSnapshot();
  assert.deepEqual(estimate(d.entries, d.products, [], []), { subtotal: "0.00", missing: 6 });
});
test("date-only values stay on their Malaysian calendar day", () => {
  assert.match(localDate("2026-10-01"), /1 Oct 2026/);
  assert.match(localDate("2026-09-30T17:00:00Z"), /1 Oct 2026/);
  assert.match(money("0.30"), /0.30/);
});
test("server validation rejects zero and negative quantities and fractional cents", () => {
  const d = demoSnapshot();
  const p = {
    product_id: d.products[0].id,
    quantity: 1,
    purchase_unit: "bottle",
    unit_price: 1,
    purchase_date: "2026-10-24",
    status: "enough",
    request_id: d.profile.id,
  };
  assert.equal(purchaseSchema.safeParse({ ...p, quantity: 0 }).success, false);
  assert.equal(purchaseSchema.safeParse({ ...p, unit_price: -1 }).success, false);
  assert.equal(purchaseSchema.safeParse({ ...p, unit_price: 0.001 }).success, false);
  assert.equal(purchaseSchema.safeParse(p).success, true);
});
test("client cannot inject household ids or roles into validated mutations", () => {
  const value = mutationSchema.parse({
    action: "create_household",
    payload: { name: "Our home", role: "owner", household_id: "other" },
  });
  assert.deepEqual(value.payload, { name: "Our home" });
});
