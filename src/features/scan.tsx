"use client";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, Search, Receipt, Plus, ScanBarcode } from "lucide-react";
import { useHousehold } from "@/components/household-provider";
import { PageHeading, ProductIcon } from "@/components/common";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { productSchema } from "@/lib/validation";
import { z } from "zod";
import { ProductDialog } from "./product-dialog";
import { ListDialog } from "./list-dialog";
import { PurchaseDialog } from "./purchase-dialog";
import { AvailabilityMenu } from "./items";
const BarcodeCamera = dynamic(() => import("./barcode-camera").then((m) => m.BarcodeCamera), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />,
});
export function ScanPage() {
  const { data, demo, href } = useHousehold();
  const [barcode, setBarcode] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [savedId, setSavedId] = useState<string | null>(null),
    [external, setExternal] = useState<Partial<z.input<typeof productSchema>> | null>(null);
  const request = useRef(0);
  async function lookup(code = barcode) {
    setBarcode(code);
    setMessage("");
    setExternal(null);
    setSavedId(null);
    if (!/^\d{4,32}$/.test(code)) {
      setMessage("Enter a numeric barcode, keeping any leading zeros.");
      return;
    }
    const id = ++request.current;
    const saved = data.products.find((p) => p.barcode === code);
    if (saved) {
      setSavedId(saved.id);
      return;
    }
    if (demo) {
      setMessage(
        "This barcode isn’t in the sample catalog. Sign in to your household to look up other products, or add its details manually here.",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/lookup?barcode=${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (request.current !== id) return;
      if (!response.ok)
        setMessage(result.error ?? "Lookup failed. Manual creation is always available.");
      else if (result.savedId) setSavedId(result.savedId);
      else if (result.found) {
        const parsed = productSchema.partial().safeParse(result.product);
        if (parsed.success) {
          setExternal(parsed.data);
          setMessage("Found in Open Food Facts. Review the details before saving.");
        } else setMessage("The lookup returned incomplete details. Please enter them manually.");
      } else setMessage("No match found. This could be a non-food product. Add it manually below.");
    } catch {
      if (request.current === id)
        setMessage("The lookup couldn’t connect. You can still create this item manually.");
    } finally {
      if (request.current === id) setBusy(false);
    }
  }
  const saved = data.products.find((p) => p.id === savedId),
    matches = query.trim()
      ? data.products
          .filter(
            (p) =>
              !p.archived_at && `${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 8)
      : [];
  return (
    <div className="page-stack">
      <PageHeading
        title="A small scan. A simpler shop."
        description="Find a familiar essential, or add something new."
      />
      <div className="scan-layout">
        <Card>
          <CardHeader>
            <CardTitle>Scan a barcode</CardTitle>
            <CardDescription>EAN-13, EAN-8, and UPC barcodes are supported.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarcodeCamera onDetect={(value) => void lookup(value)} />
          </CardContent>
        </Card>
        <div className="page-stack">
          <Card>
            <CardHeader>
              <CardTitle>Type it in, just as easily</CardTitle>
              <CardDescription>Camera shy? The numbers work too.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void lookup();
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="manual-barcode">Barcode number</FieldLabel>
                    <Input
                      id="manual-barcode"
                      inputMode="numeric"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g. 9556001123459"
                      pattern="[0-9]{4,32}"
                      required
                      maxLength={32}
                    />
                  </Field>
                  <Button type="submit" disabled={busy}>
                    {busy ? <LoaderCircle className="animate-spin" /> : <Search />}Look up product
                  </Button>
                </FieldGroup>
              </form>
              {message ? (
                <Alert className="mt-4">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}
              {saved ? (
                <div className="scan-result">
                  <Badge variant="secondary">In your household</Badge>
                  <Link href={href(`/items/${saved.id}`)} className="product-identity">
                    <ProductIcon product={saved} />
                    <span>
                      <strong>{saved.name}</strong>
                      <small>{saved.package_size}</small>
                    </span>
                  </Link>
                  {saved.archived_at ? (
                    <p>This item is archived. View its details and purchase history.</p>
                  ) : (
                    <>
                      <AvailabilityMenu product={saved} />
                      <div className="flex flex-wrap gap-2">
                        <ListDialog product={saved} />
                        <PurchaseDialog product={saved}>
                          <Button variant="outline">
                            <Receipt />
                            Record purchase
                          </Button>
                        </PurchaseDialog>
                      </div>
                    </>
                  )}
                </div>
              ) : barcode && !busy ? (
                <div className="mt-4">
                  <ProductDialog
                    key={`${barcode}-${external?.name ?? ""}`}
                    initial={external ?? { barcode }}
                    onSaved={(id) => setSavedId(id)}
                  >
                    <Button variant="outline">
                      <Plus />
                      {external ? "Review & save product" : "Create this item manually"}
                    </Button>
                  </ProductDialog>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Find it by name</CardTitle>
              <CardDescription>
                Search the products your household has already saved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="search-control">
                <Search />
                <Input
                  aria-label="Search catalog by product name"
                  placeholder="e.g. rice, soap, tomatoes…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {query ? (
                <div className="catalog-matches">
                  {matches.length ? (
                    matches.map((p) => (
                      <Button
                        variant="ghost"
                        className="catalog-match"
                        key={p.id}
                        onClick={() => {
                          setSavedId(p.id);
                          setExternal(null);
                          setMessage("");
                        }}
                      >
                        <span>
                          {p.name}
                          <small>{p.package_size}</small>
                        </span>
                        <ArrowRight />
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground mt-4">
                      No matching items yet. You can add one below.
                    </p>
                  )}
                </div>
              ) : null}
              <div className="manual-create">
                <span>No barcode? No problem.</span>
                <ProductDialog initial={{ name: query }}>
                  <Button variant="link">
                    <Plus />
                    Add an item manually
                  </Button>
                </ProductDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <p className="scanner-footnote">
        <ScanBarcode />
        Scanning identifies a product. You choose what to save, buy, or update.{" "}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
          Food data: Open Food Facts (ODbL)
        </a>
      </p>
    </div>
  );
}
