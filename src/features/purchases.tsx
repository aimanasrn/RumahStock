"use client";
import { useState } from "react";
import { Receipt, Search } from "lucide-react";
import { useHousehold } from "@/components/household-provider";
import { EmptyState, PageHeading } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { money, localDate, monthlySpend } from "@/lib/domain";
import { PurchaseDialog } from "./purchase-dialog";
export function PurchaseTable({
  limit,
  query = "",
  productId,
}: {
  limit?: number;
  query?: string;
  productId?: string;
}) {
  const { data } = useHousehold();
  const purchaseMap = new Map(data.purchases.map((p) => [p.id, p]));
  const search = query.toLowerCase();
  const lines = data.lines
    .filter(
      (l) =>
        (!productId || l.product_id === productId) &&
        `${l.product_name} ${purchaseMap.get(l.purchase_id)?.store ?? ""}`
          .toLowerCase()
          .includes(search),
    )
    .sort((a, b) => {
      return (
        (purchaseMap.get(b.purchase_id)?.purchase_date ?? "").localeCompare(
          purchaseMap.get(a.purchase_id)?.purchase_date ?? "",
        ) || b.created_at.localeCompare(a.created_at)
      );
    });
  if (!lines.length)
    return (
      <EmptyState
        title={query ? "No matching purchases" : "Your history starts with your first shop"}
        description={
          query
            ? "Try another item or store name."
            : "Record a purchase to remember the price, store, and who brought it home."
        }
        icon={Receipt}
      />
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Item</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Unit price</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Store / recorded by</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.slice(0, limit ?? lines.length).map((l) => {
          const p = purchaseMap.get(l.purchase_id);
          return (
            <TableRow key={l.id}>
              <TableCell className="whitespace-nowrap">
                {p ? localDate(p.purchase_date) : "—"}
              </TableCell>
              <TableCell>
                <strong className="table-product">{l.product_name}</strong>
                <small className="table-subtext">{l.package_size}</small>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {l.quantity} {l.purchase_unit}
              </TableCell>
              <TableCell className="whitespace-nowrap">{money(l.unit_price)}</TableCell>
              <TableCell className="text-right font-medium whitespace-nowrap">
                {money(l.line_total ?? 0)}
              </TableCell>
              <TableCell>
                <span>{p?.store || "Store not recorded"}</span>
                <small className="table-subtext">
                  {data.members.find((m) => m.user_id === p?.recorded_by)?.name ?? "Former member"}
                </small>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
export function PurchasesPage() {
  const { data } = useHousehold();
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1);
  return (
    <div className="page-stack">
      <PageHeading
        title="Every shop, remembered."
        description="Actual purchases and the prices you paid."
      >
        <PurchaseDialog />
      </PageHeading>
      <div className="spending-summary">
        <Receipt />
        <div>
          <span>Actual recorded spending this month</span>
          <strong>{money(monthlySpend(data.lines, data.purchases))}</strong>
        </div>
        <span>{data.purchases.length} recorded purchases</span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Purchase history</CardTitle>
          <CardDescription>
            Historical prices in MYR. These are the prices your household recorded.
          </CardDescription>
          <div className="search-control">
            <Search />
            <Input
              aria-label="Search purchases"
              placeholder="Search an item or store…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <PurchaseTable query={query} limit={page * 20} />
          {data.lines.length > page * 20 ? (
            <Button variant="outline" className="mt-4" onClick={() => setPage((p) => p + 1)}>
              Load more purchases
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
