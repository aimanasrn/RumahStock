import { AuthForm } from "@/features/auth/auth-form";
import { isConfigured } from "@/lib/supabase/config";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const next =
    params.next?.startsWith("/onboarding?token=") && /^[a-f0-9]{64}$/.test(params.next.slice(18))
      ? params.next
      : undefined;
  const notice =
    params.error === "confirmation"
      ? "This confirmation link is invalid or expired. Try signing in or request a new reset email."
      : params.reset === "success"
        ? "Your password was updated. You can log in now."
        : undefined;
  return <AuthForm kind="reset-password" configured={isConfigured} next={next} notice={notice} />;
}
