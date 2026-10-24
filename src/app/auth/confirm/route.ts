import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverClient } from "@/lib/supabase/server";
import { isConfigured, siteUrl } from "@/lib/supabase/config";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next");
  if (token_hash && ["signup", "recovery", "email"].includes(type ?? "") && isConfigured) {
    const client = await serverClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type: type as EmailOtpType });
    if (!error)
      return NextResponse.redirect(
        `${siteUrl()}${type === "recovery" ? "/reset-password" : next && /^\/onboarding\?token=[a-f0-9]{64}$/.test(next) ? next : "/dashboard"}`,
      );
  }
  return NextResponse.redirect(`${siteUrl()}/login?error=confirmation`);
}
