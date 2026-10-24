import { z } from "zod";
import { categories, statuses } from "./labels";
const text = (max: number) => z.string().trim().max(max);
export const productSchema = z.object({
  id: z.uuid().optional(),
  name: text(160).min(1, "Enter a product name"),
  barcode: text(32)
    .regex(/^\d{4,32}$|^$/, "Use digits only")
    .default(""),
  brand: text(100).default(""),
  package_size: text(80).default(""),
  category: z.enum(categories),
  notes: text(1000).default(""),
  source: z.enum(["manual", "external"]).default("manual"),
  image_path: text(500).nullable().optional(),
  status: z.enum(statuses).default("enough"),
});
export const listSchema = z.object({
  product_id: z.uuid(),
  quantity: z.number().positive().max(10000).multipleOf(0.001),
  purchase_unit: text(40)
    .min(1)
    .transform((s) => s.toLowerCase()),
  priority: z.enum(["normal", "urgent"]).default("normal"),
  notes: text(500).default(""),
  replace: z.boolean().default(false),
});
export const purchaseSchema = z.object({
  product_id: z.uuid(),
  entry_id: z.uuid().nullable().default(null),
  expected_version: z.number().int().positive().nullable().default(null),
  quantity: z.number().positive().max(10000).multipleOf(0.001),
  purchase_unit: text(40)
    .min(1)
    .transform((s) => s.toLowerCase()),
  unit_price: z.number().nonnegative().max(1000000).multipleOf(0.01),
  store: text(160).default(""),
  purchase_date: z.iso.date(),
  status: z.enum(statuses),
  request_id: z.uuid(),
});
export const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save_product"), payload: productSchema }),
  z.object({
    action: z.literal("set_status"),
    payload: z.object({ product_id: z.uuid(), status: z.enum(statuses) }),
  }),
  z.object({ action: z.literal("archive_product"), payload: z.object({ product_id: z.uuid() }) }),
  z.object({ action: z.literal("add_entry"), payload: listSchema }),
  z.object({
    action: z.literal("edit_entry"),
    payload: z.object({
      id: z.uuid(),
      quantity: z.number().positive().max(10000).multipleOf(0.001),
      priority: z.enum(["normal", "urgent"]),
      notes: text(500),
      expected_version: z.number().int().positive(),
    }),
  }),
  z.object({
    action: z.literal("remove_entry"),
    payload: z.object({ id: z.uuid(), expected_version: z.number().int().positive() }),
  }),
  z.object({ action: z.literal("record_purchase"), payload: purchaseSchema }),
  z.object({
    action: z.literal("create_household"),
    payload: z.object({ name: text(100).min(2) }),
  }),
  z.object({
    action: z.literal("join_household"),
    payload: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }),
  }),
  z.object({ action: z.literal("create_invitation"), payload: z.object({}) }),
  z.object({ action: z.literal("revoke_invitation"), payload: z.object({ id: z.uuid() }) }),
  z.object({ action: z.literal("remove_member"), payload: z.object({ user_id: z.uuid() }) }),
  z.object({
    action: z.literal("rename_household"),
    payload: z.object({ name: text(100).min(2) }),
  }),
  z.object({ action: z.literal("update_profile"), payload: z.object({ name: text(100).min(1) }) }),
]);
export type Mutation = z.input<typeof mutationSchema>;
