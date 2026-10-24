import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "./supabase/server";
import { isConfigured } from "./supabase/config";
import type { Snapshot } from "./domain";
import type { PostgrestError } from "@supabase/supabase-js";
async function readAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
) {
  const data: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await page(offset, offset + 499);
    if (result.error) return { data: null, error: result.error };
    data.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return { data, error: null };
  }
}
export const getIdentity = cache(async () => {
  if (!isConfigured) redirect("/login?setup=required");
  const client = await serverClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  return { client, user };
});
export const getMembership = cache(async () => {
  const { client, user } = await getIdentity();
  const [membership, profile] = await Promise.all([
    client.from("household_members").select("*").eq("user_id", user.id).maybeSingle(),
    client.from("profiles").select("*").eq("id", user.id).single(),
  ]);
  if (membership.error || profile.error)
    throw new Error(
      "Your household could not be loaded. Check the database migration and try again.",
    );
  return { client, user, membership: membership.data, profile: profile.data };
});
export const getSnapshot = cache(async (): Promise<Snapshot> => {
  const { client, membership, profile } = await getMembership();
  if (!membership) redirect("/onboarding");
  const hid = membership.household_id;
  const [
    household,
    products,
    availability,
    entries,
    purchases,
    lines,
    members,
    profiles,
    invitations,
  ] = await Promise.all([
    client.from("households").select("*").eq("id", hid).single(),
    readAll((a, b) =>
      client
        .from("products")
        .select("*")
        .eq("household_id", hid)
        .order("name")
        .order("id")
        .range(a, b),
    ),
    readAll((a, b) =>
      client
        .from("household_items")
        .select("*")
        .eq("household_id", hid)
        .order("product_id")
        .range(a, b),
    ),
    readAll((a, b) =>
      client
        .from("shopping_list_entries")
        .select("*")
        .eq("household_id", hid)
        .neq("status", "removed")
        .order("created_at", { ascending: false })
        .order("id")
        .range(a, b),
    ),
    readAll((a, b) =>
      client
        .from("purchases")
        .select("*")
        .eq("household_id", hid)
        .order("purchase_date", { ascending: false })
        .order("id")
        .range(a, b),
    ),
    readAll((a, b) =>
      client
        .from("purchase_line_items")
        .select("*")
        .eq("household_id", hid)
        .order("created_at", { ascending: false })
        .order("id")
        .range(a, b),
    ),
    readAll((a, b) =>
      client
        .from("household_members")
        .select("*")
        .eq("household_id", hid)
        .order("user_id")
        .range(a, b),
    ),
    readAll((a, b) => client.from("profiles").select("*").order("id").range(a, b)),
    readAll((a, b) =>
      client
        .from("household_invitations")
        .select("id,household_id,created_by,expires_at,revoked_at,used_by,used_at,created_at")
        .eq("household_id", hid)
        .order("created_at", { ascending: false })
        .order("id")
        .range(a, b),
    ),
  ]);
  const error = [
    household,
    products,
    availability,
    entries,
    purchases,
    lines,
    members,
    profiles,
    invitations,
  ].find((r) => r.error)?.error;
  if (error)
    throw new Error(
      "We couldn’t load your household. Please retry. If this continues, check the Supabase migration and connection.",
    );
  return {
    household: household.data!,
    profile,
    role: membership.role as Snapshot["role"],
    products: products.data!,
    availability: availability.data!,
    entries: entries.data!,
    purchases: purchases.data!,
    lines: lines.data!,
    members: members.data!.map((m) => ({
      ...m,
      name: profiles.data!.find((p) => p.id === m.user_id)?.name ?? "Family member",
    })),
    invitations: invitations.data!,
  };
});
