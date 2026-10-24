"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  House,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  ScanBarcode,
  Settings,
  ShoppingCart,
  Sun,
  Users,
  History,
  Sprout,
} from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { useHousehold } from "./household-provider";
import { logout } from "@/features/auth/actions";
import { labels } from "@/lib/labels";
import { cn } from "@/lib/utils";
const mainNav = [
  { path: "/dashboard", label: labels.dashboard, icon: LayoutDashboard },
  { path: "/items", label: labels.items, icon: Package },
  { path: "/shopping-list", label: labels.shopping, icon: ShoppingCart },
  { path: "/scan", label: labels.scan, icon: ScanBarcode },
  { path: "/purchases", label: labels.purchases, icon: History },
];
const extraNav = [
  { path: "/household", label: labels.household, icon: Users },
  { path: "/settings", label: labels.settings, icon: Settings },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, demo, connected, href } = useHousehold();
  const path = usePathname(),
    { resolvedTheme, setTheme } = useTheme();
  const active = (p: string) => (p === "/dashboard" ? path === href(p) : path.startsWith(href(p)));
  const title = [...mainNav, ...extraNav].find((n) => active(n.path))?.label ?? "Item details";
  const count = data.entries.filter((e) => e.status === "pending").length;
  const initials = data.profile.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
  function navigation(items: { path: string; label: string; icon: typeof House }[]) {
    return items.map((n) => (
      <Link
        key={n.path}
        href={href(n.path)}
        className={cn("nav-item", active(n.path) && "is-active")}
        aria-current={active(n.path) ? "page" : undefined}
      >
        <n.icon aria-hidden="true" />
        <span>{n.label}</span>
        {n.path === "/shopping-list" && count > 0 ? (
          <span className="nav-count">{count}</span>
        ) : null}
      </Link>
    ));
  }
  return (
    <TooltipProvider>
      <div className="app-shell">
        <aside className="desktop-sidebar">
          <Link href={href("/dashboard")} aria-label="RumahStock overview">
            <Brand />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="household-switch">
                <House />
                <span>{data.household.name}</span>
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Your household</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href={href("/household")}>
                    <Users />
                    {data.household.name}
                    <Check />
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <nav aria-label="Main navigation" className="primary-nav">
            {navigation(mainNav)}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <span className="note-leaf">
                <Sprout aria-hidden="true" />
              </span>
              <strong>A home, in harmony.</strong>
              <p>
                Small check-ins.
                <br />
                One less thing to remember.
              </p>
            </div>
            <nav aria-label="Household navigation">{navigation(extraNav)}</nav>
            <Separator />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="profile-trigger">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span>
                    <strong>{data.profile.name}</strong>
                    <small>{data.role === "owner" ? "Household owner" : "Household member"}</small>
                  </span>
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{data.profile.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href={href("/settings")}>
                      <Settings />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void logout()}>
                    <LogOut />
                    {demo ? "Leave preview" : "Log out"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
        <div className="main-shell">
          <header className="app-header">
            <div className="desktop-breadcrumb">
              <House aria-hidden="true" />
              <span>Home</span>
              <ChevronRight />
              <strong>{title}</strong>
            </div>
            <Link className="mobile-brand" href={href("/dashboard")}>
              <Brand />
            </Link>
            <div className="header-actions">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle color theme"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  >
                    <Sun className="theme-sun" />
                    <Moon className="theme-moon" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle color theme</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" />
              <Link href={href("/household")} className="header-household">
                <span className="member-stack">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>{data.members[1]?.name[0] ?? "+"}</AvatarFallback>
                  </Avatar>
                </span>
                <span>{data.members.length} members</span>
              </Link>
            </div>
          </header>
          {demo ? (
            <div className="demo-banner">
              <Badge variant="secondary">Interactive preview</Badge>
              <span>Sample household · Changes stay in this browser.</span>
              <Link href="/login">
                Use your own household <ArrowUpRight />
              </Link>
            </div>
          ) : null}
          <main id="main-content" className="main-content">
            {children}
          </main>
          <footer className="app-footer">
            <span>
              <House /> A little more peace of mind.
            </span>
            <span>
              {demo
                ? "Sample data"
                : connected
                  ? "Your household is up to date"
                  : "Reconnecting · refreshing when online"}
              <span className={cn("connection-dot", (connected || demo) && "connected")} />
            </span>
          </footer>
        </div>
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {[mainNav[0], mainNav[1], mainNav[3], mainNav[2], extraNav[0]].map((n) => (
            <Link
              key={n.path}
              href={href(n.path)}
              className={cn(
                "mobile-nav-item",
                active(n.path) && "is-active",
                n.path === "/scan" && "scan-nav",
              )}
              aria-current={active(n.path) ? "page" : undefined}
            >
              <span>
                <n.icon />
              </span>
              <small>
                {n.path === "/dashboard"
                  ? "Home"
                  : n.path === "/items"
                    ? "Items"
                    : n.path === "/shopping-list"
                      ? "Shop"
                      : n.path === "/scan"
                        ? "Scan"
                        : "Household"}
              </small>
            </Link>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
}
