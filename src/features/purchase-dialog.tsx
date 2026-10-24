"use client";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, LoaderCircle, Receipt } from "lucide-react";
import { money, today, type Entry, type Product } from "@/lib/domain";
import { purchaseSchema } from "@/lib/validation";
import { statuses, labels } from "@/lib/labels";
import { useHousehold } from "@/components/household-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Decimal from "decimal.js";
export function PurchaseDialog({
  product,
  entry,
  children,
}: {
  product?: Product;
  entry?: Entry;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Receipt />
            Record purchase
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Bought it? Let’s record it." : "Record a purchase"}</DialogTitle>
          <DialogDescription>
            Save the actual price you paid. Your family will thank you later.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <PurchaseForm product={product} entry={entry} onDone={() => setOpen(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
function PurchaseForm({
  product,
  entry,
  onDone,
}: {
  product?: Product;
  entry?: Entry;
  onDone: () => void;
}) {
  const { data, run } = useHousehold();
  const [error, setError] = useState(""),
    [requestId] = useState(() => crypto.randomUUID());
  const pending = useRef(false),
    submission = useRef({ fingerprint: "", id: requestId });
  const options = data.products.filter((p) => !p.archived_at);
  const form = useForm<z.input<typeof purchaseSchema>, unknown, z.output<typeof purchaseSchema>>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      product_id: product?.id ?? options[0]?.id ?? "",
      entry_id: entry?.id ?? null,
      expected_version: entry?.version ?? null,
      quantity: entry?.quantity ?? 1,
      purchase_unit: entry?.purchase_unit ?? "pack",
      unit_price: undefined,
      store: "",
      purchase_date: today(),
      status: "enough",
      request_id: requestId,
    },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const [quantity, price] = useWatch({ control: form.control, name: ["quantity", "unit_price"] });
  const total =
    Number.isFinite(quantity) && Number.isFinite(price)
      ? money(new Decimal(quantity).times(price))
      : "—";
  async function submit(v: z.output<typeof purchaseSchema>) {
    if (pending.current) return;
    pending.current = true;
    setError("");
    const fingerprint = JSON.stringify({ ...v, request_id: undefined });
    if (submission.current.fingerprint && submission.current.fingerprint !== fingerprint)
      submission.current.id = crypto.randomUUID();
    submission.current.fingerprint = fingerprint;
    try {
      const result = await run({
        action: "record_purchase",
        payload: { ...v, request_id: submission.current.id },
      });
      if (result.ok) onDone();
      else setError(result.error);
    } finally {
      pending.current = false;
    }
  }
  return (
    <form
      onSubmit={(event) => {
        void form.handleSubmit(submit)(event);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="bought-product">Product</FieldLabel>
          <NativeSelect id="bought-product" disabled={!!product} {...register("product_id")}>
            {options.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.name} · {p.package_size}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[errors.product_id]} />
        </Field>
        {entry ? (
          <Alert>
            <AlertDescription>
              Remaining on the list: {entry.quantity} {entry.purchase_unit}. A partial purchase
              keeps the rest pending.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="form-grid">
          <Field data-invalid={!!errors.quantity}>
            <FieldLabel htmlFor="actual-quantity">Actual quantity</FieldLabel>
            <Input
              id="actual-quantity"
              type="number"
              min="0.001"
              max={entry?.quantity ?? 10000}
              step="0.001"
              {...register("quantity", { valueAsNumber: true })}
              aria-invalid={!!errors.quantity}
            />
            <FieldError errors={[errors.quantity]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="actual-unit">Purchase unit</FieldLabel>
            <Input id="actual-unit" {...register("purchase_unit")} readOnly={!!entry} />
            <FieldError errors={[errors.purchase_unit]} />
          </Field>
        </div>
        <Field data-invalid={!!errors.unit_price}>
          <FieldLabel htmlFor="unit-price">Actual unit price (MYR)</FieldLabel>
          <Input
            id="unit-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            max="1000000"
            placeholder="0.00"
            {...register("unit_price", { valueAsNumber: true })}
            aria-invalid={!!errors.unit_price}
          />
          <FieldDescription>Price for one purchase unit, not the whole line.</FieldDescription>
          <FieldError errors={[errors.unit_price]} />
        </Field>
        <div className="form-grid">
          <Field>
            <FieldLabel htmlFor="purchase-store">
              Store <span className="optional">optional</span>
            </FieldLabel>
            <Input
              id="purchase-store"
              placeholder="e.g. Neighbourhood market"
              {...register("store")}
            />
            <FieldError errors={[errors.store]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="purchase-date">Purchase date</FieldLabel>
            <Input id="purchase-date" type="date" max={today()} {...register("purchase_date")} />
            <FieldError errors={[errors.purchase_date]} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="resulting-status">Availability after this purchase</FieldLabel>
          <NativeSelect id="resulting-status" {...register("status")}>
            {statuses.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {labels[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>Confirm how well stocked your household is now.</FieldDescription>
        </Field>
        <div className="purchase-total">
          <span>Actual line total</span>
          <strong>{total}</strong>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting || !options.length}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Check />}Save purchase
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
