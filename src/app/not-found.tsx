import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main id="main-content" className="onboarding-layout">
      <Brand />
      <h1>This page isn’t at home here.</h1>
      <p>Let’s take you back to your household.</p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
