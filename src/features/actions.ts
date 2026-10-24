"use server";
import { revalidatePath } from "next/cache";
import { mutationSchema } from "@/lib/validation";
import { serverClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase/config";
import type { Json } from "@/lib/database.types";
export type ActionResult = { ok: true; data: Json } | { ok: false; error: string; code?: string };
export async function mutate(input: unknown): Promise<ActionResult> {
  const parsed = mutationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form fields." };
  if (!isConfigured) return { ok: false, error: "Connect Supabase before saving household data." };
  const client = await serverClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };
  const { data, error } = await client
    .rpc("household_action", {
      action: parsed.data.action,
      payload: parsed.data.payload as Json,
    })
    .retry(false);
  if (error) {
    const message =
      error.code === "23505"
        ? parsed.data.action === "save_product"
          ? "This barcode already belongs to a saved product. Search for it in your items."
          : error.message
        : error.message;
    return { ok: false, error: message, code: error.code };
  }
  revalidatePath("/", "layout");
  return { ok: true, data };
}
