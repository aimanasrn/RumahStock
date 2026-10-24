"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="error-page">
      <h1>A little hiccup.</h1>
      <p>We couldn’t load this page. Check your connection and try again.</p>
      <Button onClick={reset}>Try again</Button>
      <Button variant="outline" asChild>
        <a href="/login">Back to log in</a>
      </Button>
    </main>
  );
}
