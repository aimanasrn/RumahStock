"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  CircleAlert,
  Package,
  ScanBarcode,
  ShoppingCart,
  TriangleAlert,
  Wallet,
  Check,
  Leaf,
} from "lucide-react";
import { useHousehold } from "@/components/household-provider";
import { EmptyState, PageHeading, ProductIcon, StatusBadge, ViewLink } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { estimate, localDate, money, monthlySpend } from "@/lib/domain";
import { ProductDialog } from "./product-dialog";
import { ListDialog } from "./list-dialog";
import { PurchaseDialog } from "./purchase-dialog";
import { PurchaseTable } from "./purchases";
export function Dashboard() {
  const { data, href } = useHousehold();
  const [filter, setFilter] = useState("all");
  const products = data.products.filter((p) => !p.archived_at),
    pending = data.entries.filter((e) => e.status === "pending");
  const statusMap = new Map(data.availability.map((a) => [a.product_id, a.status]));
  const low = products.filter((p) => statusMap.get(p.id) === "low"),
    out = products.filter((p) => statusMap.get(p.id) === "out");
  const attention = products.filter((p) =>
    filter === "all"
      ? ["low", "out"].includes(statusMap.get(p.id) ?? "")
      : statusMap.get(p.id) === filter,
  );
  const priced = estimate(data.entries, products, data.lines, data.purchases);
  const stats = [
    {
      label: "Household items",
      value: String(products.length),
      hint: "everyday essentials",
      icon: Package,
      tone: "sage",
      to: "/items",
    },
    {
      label: "Running low",
      value: String(low.length),
      hint: "need a little top-up",
      icon: CircleAlert,
      tone: "amber",
      to: "/items?status=low",
    },
    {
      label: "Out of stock",
      value: String(out.length),
      hint: "ready to restock",
      icon: TriangleAlert,
      tone: "rose",
      to: "/items?status=out",
    },
    {
      label: "Shopping estimate",
      value: money(priced.subtotal),
      hint: `${priced.missing} ${priced.missing === 1 ? "item" : "items"} without a price`,
      icon: ShoppingCart,
      tone: "sage",
      to: "/shopping-list",
    },
  ];
  return (
    <div className="page-stack">
      <PageHeading
        title="A happy home starts here."
        description="A little overview of what your household needs."
      >
        <span className="heading-date">
          <CalendarDays />
          {localDate(new Date(), { weekday: "short" })}
        </span>
      </PageHeading>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <h2>Less guessing. More living.</h2>
          <p>Keep the essentials stocked and your family on the same page.</p>
          <div className="welcome-actions">
            <Button asChild>
              <Link href={href("/scan")}>
                <ScanBarcode />
                Scan a barcode
              </Link>
            </Button>
            <ProductDialog>
              <Button variant="outline">
                <span aria-hidden="true">+</span> Add an item
              </Button>
            </ProductDialog>
          </div>
        </div>
        <Image
          src="/grocery-bag.png"
          width={360}
          height={240}
          priority
          alt="A grocery bag with milk, eggs, and leafy greens"
          className="grocery-illustration"
        />
      </section>
      <section className="stats-grid" aria-label="Household at a glance">
        {stats.map((s) => (
          <Link key={s.label} href={href(s.to)}>
            <Card className="stat-card">
              <CardContent>
                <span className={`stat-icon tone-${s.tone}`}>
                  <s.icon />
                </span>
                <div>
                  <p>{s.label}</p>
                  <strong>{s.value}</strong>
                  <small>{s.hint}</small>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
      <div className="dashboard-grid">
        <Card className="attention-card">
          <CardHeader>
            <div className="section-title-row">
              <CardTitle>Needs a little attention</CardTitle>
              <Badge variant="secondary">{low.length + out.length} items</Badge>
            </div>
            <CardDescription>A quick check now, one less surprise later.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All ({low.length + out.length})</TabsTrigger>
                <TabsTrigger value="low">Running low ({low.length})</TabsTrigger>
                <TabsTrigger value="out">Out of stock ({out.length})</TabsTrigger>
              </TabsList>
            </Tabs>
            {attention.length ? (
              <div className="attention-list">
                {attention.slice(0, 4).map((p) => (
                  <div className="attention-row" key={p.id}>
                    <Link href={href(`/items/${p.id}`)} className="product-identity">
                      <ProductIcon product={p} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.package_size || p.category}</small>
                      </span>
                    </Link>
                    <StatusBadge status={statusMap.get(p.id) ?? "enough"} />
                    <ListDialog product={p}>
                      <Button variant="outline" size="sm">
                        <ShoppingCart />
                        <span>
                          {pending.some((e) => e.product_id === p.id)
                            ? "On the list"
                            : "Add to list"}
                        </span>
                      </Button>
                    </ListDialog>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="All stocked up. Lovely!"
                description="Nothing running low or out of stock. Keep checking in as your family uses things."
                icon={Leaf}
              />
            )}
            <div className="panel-footer">
              <span>
                {attention.length > 4
                  ? `Showing 4 of ${attention.length} items`
                  : "A little care goes a long way."}
              </span>
              <ViewLink to="/items">All household items</ViewLink>
            </div>
          </CardContent>
        </Card>
        <div className="dashboard-side">
          <Card>
            <CardHeader>
              <div className="section-title-row">
                <CardTitle>Your shopping list</CardTitle>
                <ViewLink to="/shopping-list">View list</ViewLink>
              </div>
              <CardDescription>
                {pending.length} {pending.length === 1 ? "item" : "items"} to bring home.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pending.length ? (
                <div className="shopping-preview">
                  {pending.slice(0, 3).map((e) => {
                    const product = products.find((p) => p.id === e.product_id);
                    return product ? (
                      <div key={e.id} className="shopping-preview-row">
                        <PurchaseDialog product={product} entry={e}>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Record purchase of ${product.name}`}
                            className="purchase-check"
                          >
                            <Check />
                          </Button>
                        </PurchaseDialog>
                        <div>
                          <strong>{product.name}</strong>
                          <small>
                            {e.quantity} {e.purchase_unit} · {product.package_size}
                          </small>
                        </div>
                        {e.priority === "urgent" ? (
                          <span className="urgent-dot" title="Urgent" />
                        ) : null}
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <EmptyState
                  title="A fresh list"
                  description="Add an essential when it’s time to restock."
                  icon={ShoppingCart}
                />
              )}
            </CardContent>
          </Card>
          <Card className="month-card">
            <CardContent>
              <span className="month-icon">
                <Wallet />
              </span>
              <div>
                <p>This month</p>
                <small>Actual recorded spending</small>
                <strong>{money(monthlySpend(data.lines, data.purchases))}</strong>
              </div>
              <ViewLink to="/purchases">
                <span className="sr-only">View spending</span>
              </ViewLink>
            </CardContent>
          </Card>
          <p className="price-note">
            Estimates use your last recorded prices. A little guide for your next shop.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="section-title-row">
            <div>
              <CardTitle>Recent purchases</CardTitle>
              <CardDescription>Your latest household top-ups, all in one place.</CardDescription>
            </div>
            <ViewLink to="/purchases">
              View all <span className="sr-only">purchases</span>
            </ViewLink>
          </div>
        </CardHeader>
        <CardContent>
          <PurchaseTable limit={4} />
        </CardContent>
      </Card>
    </div>
  );
}
