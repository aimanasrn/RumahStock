"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ShoppingCart, Trash2, Pencil, Wallet, Plus } from "lucide-react";
import { useHousehold } from "@/components/household-provider";
import { EmptyState, PageHeading, ProductIcon } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { estimate, latestPrice, money, type Entry } from "@/lib/domain";
import { ListDialog } from "./list-dialog";
import { ProductDialog } from "./product-dialog";
import { PurchaseDialog } from "./purchase-dialog";
import Decimal from "decimal.js";
function RemoveEntry({ entry, name }: { entry: Entry; name: string }) {
  const { run } = useHousehold();
  const [busy, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Remove ${name} from list`}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name} from the list?</AlertDialogTitle>
          <AlertDialogDescription>
            The household item and its purchase history will stay available.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep on list</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={() =>
              start(async () => {
                await run({
                  action: "remove_entry",
                  payload: { id: entry.id, expected_version: entry.version },
                });
              })
            }
          >
            Remove item
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function ShoppingPage() {
  const { data, href } = useHousehold();
  const [tab, setTab] = useState("pending");
  const pending = data.entries.filter((e) => e.status === "pending"),
    bought = data.entries.filter((e) => e.status === "purchased"),
    price = estimate(data.entries, data.products, data.lines, data.purchases);
  const entries = (tab === "pending" ? pending : bought).toSorted(
    (a, b) => Number(b.priority === "urgent") - Number(a.priority === "urgent"),
  );
  return (
    <div className="page-stack">
      <PageHeading
        title="One list. A little less to remember."
        description="Shared with your household, ready for your next shop."
      >
        <ProductDialog>
          <Button variant="outline">
            <Plus />
            New item
          </Button>
        </ProductDialog>
        <ListDialog />
      </PageHeading>
      <div className="shopping-layout">
        <Card>
          <CardHeader>
            <div className="section-title-row">
              <div>
                <CardTitle>Your shared shopping list</CardTitle>
                <CardDescription>{pending.length} essentials to bring home.</CardDescription>
              </div>
              <Badge variant="secondary">{data.members.length} members</Badge>
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="pending">To buy ({pending.length})</TabsTrigger>
                <TabsTrigger value="purchased">Purchased ({bought.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {entries.length ? (
              <div className="full-shopping-list">
                {entries.map((e) => {
                  const p = data.products.find((p) => p.id === e.product_id);
                  if (!p) return null;
                  const last = latestPrice(p, e.purchase_unit, data.lines, data.purchases);
                  return (
                    <div className="full-shopping-row" key={e.id}>
                      <div className="shopping-main">
                        {e.status === "pending" ? (
                          <PurchaseDialog product={p} entry={e}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="purchase-check"
                              aria-label={`Record purchase of ${p.name}`}
                            >
                              <Check />
                            </Button>
                          </PurchaseDialog>
                        ) : (
                          <span className="purchased-icon">
                            <Check />
                          </span>
                        )}
                        <Link href={href(`/items/${p.id}`)} className="product-identity">
                          <ProductIcon product={p} />
                          <span>
                            <strong>{p.name}</strong>
                            <small>
                              {e.quantity} {e.purchase_unit} · {p.package_size}
                            </small>
                          </span>
                        </Link>
                        {e.priority === "urgent" ? (
                          <Badge variant="destructive">Urgent</Badge>
                        ) : null}
                      </div>
                      <div className="shopping-meta">
                        <p>
                          {e.notes ? (
                            <>
                              {e.notes}
                              <br />
                            </>
                          ) : null}
                          Added by{" "}
                          {data.members.find((m) => m.user_id === e.added_by)?.name ??
                            "Former member"}
                          {e.status === "pending" && e.purchased_by ? (
                            <>
                              <br />
                              Last top-up by{" "}
                              {data.members.find((m) => m.user_id === e.purchased_by)?.name ??
                                "Former member"}
                            </>
                          ) : null}
                        </p>
                        <div className="shopping-entry-price">
                          {e.status === "pending" ? (
                            last ? (
                              <>
                                <strong>
                                  {money(new Decimal(e.quantity).times(last.unit_price))}
                                </strong>
                                <small>
                                  {money(last.unit_price)} / {e.purchase_unit}, last recorded
                                </small>
                              </>
                            ) : (
                              <small>Price not recorded</small>
                            )
                          ) : (
                            <small>
                              Purchased by{" "}
                              {data.members.find((m) => m.user_id === e.purchased_by)?.name ??
                                "Former member"}
                            </small>
                          )}
                        </div>
                      </div>
                      {e.status === "pending" ? (
                        <div className="shopping-row-footer">
                          <PurchaseDialog product={p} entry={e}>
                            <Button variant="outline" size="sm">
                              <Check />
                              Record purchase
                            </Button>
                          </PurchaseDialog>
                          <ListDialog product={p} entry={e}>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${p.name} quantity`}
                            >
                              <Pencil />
                            </Button>
                          </ListDialog>
                          <RemoveEntry entry={e} name={p.name} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={
                  tab === "pending" ? "All caught up. Breathe easy." : "Nothing purchased just yet"
                }
                description={
                  tab === "pending"
                    ? "Add an essential when it’s time for a top-up."
                    : "Record a purchase from a pending entry to see it here."
                }
                icon={ShoppingCart}
              >
                <ListDialog />
              </EmptyState>
            )}
          </CardContent>
        </Card>
        <aside className="shopping-aside">
          <Card className="estimate-card">
            <CardHeader>
              <Wallet />
              <CardTitle>A guide for your next shop</CardTitle>
              <CardDescription>Estimated shopping cost</CardDescription>
            </CardHeader>
            <CardContent>
              <strong className="estimate-total">{money(price.subtotal)}</strong>
              <p>
                Priced subtotal for {pending.length - price.missing} of {pending.length} items.
              </p>
              <div className="estimate-note">
                {price.missing > 0
                  ? `${price.missing} ${price.missing === 1 ? "item has" : "items have"} no compatible recorded price and ${price.missing === 1 ? "is" : "are"} excluded.`
                  : "All pending items have a compatible recorded price."}
              </div>
              <small>
                Based on the latest recorded price for the same product, package size, and purchase
                unit. Your actual total may differ.
              </small>
            </CardContent>
          </Card>
          <p className="price-note">
            A partial purchase? Record what you bought. We’ll keep the remaining quantity on the
            list.
          </p>
        </aside>
      </div>
    </div>
  );
}
