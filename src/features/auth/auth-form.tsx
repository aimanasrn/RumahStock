"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { authAction } from "./actions";
export type AuthKind = "login" | "register" | "forgot-password" | "reset-password";
const copy = {
  login: {
    title: "Welcome home.",
    description: "A little less to remember. A little more peace of mind.",
    button: "Log in",
  },
  register: {
    title: "A happier home starts here.",
    description: "Make room for the things that matter.",
    button: "Create account",
  },
  "forgot-password": {
    title: "Let’s get you back home.",
    description: "We’ll email you a link to reset your password.",
    button: "Send reset link",
  },
  "reset-password": {
    title: "A fresh start.",
    description: "Choose a new password for your RumahStock account.",
    button: "Save new password",
  },
};
export function AuthForm({
  kind,
  configured,
  next,
  notice,
}: {
  kind: AuthKind;
  configured: boolean;
  next?: string;
  notice?: string;
}) {
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const registration = kind === "register",
    reset = kind === "reset-password",
    forgot = kind === "forgot-password";
  const schema = z
    .object({
      email: reset ? z.string().optional() : z.email("Enter a valid email address"),
      name: registration
        ? z.string().trim().min(1, "Enter your name").max(100)
        : z.string().optional(),
      password: forgot
        ? z.string().optional()
        : z.string().min(8, "Use at least 8 characters").max(128),
      confirm:
        registration || reset ? z.string().min(1, "Confirm your password") : z.string().optional(),
    })
    .refine((v) => !(registration || reset) || v.password === v.confirm, {
      path: ["confirm"],
      message: "Passwords do not match",
    });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "", password: "", confirm: "" },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="auth-story-icon">⌂</span>
          <h1>
            A home,
            <br />
            in harmony.
          </h1>
          <p>
            From the last splash of milk to the next family shop. Keep the little things in order,
            together.
          </p>
          <div className="auth-benefits">
            <span>
              <CheckCircle2 />
              Know what’s at home
            </span>
            <span>
              <CheckCircle2 />
              Share the next shopping trip
            </span>
            <span>
              <CheckCircle2 />
              Remember what you paid
            </span>
          </div>
        </div>
        <small>Made for the everyday. Made for your family.</small>
      </aside>
      <main id="main-content" className="auth-main">
        <div className="mobile-auth-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <h2>{copy[kind].title}</h2>
          <p>{copy[kind].description}</p>
          {!configured ? (
            <Alert>
              <AlertTitle>Connect your Supabase project</AlertTitle>
              <AlertDescription>
                Authentication is waiting for your project configuration. Follow README.md, or
                explore the sample household below.
              </AlertDescription>
            </Alert>
          ) : null}
          {notice ? (
            <Alert>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          {message ? (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Check your inbox</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : (
            <form
              onSubmit={form.handleSubmit(async (values) => {
                setError("");
                try {
                  const result = await authAction({ ...values, kind, next });
                  if (result.error) setError(result.error);
                  if (result.message) setMessage(result.message);
                } catch (e) {
                  if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
                  setError("We couldn’t connect. Please try again.");
                }
              })}
            >
              <FieldGroup>
                {registration ? (
                  <Field data-invalid={!!errors.name}>
                    <FieldLabel htmlFor="auth-name">Your name</FieldLabel>
                    <Input
                      id="auth-name"
                      autoComplete="name"
                      placeholder="e.g. Aina Rahman"
                      {...register("name")}
                      aria-invalid={!!errors.name}
                    />
                    <FieldError errors={[errors.name]} />
                  </Field>
                ) : null}
                {!reset ? (
                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="auth-email">Email address</FieldLabel>
                    <Input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...register("email")}
                      aria-invalid={!!errors.email}
                    />
                    <FieldError errors={[errors.email]} />
                  </Field>
                ) : null}
                {!forgot ? (
                  <Field data-invalid={!!errors.password}>
                    <div className="field-label-row">
                      <FieldLabel htmlFor="auth-password">
                        {reset ? "New password" : "Password"}
                      </FieldLabel>
                      {kind === "login" ? (
                        <Link href="/forgot-password">Forgot password?</Link>
                      ) : null}
                    </div>
                    <Input
                      id="auth-password"
                      type="password"
                      autoComplete={kind === "login" ? "current-password" : "new-password"}
                      {...register("password")}
                      aria-invalid={!!errors.password}
                    />
                    <FieldError errors={[errors.password]} />
                    {registration ? (
                      <FieldDescription>At least 8 characters.</FieldDescription>
                    ) : null}
                  </Field>
                ) : null}
                {registration || reset ? (
                  <Field data-invalid={!!errors.confirm}>
                    <FieldLabel htmlFor="auth-confirm">Confirm password</FieldLabel>
                    <Input
                      id="auth-confirm"
                      type="password"
                      autoComplete="new-password"
                      {...register("confirm")}
                      aria-invalid={!!errors.confirm}
                    />
                    <FieldError errors={[errors.confirm]} />
                  </Field>
                ) : null}
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" disabled={isSubmitting || !configured}>
                  {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
                  {copy[kind].button}
                  <ArrowRight />
                </Button>
              </FieldGroup>
            </form>
          )}
          <p className="auth-switch">
            {registration ? (
              <>
                Already at home here? <Link href={`/login${nextQuery}`}>Log in</Link>
              </>
            ) : kind === "login" ? (
              <>
                New to RumahStock? <Link href={`/register${nextQuery}`}>Create an account</Link>
              </>
            ) : (
              <Link href={`/login${nextQuery}`}>Back to log in</Link>
            )}
          </p>
          <div className="auth-demo">
            <Link href="/demo">
              Take a little look around <ArrowRight />
            </Link>
            <small>Explore an interactive sample household.</small>
          </div>
        </div>
        <small className="auth-footnote">
          Your household. Your people. A little more organised.
        </small>
      </main>
    </div>
  );
}
