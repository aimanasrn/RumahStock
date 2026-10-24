"use client";
import {
  Check,
  CircleAlert,
  TriangleAlert,
  Package,
  Milk,
  Droplets,
  Wheat,
  Baby,
  Sparkles,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/domain";
import { labels } from "@/lib/labels";
import { Badge } from "./ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "./ui/empty";
import { Button } from "./ui/button";
import { useHousehold } from "./household-provider";
import { cn } from "@/lib/utils";
export function StatusBadge({ status }: { status: string }) {
  const Icon = status === "out" ? TriangleAlert : status === "low" ? CircleAlert : Check;
  return (
    <Badge variant="secondary" className={cn("status-badge", `status-${status}`)}>
      <Icon />
      {labels[status as "enough" | "low" | "out"] ?? status}
    </Badge>
  );
}
const categoryIcons: Record<string, typeof Package> = {
  "Food and pantry": Wheat,
  Drinks: Milk,
  "Cleaning supplies": Sparkles,
  Toiletries: Droplets,
  "Baby essentials": Baby,
  "Other household items": ShoppingBag,
};
export function ProductIcon({ product }: { product: Product }) {
  const Icon = categoryIcons[product.category] ?? Package;
  return (
    <span
      className={cn(
        "product-icon",
        `category-${Object.keys(categoryIcons).indexOf(product.category)}`,
      )}
    >
      {product.image_path ? (
        <Image
          unoptimized
          width={48}
          height={48}
          src={`/api/images?path=${encodeURIComponent(product.image_path)}`}
          alt=""
        />
      ) : (
        <Icon aria-hidden="true" />
      )}
    </span>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children ? <div className="page-heading-actions">{children}</div> : null}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
  icon: Icon = Package,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  icon?: typeof Package;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}
export function ViewLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { href } = useHousehold();
  return (
    <Button variant="link" size="sm" asChild>
      <Link href={href(to)}>
        {children}
        <ArrowRight />
      </Link>
    </Button>
  );
}
