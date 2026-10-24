import Decimal from "decimal.js";
import type { Database } from "./database.types";
export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Product = Row<"products">;
export type Entry = Row<"shopping_list_entries">;
export type PurchaseLine = Row<"purchase_line_items">;
export type Status = "enough" | "low" | "out";
export type Snapshot = {
  profile: Row<"profiles">;
  household: Row<"households">;
  role: "owner" | "member";
  products: Product[];
  availability: Row<"household_items">[];
  entries: Entry[];
  purchases: Row<"purchases">[];
  lines: PurchaseLine[];
  members: (Row<"household_members"> & { name: string })[];
  invitations: Omit<Row<"household_invitations">, "token_hash">[];
};
export const money = (value: Decimal.Value) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
    new Decimal(value).toNumber(),
  );
export const localDate = (value: string | Date, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(
    new Date(typeof value === "string" && value.length === 10 ? `${value}T12:00:00+08:00` : value),
  );
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function latestPrice(
  product: Product,
  unit: string,
  lines: PurchaseLine[],
  purchases: Row<"purchases">[],
) {
  const dates = new Map(purchases.map((p) => [p.id, p.purchase_date]));
  return lines
    .filter(
      (l) =>
        l.product_id === product.id &&
        l.package_size === product.package_size &&
        l.purchase_unit === unit,
    )
    .sort(
      (a, b) =>
        (dates.get(b.purchase_id) ?? "").localeCompare(dates.get(a.purchase_id) ?? "") ||
        b.created_at.localeCompare(a.created_at),
    )[0];
}
export function estimate(
  entries: Entry[],
  products: Product[],
  lines: PurchaseLine[],
  purchases: Row<"purchases">[],
) {
  let subtotal = new Decimal(0);
  let missing = 0;
  for (const entry of entries.filter((e) => e.status === "pending")) {
    const product = products.find((p) => p.id === entry.product_id);
    const price = product && latestPrice(product, entry.purchase_unit, lines, purchases);
    if (price) subtotal = subtotal.plus(new Decimal(entry.quantity).times(price.unit_price));
    else missing++;
  }
  return { subtotal: subtotal.toFixed(2), missing };
}
export function monthlySpend(
  lines: PurchaseLine[],
  purchases: Row<"purchases">[],
  month = today().slice(0, 7),
) {
  const ids = new Set(purchases.filter((p) => p.purchase_date.startsWith(month)).map((p) => p.id));
  return lines
    .filter((l) => ids.has(l.purchase_id))
    .reduce((sum, l) => sum.plus(l.line_total ?? 0), new Decimal(0))
    .toFixed(2);
}
