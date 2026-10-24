"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { House, Link2, LoaderCircle, LogOut } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mutate } from "./actions";
import { logout } from "./auth/actions";
const nameSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").max(100),
});
export function Onboarding({ name, token }: { name: string; token?: string }) {
  const [invite, setInvite] = useState(token ?? ""),
    [error, setError] = useState(""),
    [pending, start] = useTransition();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" },
  });
  async function create(payload: z.infer<typeof nameSchema>) {
    start(async () => {
      setError("");
      const result = await mutate({ action: "create_household", payload });
      if (result.ok) {
        router.replace("/dashboard");
        router.refresh();
      } else setError(result.error);
    });
  }
  async function join() {
    setError("");
    const value = invite.match(/[a-f0-9]{64}/)?.[0];
    if (!value) {
      setError("Paste the full invitation link or its 64-character token.");
      return;
    }
    start(async () => {
      const result = await mutate({ action: "join_household", payload: { token: value } });
      if (result.ok) {
        router.replace("/dashboard");
        router.refresh();
      } else setError(result.error);
    });
  }
  return (
    <main id="main-content" className="onboarding-layout">
      <Brand />
      <div className="onboarding-intro">
        <h1>Let’s make this feel like home, {name.split(" ")[0]}.</h1>
        <p>Create a household or join your family with an invitation.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>A place for your people</CardTitle>
          <CardDescription>For now, each account can belong to one household.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={token ? "join" : "create"}>
            <TabsList className="w-full">
              <TabsTrigger value="create">
                <House />
                Create a household
              </TabsTrigger>
              <TabsTrigger value="join">
                <Link2 />
                Join a household
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create">
              <form className="mt-6" onSubmit={handleSubmit(create)}>
                <FieldGroup>
                  <Field data-invalid={!!errors.name}>
                    <FieldLabel htmlFor="new-household">Household name</FieldLabel>
                    <Input
                      id="new-household"
                      placeholder="e.g. The Rahman home"
                      {...register("name")}
                      aria-invalid={!!errors.name}
                    />
                    <FieldError errors={[errors.name]} />
                  </Field>
                  <Button disabled={pending} type="submit">
                    {pending ? <LoaderCircle className="animate-spin" /> : <House />}Create our
                    household
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>
            <TabsContent value="join">
              <FieldGroup className="mt-6">
                <Field>
                  <FieldLabel htmlFor="join-invitation">Invitation link or token</FieldLabel>
                  <Input
                    id="join-invitation"
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                    placeholder="Paste the link from your household owner"
                  />
                </Field>
                <Button disabled={pending} onClick={() => void join()}>
                  {pending ? <LoaderCircle className="animate-spin" /> : <Link2 />}Join household
                </Button>
              </FieldGroup>
            </TabsContent>
          </Tabs>
          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Button variant="ghost" onClick={() => void logout()}>
        <LogOut />
        Log out
      </Button>
    </main>
  );
}
