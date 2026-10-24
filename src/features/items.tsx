"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Check,
  MoreHorizontal,
  Pencil,
  ScanBarcode,
  Search,
  ShoppingCart,
  Receipt,
} from "lucide-react";
import { useHousehold } from "@/components/household-provider";
import { EmptyState, PageHeading, ProductIcon, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categories, statuses, labels } from "@/lib/labels";
import { latestPrice, localDate, money, type Product } from "@/lib/domain";
import { ProductDialog } from "./product-dialog";
import { ListDialog } from "./list-dialog";
import { PurchaseDialog } from "./purchase-dialog";
import { PurchaseTable } from "./purchases";
export function AvailabilityMenu({ product }: { product: Product }) {
  const { data, run } = useHousehold();
  const [pending, start] = useTransition();
  const current = data.availability.find((a) => a.product_id === product.id)?.status ?? "enough";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={`Change availability for ${product.name}`}
        >
          <StatusBadge status={current} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Set availability</DropdownMenuLabel>
        <DropdownMenuGroup>
          {statuses.map((s) => (
            <DropdownMenuItem
              key={s}
              onSelect={() =>
                start(async () => {
                  await run({
                    action: "set_status",
                    payload: { product_id: product.id, status: s },
                  });
                })
              }
            >
              {labels[s]}
              {s === current ? <Check /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function ArchiveAction({ product }: { product: Product }) {
  const { run } = useHousehold();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Archive />
          Archive item
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {product.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This hides the item from your essentials. Its purchase history will stay available.
            Remove any pending shopping entry first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep item</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              start(async () => {
                await run({ action: "archive_product", payload: { product_id: product.id } });
              })
            }
          >
            Archive item
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function ItemsPage() {
  const { data, href } = useHousehold();
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get("status") ?? "all";
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [filter, setFilter] = useState(
      ["all", "low", "out", "archived"].includes(requestedStatus) ? requestedStatus : "all",
    ),
    [page, setPage] = useState(1);
  const items = data.products.filter(
    (p) =>
      (filter === "archived" ? !!p.archived_at : !p.archived_at) &&
      `${p.name} ${p.brand} ${p.barcode ?? ""}`.toLowerCase().includes(query.toLowerCase()) &&
      (category === "all" || p.category === category) &&
      (!["low", "out", "enough"].includes(filter) ||
        data.availability.find((a) => a.product_id === p.id)?.status === filter),
  );
  return (
    <div className="page-stack">
      <PageHeading
        title="The little things that keep home going."
        description="Your household essentials, without the guesswork."
      >
        <Button variant="outline" asChild>
          <Link href={href("/scan")}>
            <ScanBarcode />
            Scan barcode
          </Link>
        </Button>
        <ProductDialog />
      </PageHeading>
      <Card>
        <CardHeader>
          <div className="section-title-row">
            <div>
              <CardTitle>Household items</CardTitle>
              <CardDescription>
                {data.products.filter((p) => !p.archived_at).length} essentials in your home.
              </CardDescription>
            </div>
          </div>
          <div className="filter-toolbar">
            <div className="search-control">
              <Search />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                aria-label="Search household items"
                placeholder="Search by name, brand, or barcode…"
              />
            </div>
            <NativeSelect
              aria-label="Filter by category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <NativeSelectOption value="all">All categories</NativeSelectOption>
              {categories.map((c) => (
                <NativeSelectOption key={c}>{c}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <Tabs
            value={filter}
            onValueChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All items</TabsTrigger>
              <TabsTrigger value="low">Running low</TabsTrigger>
              <TabsTrigger value="out">Out of stock</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {items.length ? (
            <div className="inventory-list">
              {items.slice(0, page * 16).map((p) => (
                <div className="inventory-row" key={p.id}>
                  <Link href={href(`/items/${p.id}`)} className="product-identity">
                    <ProductIcon product={p} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {[p.brand, p.package_size].filter(Boolean).join(" · ") || p.category}
                      </small>
                    </span>
                  </Link>
                  <span className="inventory-category">{p.category}</span>
                  {p.archived_at ? (
                    <Badge variant="outline">Archived</Badge>
                  ) : (
                    <AvailabilityMenu product={p} />
                  )}
                  <div className="row-actions">
                    {!p.archived_at ? (
                      <ListDialog product={p}>
                        <Button variant="outline" size="sm">
                          <ShoppingCart />
                          <span>Add to list</span>
                        </Button>
                      </ListDialog>
                    ) : null}
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={href(`/items/${p.id}`)} aria-label={`View ${p.name}`}>
                        <MoreHorizontal />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                query || category !== "all" || filter !== "all"
                  ? "No matching essentials"
                  : "Make a little room for your essentials"
              }
              description={
                query || category !== "all" || filter !== "all"
                  ? "Try another search or filter."
                  : "Add your first item, scan a barcode, or save a market purchase without one."
              }
            >
              <ProductDialog />
            </EmptyState>
          )}
          {items.length > page * 16 ? (
            <Button variant="outline" className="mt-4" onClick={() => setPage((p) => p + 1)}>
              Load more items
            </Button>
          ) : null}
          <div className="panel-footer">
            <span>
              {items.length} {items.length === 1 ? "item" : "items"} · Tap a status to update it.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export function ItemDetail({ id }: { id: string }) {
  const { data, href } = useHousehold();
  const product = data.products.find((p) => p.id === id);
  if (!product)
    return (
      <EmptyState
        title="Item not found"
        description="This item may belong to another household or no longer be available."
      >
        <Button asChild>
          <Link href={href("/items")}>Back to your items</Link>
        </Button>
      </EmptyState>
    );
  const records = data.lines.filter((l) => l.product_id === id);
  const units = [
    ...new Set(
      records.filter((l) => l.package_size === product.package_size).map((l) => l.purchase_unit),
    ),
  ];
  return (
    <div className="page-stack">
      <Button variant="link" className="self-start" asChild>
        <Link href={href("/items")}>
          <ArrowLeft />
          All household items
        </Link>
      </Button>
      <PageHeading
        title={product.name}
        description={[product.brand, product.package_size, product.category]
          .filter(Boolean)
          .join(" · ")}
      >
        <ProductDialog product={product}>
          <Button variant="outline">
            <Pencil />
            Edit item
          </Button>
        </ProductDialog>
        {!product.archived_at ? <ListDialog product={product} /> : null}
      </PageHeading>
      <div className="detail-grid">
        <Card>
          <CardHeader>
            <ProductIcon product={product} />
            <CardTitle>At home</CardTitle>
            <CardDescription>Keep the family in the loop.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="detail-status">
              {product.archived_at ? (
                <Badge variant="outline">Archived</Badge>
              ) : (
                <AvailabilityMenu product={product} />
              )}
            </div>
            <dl className="detail-fields">
              <div>
                <dt>Package size</dt>
                <dd>{product.package_size || "Not recorded"}</dd>
              </div>
              <div>
                <dt>Barcode</dt>
                <dd>{product.barcode || "No barcode"}</dd>
              </div>
              <div>
                <dt>Information source</dt>
                <dd>{product.source === "external" ? "Open Food Facts" : "Manually entered"}</dd>
              </div>
              <div>
                <dt>Notes</dt>
                <dd>{product.notes || "No notes yet."}</dd>
              </div>
            </dl>
            {!product.archived_at ? (
              <div className="flex flex-wrap gap-3">
                <PurchaseDialog product={product} />
                <ArchiveAction product={product} />
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last recorded price</CardTitle>
            <CardDescription>Only prices for the current package size are shown.</CardDescription>
          </CardHeader>
          <CardContent>
            {units.length ? (
              units.map((unit) => {
                const line = latestPrice(product, unit, data.lines, data.purchases)!;
                const p = data.purchases.find((p) => p.id === line.purchase_id);
                return (
                  <div className="last-price" key={unit}>
                    <strong>
                      {money(line.unit_price)} <small>/ {unit}</small>
                    </strong>
                    <p>
                      {p ? localDate(p.purchase_date) : ""} · {p?.store || "Store not recorded"}
                    </p>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="Price not recorded"
                description="Record a purchase to start your household’s price history."
                icon={Receipt}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>A little purchase history</CardTitle>
          <CardDescription>
            Names, package sizes, and prices are preserved as they were recorded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseTable productId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
