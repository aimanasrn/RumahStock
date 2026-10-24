import { getSnapshot } from "@/lib/data";
import { HouseholdProvider } from "@/components/household-provider";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default async function HouseholdLayout({ children }: { children: React.ReactNode }) {
  const data = await getSnapshot();
  return (
    <HouseholdProvider initial={data}>
      <AppShell>{children}</AppShell>
    </HouseholdProvider>
  );
}
