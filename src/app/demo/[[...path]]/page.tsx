import { notFound } from "next/navigation";
import { HouseholdProvider } from "@/components/household-provider";
import { AppShell } from "@/components/app-shell";
import { demoSnapshot } from "@/lib/demo";
import { Dashboard } from "@/features/dashboard";
import { ItemsPage, ItemDetail } from "@/features/items";
import { ShoppingPage } from "@/features/shopping";
import { PurchasesPage } from "@/features/purchases";
import { HouseholdPage, SettingsPage } from "@/features/household";
import { ScanPage } from "@/features/scan";
export default async function DemoPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const key = path[0] ?? "dashboard";
  const screens: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    items: path[1] ? <ItemDetail id={path[1]} /> : <ItemsPage />,
    "shopping-list": <ShoppingPage />,
    scan: <ScanPage />,
    purchases: <PurchasesPage />,
    household: <HouseholdPage />,
    settings: <SettingsPage />,
  };
  if (!screens[key] || path.length > 2 || (path.length === 2 && key !== "items")) notFound();
  return (
    <HouseholdProvider initial={demoSnapshot()} demo>
      <AppShell>{screens[key]}</AppShell>
    </HouseholdProvider>
  );
}
