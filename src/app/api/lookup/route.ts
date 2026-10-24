import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { isConfigured, siteUrl } from "@/lib/supabase/config";
export async function GET(request: NextRequest) {
  if (!isConfigured)
    return NextResponse.json(
      { error: "Connect Supabase to use external product lookup." },
      { status: 503 },
    );
  const barcode = request.nextUrl.searchParams.get("barcode") ?? "";
  if (!/^\d{4,32}$/.test(barcode))
    return NextResponse.json({ error: "Enter a valid numeric barcode." }, { status: 400 });
  const client = await serverClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { data: member } = await client
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();
  if (!member) return NextResponse.json({ error: "Join a household first." }, { status: 403 });
  const { data: saved, error } = await client
    .from("products")
    .select("id,archived_at")
    .eq("household_id", member.household_id)
    .eq("barcode", barcode)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Your catalog couldn’t be searched. Please retry or create manually." },
      { status: 503 },
    );
  if (saved)
    return NextResponse.json(
      { savedId: saved.id, archived: !!saved.archived_at },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,quantity`,
      {
        headers: { "User-Agent": `RumahStock/0.1 (${siteUrl()})` },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("provider");
    const parsed = z
      .object({
        status: z.number(),
        product: z
          .object({
            product_name: z.string().optional(),
            brands: z.string().optional(),
            quantity: z.string().optional(),
          })
          .optional(),
      })
      .safeParse(await response.json());
    if (!parsed.success || parsed.data.status !== 1 || !parsed.data.product)
      return NextResponse.json({ found: false });
    const product = parsed.data.product;
    return NextResponse.json(
      {
        found: true,
        product: {
          barcode,
          name: (product.product_name ?? "").slice(0, 160),
          brand: (product.brands ?? "").slice(0, 100),
          package_size: (product.quantity ?? "").slice(0, 80),
          category: "Food and pantry",
          source: "external",
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Open Food Facts is unavailable right now. You can still create the item manually.",
      },
      { status: 502 },
    );
  }
}
