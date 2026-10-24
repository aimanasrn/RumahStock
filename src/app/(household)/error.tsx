"use client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CircleAlert } from "lucide-react";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="error-page">
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Your household couldn’t be loaded</AlertTitle>
        <AlertDescription>
          Check your connection and try again. If you have just connected Supabase, make sure the
          migration has been applied.
        </AlertDescription>
      </Alert>
      <Button onClick={reset}>Try again</Button>
      <Button variant="outline" asChild>
        <a href="/login">Back to sign in</a>
      </Button>
    </div>
  );
}
