"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoaderCircle, ShoppingCart } from "lucide-react";
import type { Entry, Product } from "@/lib/domain";
import { listSchema } from "@/lib/validation";
import { useHousehold } from "@/components/household-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
export function ListDialog({
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
            <ShoppingCart />
            Add to list
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Edit shopping item" : "A little shopping to do"}</DialogTitle>
          <DialogDescription>One shared list. Everyone on the same page.</DialogDescription>
        </DialogHeader>
        {open ? <ListForm product={product} entry={entry} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
function ListForm({
  product,
  entry,
  onDone,
}: {
  product?: Product;
  entry?: Entry;
  onDone: () => void;
}) {
  const { data, run } = useHousehold();
  const [error, setError] = useState("");
  const options = data.products.filter((p) => !p.archived_at);
  const [openedEntries] = useState(data.entries),
    [openedEntry] = useState(entry);
  const defaultEntry =
    openedEntry ??
    openedEntries.find(
      (e) => e.product_id === (product?.id ?? options[0]?.id) && e.status === "pending",
    );
  const form = useForm<z.input<typeof listSchema>, unknown, z.output<typeof listSchema>>({
    resolver: zodResolver(listSchema),
    defaultValues: {
      product_id: product?.id ?? options[0]?.id ?? "",
      quantity: defaultEntry?.quantity ?? 1,
      purchase_unit: defaultEntry?.purchase_unit ?? "pack",
      priority: (defaultEntry?.priority as "normal" | "urgent") ?? "normal",
      notes: defaultEntry?.notes ?? "",
      replace: !!defaultEntry,
    },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const selected = useWatch({ control: form.control, name: "product_id" }),
    existing =
      openedEntry ?? openedEntries.find((e) => e.product_id === selected && e.status === "pending");
  const productField = register("product_id", {
    onChange: (event) => {
      const saved = openedEntries.find(
        (e) => e.product_id === event.target.value && e.status === "pending",
      );
      form.setValue("purchase_unit", saved?.purchase_unit ?? "pack");
      form.setValue("quantity", saved?.quantity ?? 1);
      form.setValue("priority", (saved?.priority as "normal" | "urgent") ?? "normal");
      form.setValue("notes", saved?.notes ?? "");
    },
  });
  async function submit(v: z.output<typeof listSchema>) {
    setError("");
    const result = existing
      ? await run({
          action: "edit_entry",
          payload: {
            id: existing.id,
            quantity: v.quantity,
            priority: v.priority,
            notes: v.notes,
            expected_version: existing.version,
          },
        })
      : await run({ action: "add_entry", payload: v });
    if (result.ok) onDone();
    else setError(result.error);
  }
  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="list-product">Household item</FieldLabel>
          <NativeSelect id="list-product" {...productField} disabled={!!product}>
            {options.map((p) => (
              <NativeSelectOption value={p.id} key={p.id}>
                {p.name}
                {p.package_size ? ` · ${p.package_size}` : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[errors.product_id]} />
        </Field>
        {existing ? (
          <Alert>
            <AlertDescription>
              This item is already pending: {existing.quantity} {existing.purchase_unit}. Saving
              will replace its required quantity.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="form-grid">
          <Field data-invalid={!!errors.quantity}>
            <FieldLabel htmlFor="required-quantity">Required quantity</FieldLabel>
            <Input
              id="required-quantity"
              type="number"
              min="0.001"
              max="10000"
              step="0.001"
              {...register("quantity", { valueAsNumber: true })}
              aria-invalid={!!errors.quantity}
            />
            <FieldError errors={[errors.quantity]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="purchase-unit">Purchase unit</FieldLabel>
            <Input
              id="purchase-unit"
              placeholder="bag, bottle, pack"
              {...register("purchase_unit")}
              readOnly={!!existing}
            />
            <FieldError errors={[errors.purchase_unit]} />
          </Field>
        </div>
        <FieldDescription>
          Package size and quantity are different: 2 bags of 5 kg rice.
        </FieldDescription>
        <Field>
          <FieldLabel htmlFor="priority">Priority</FieldLabel>
          <NativeSelect id="priority" {...register("priority")}>
            <NativeSelectOption value="normal">Normal</NativeSelectOption>
            <NativeSelectOption value="urgent">Urgent</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="list-notes">
            Notes <span className="optional">optional</span>
          </FieldLabel>
          <Textarea
            id="list-notes"
            placeholder="e.g. Get the unsweetened one"
            {...register("notes")}
          />
          <FieldError errors={[errors.notes]} />
        </Field>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button disabled={isSubmitting || options.length === 0} type="submit">
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <ShoppingCart />}
            {existing ? "Update quantity" : "Add to shopping list"}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
