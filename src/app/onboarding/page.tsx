import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase/config";
import { getMembership } from "@/lib/data";
import { Onboarding } from "@/features/onboarding";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token && /^[a-f0-9]{64}$/.test(params.token) ? params.token : undefined;
  if (!isConfigured)
    redirect(
      `/login?setup=required${token ? `&next=${encodeURIComponent(`/onboarding?token=${token}`)}` : ""}`,
    );
  const client = await serverClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    redirect(`/login${token ? `?next=${encodeURIComponent(`/onboarding?token=${token}`)}` : ""}`);
  const { profile, membership } = await getMembership();
  if (membership) redirect("/dashboard");
  return <Onboarding name={profile.name} token={token} />;
}
