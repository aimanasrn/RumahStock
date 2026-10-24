"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoaderCircle, Plus } from "lucide-react";
import type { Product, Status } from "@/lib/domain";
import { productSchema } from "@/lib/validation";
import { categories, statuses, labels } from "@/lib/labels";
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
import { uploadImage } from "./uploads";
type Values = z.input<typeof productSchema>;
export function ProductDialog({
  product,
  initial,
  children,
  onSaved,
}: {
  product?: Product;
  initial?: Partial<Values>;
  children?: React.ReactNode;
  onSaved?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus />
            Add an item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="form-dialog">
        <DialogHeader>
          <DialogTitle>
            {product
              ? "Edit household item"
              : initial?.source === "external"
                ? "Review product details"
                : "Add a household item"}
          </DialogTitle>
          <DialogDescription>
            {initial?.source === "external"
              ? "Details from Open Food Facts. Check them before saving. Prices are recorded separately."
              : "The everyday essentials, with or without a barcode."}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ProductForm
            product={product}
            initial={initial}
            onDone={(id) => {
              setOpen(false);
              onSaved?.(id);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
function ProductForm({
  product,
  initial,
  onDone,
}: {
  product?: Product;
  initial?: Partial<Values>;
  onDone: (id: string) => void;
}) {
  const { data, demo, run } = useHousehold();
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState("");
  const form = useForm<Values, unknown, z.output<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      barcode: product?.barcode ?? "",
      brand: product?.brand ?? "",
      package_size: product?.package_size ?? "",
      category: (product?.category as Values["category"]) ?? categories[0],
      notes: product?.notes ?? "",
      source: (product?.source as Values["source"]) ?? "manual",
      status:
        (data.availability.find((a) => a.product_id === product?.id)?.status as Status) ?? "enough",
      ...initial,
    },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  async function submit(values: z.output<typeof productSchema>) {
    setError("");
    let image_path = product?.image_path ?? null;
    if (file && !demo) {
      const body = new FormData();
      body.set("file", file);
      const upload = await uploadImage(body);
      if (!upload.ok) {
        setError(upload.error);
        return;
      }
      image_path = upload.path;
    }
    const result = await run({
      action: "save_product",
      payload: { ...values, id: product?.id, image_path },
    });
    if (result.ok && result.data && typeof result.data === "object" && "id" in result.data)
      onDone(String(result.data.id));
    else if (!result.ok) setError(result.error);
  }
  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="product-name">
            Product name <span aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id="product-name"
            placeholder="e.g. Jasmine rice"
            {...register("name")}
            aria-invalid={!!errors.name}
            autoFocus
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <div className="form-grid">
          <Field data-invalid={!!errors.brand}>
            <FieldLabel htmlFor="product-brand">
              Brand <span className="optional">optional</span>
            </FieldLabel>
            <Input id="product-brand" {...register("brand")} />
            <FieldError errors={[errors.brand]} />
          </Field>
          <Field data-invalid={!!errors.package_size}>
            <FieldLabel htmlFor="package-size">Package size</FieldLabel>
            <Input
              id="package-size"
              placeholder="e.g. 5 kg, 1 L, 10 pieces"
              {...register("package_size")}
            />
            <FieldDescription>The size of one package.</FieldDescription>
            <FieldError errors={[errors.package_size]} />
          </Field>
        </div>
        <div className="form-grid">
          <Field>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <NativeSelect id="category" {...register("category")}>
              {categories.map((c) => (
                <NativeSelectOption key={c}>{c}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="availability">Availability</FieldLabel>
            <NativeSelect id="availability" {...register("status")}>
              {statuses.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {labels[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field data-invalid={!!errors.barcode}>
          <FieldLabel htmlFor="product-barcode">
            Barcode <span className="optional">optional</span>
          </FieldLabel>
          <Input
            id="product-barcode"
            inputMode="numeric"
            placeholder="Leave empty for market purchases"
            {...register("barcode")}
            aria-invalid={!!errors.barcode}
          />
          <FieldError errors={[errors.barcode]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="product-image">
            Product photo <span className="optional">optional</span>
          </FieldLabel>
          <Input
            id="product-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={demo}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <FieldDescription>
            {demo
              ? "Photo uploads are available in your connected household."
              : "JPG, PNG or WebP, up to 5 MB. Shared only with your household."}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="product-notes">
            Notes <span className="optional">optional</span>
          </FieldLabel>
          <Textarea
            id="product-notes"
            placeholder="Anything your family should know"
            {...register("notes")}
          />
        </Field>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Plus />}
            {product ? "Save changes" : "Save household item"}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
