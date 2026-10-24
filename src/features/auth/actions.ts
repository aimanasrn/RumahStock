"use server";
import { authSchema } from "@/lib/auth-validation";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { isConfigured, siteUrl } from "@/lib/supabase/config";
export async function authAction(input: unknown): Promise<{ error?: string; message?: string }> {
  const result = authSchema.safeParse(input);
  if (!result.success) return { error: result.error.issues[0]?.message };
  if (!isConfigured)
    return { error: "Supabase is not configured. Follow the README to connect your project." };
  const v = result.data;
  const client = await serverClient();
  const next = "next" in v && v.next ? v.next : "/dashboard";
  if (v.kind === "login") {
    if (!v.email || !v.password) return { error: "Enter your email and password." };
    const { error } = await client.auth.signInWithPassword({
      email: v.email,
      password: v.password,
    });
    if (error)
      return {
        error: "We couldn’t sign you in. Check your email, password, and email confirmation.",
      };
    redirect(next);
  }
  if (v.kind === "register") {
    if (!v.email || !v.name || !v.password || v.password !== v.confirm)
      return { error: "Complete all fields and make sure the passwords match." };
    const { data, error } = await client.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        data: { name: v.name },
        emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) return { error: error.message };
    if (data.session) redirect(next);
    return { message: "Check your email to confirm your account, then sign in." };
  }
  if (v.kind === "forgot-password") {
    if (!v.email) return { error: "Enter your email address." };
    const { error } = await client.auth.resetPasswordForEmail(v.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
    });
    if (error) return { error: "The reset email could not be sent. Please try again shortly." };
    return {
      message: "If an account exists for this email, you’ll receive a password reset link.",
    };
  }
  if (!v.password || v.password !== v.confirm)
    return { error: "Passwords must match and contain at least 8 characters." };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "This reset link has expired. Request another reset email." };
  const { error } = await client.auth.updateUser({ password: v.password });
  if (error) return { error: error.message };
  await client.auth.signOut();
  redirect("/login?reset=success");
}
export async function logout() {
  if (isConfigured) {
    const client = await serverClient();
    await client.auth.signOut();
  }
  redirect("/login");
}
