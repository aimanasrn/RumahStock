"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Copy,
  House,
  Link2,
  LoaderCircle,
  LogOut,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/common";
import { useHousehold } from "@/components/household-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { localDate } from "@/lib/domain";
import { logout } from "./auth/actions";
function NameForm({ household = false }: { household?: boolean }) {
  const { data, run } = useHousehold();
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(household ? 2 : 1, "Enter a name")
      .max(100),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: household ? data.household.name : data.profile.name },
  });
  return (
    <form
      onSubmit={handleSubmit(async (payload) => {
        await run({ action: household ? "rename_household" : "update_profile", payload });
      })}
    >
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor={household ? "household-name" : "profile-name"}>
            {household ? "Household name" : "Your name"}
          </FieldLabel>
          <Input
            id={household ? "household-name" : "profile-name"}
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <Button className="self-start" disabled={isSubmitting} type="submit">
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}Save changes
        </Button>
      </FieldGroup>
    </form>
  );
}
export function HouseholdPage() {
  const { data, run, demo } = useHousehold();
  const [link, setLink] = useState(""),
    [busy, start] = useTransition();
  const owner = data.role === "owner";
  return (
    <div className="page-stack">
      <PageHeading
        title="A home is a team effort."
        description="Your people. Your essentials. All in one place."
      >
        <Badge variant="secondary">
          <House />
          {data.household.name}
        </Badge>
      </PageHeading>
      <div className="settings-grid">
        <div className="page-stack">
          <Card>
            <CardHeader>
              <CardTitle>Your household</CardTitle>
              <CardDescription>
                {owner
                  ? "A little name that feels like home."
                  : "Household settings are managed by your owner."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {owner ? <NameForm household /> : <p>{data.household.name}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>People at home</CardTitle>
              <CardDescription>
                {data.members.length} members sharing the little things.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="members-list">
                {data.members.map((m) => (
                  <div className="member-row" key={m.user_id}>
                    <Avatar>
                      <AvatarFallback>
                        {m.name
                          .split(" ")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <strong>
                        {m.name}
                        {m.user_id === data.profile.id ? " (you)" : ""}
                      </strong>
                      <small>Joined {localDate(m.joined_at)}</small>
                    </div>
                    <Badge variant="outline">{m.role === "owner" ? "Owner" : "Member"}</Badge>
                    {owner && m.role === "member" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Remove ${m.name}`}>
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {m.name} from your household?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              They will lose access to your household. Their recorded purchases will
                              remain.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep member</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                start(async () => {
                                  await run({
                                    action: "remove_member",
                                    payload: { user_id: m.user_id },
                                  });
                                })
                              }
                            >
                              Remove member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="page-stack">
          <Card>
            <CardHeader>
              <Link2 />
              <CardTitle>Make room for family</CardTitle>
              <CardDescription>
                {owner
                  ? "Invite someone to share your household."
                  : "Ask your household owner for an invitation link."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {owner ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Invitation links expire after 7 days, work once, and can be revoked.
                  </p>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      start(async () => {
                        const result = await run({ action: "create_invitation", payload: {} });
                        if (
                          result.ok &&
                          result.data &&
                          typeof result.data === "object" &&
                          "token" in result.data
                        )
                          setLink(
                            `${window.location.origin}/onboarding?token=${String(result.data.token)}`,
                          );
                      })
                    }
                  >
                    {busy ? <LoaderCircle className="animate-spin" /> : <Plus />}Create invitation
                  </Button>
                  {link ? (
                    <Field>
                      <FieldLabel htmlFor="invite-link">Share this invitation</FieldLabel>
                      <Input id="invite-link" readOnly value={link} />
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(link);
                            toast.success("Invitation copied");
                          } catch {
                            toast.error("Select and copy the link above.");
                          }
                        }}
                      >
                        <Copy />
                        Copy link
                      </Button>
                    </Field>
                  ) : null}
                  {data.invitations.map((i) => {
                    const state = i.revoked_at
                      ? "Revoked"
                      : i.used_at
                        ? "Used"
                        : new Date(i.expires_at) < new Date()
                          ? "Expired"
                          : "Active";
                    return (
                      <div className="invitation-row" key={i.id}>
                        <div>
                          <strong>{state} invitation</strong>
                          <small>Expires {localDate(i.expires_at)}</small>
                        </div>
                        {state === "Active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              start(async () => {
                                await run({ action: "revoke_invitation", payload: { id: i.id } });
                              })
                            }
                          >
                            Revoke
                          </Button>
                        ) : (
                          <Badge variant="outline">{state}</Badge>
                        )}
                      </div>
                    );
                  })}
                  {demo ? (
                    <Alert>
                      <AlertDescription>
                        Secure invitations need a connected Supabase household. Sample members are
                        for preview only.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Only owners can invite or remove members.
                </p>
              )}
            </CardContent>
          </Card>
          <div className="household-tip">
            <ShieldCheck />
            <strong>A little privacy, by design.</strong>
            <p>
              Only members of your household can access your items, shopping list, and purchase
              history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export function SettingsPage() {
  const { demo, resetDemo } = useHousehold();
  const { theme, setTheme } = useTheme();
  return (
    <div className="page-stack">
      <PageHeading title="Make yourself at home." description="A few preferences, just for you." />
      <div className="settings-grid">
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>The name your household sees.</CardDescription>
          </CardHeader>
          <CardContent>
            <NameForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>A comfortable view</CardTitle>
            <CardDescription>Set the mood for your everyday check-in.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="theme">Color theme</FieldLabel>
                <NativeSelect
                  id="theme"
                  value={theme ?? "light"}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <NativeSelectOption value="light">Light</NativeSelectOption>
                  <NativeSelectOption value="dark">Dark</NativeSelectOption>
                  <NativeSelectOption value="system">Match your device</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel>Language and region</FieldLabel>
                <p className="text-sm text-muted-foreground">
                  English · Malaysian Ringgit (MYR)
                  <br />
                  Dates in Asia/Kuala_Lumpur
                </p>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Keep your account comfortable and secure.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href="/forgot-password">
                  <Mail />
                  Reset password
                </Link>
              </Button>
              <Button variant="outline" onClick={() => void logout()}>
                <LogOut />
                {demo ? "Leave preview" : "Log out"}
              </Button>
            </div>
          </CardContent>
        </Card>
        {demo ? (
          <Card>
            <CardHeader>
              <CardTitle>Your sample household</CardTitle>
              <CardDescription>Try things out. You can always start fresh.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={resetDemo}>
                Reset sample data
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
