import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase/config";
export async function GET(request: NextRequest) {
  if (!isConfigured) return new NextResponse(null, { status: 503 });
  const client = await serverClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const path = request.nextUrl.searchParams.get("path") ?? "";
  const { data } = await client
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();
  if (!data || !path.startsWith(`${data.household_id}/`) || path.includes(".."))
    return new NextResponse(null, { status: 403 });
  const result = await client.storage.from("product-images").download(path);
  if (result.error) return new NextResponse(null, { status: 404 });
  return new NextResponse(result.data, {
    headers: {
      "Content-Type": result.data.type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
