import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { siteUrl, isConfigured } from "@/lib/supabase/config";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const target = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next =
    target === "/reset-password" ||
    target === "/dashboard" ||
    /^\/onboarding\?token=[a-f0-9]{64}$/.test(target)
      ? target
      : "/dashboard";
  if (code && isConfigured) {
    const client = await serverClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${siteUrl()}${next}`);
  }
  return NextResponse.redirect(`${siteUrl()}/auth/confirm?error=expired`);
}
