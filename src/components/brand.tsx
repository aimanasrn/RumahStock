import { House, Sprout } from "lucide-react";
import { labels } from "@/lib/labels";
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <House aria-hidden="true" />
        <Sprout aria-hidden="true" />
      </span>
      <div>
        <strong>{labels.brand}</strong>
        <span>{labels.tagline}</span>
      </div>
    </div>
  );
}
