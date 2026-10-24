export const labels = {
  brand: "RumahStock",
  tagline: "A little more organised.",
  dashboard: "Overview",
  items: "Household items",
  shopping: "Shopping list",
  scan: "Scan barcode",
  purchases: "Purchase history",
  household: "Household",
  settings: "Settings",
  enough: "Enough",
  low: "Running low",
  out: "Out of stock",
  noPrice: "Price not recorded",
} as const;
export const categories = [
  "Food and pantry",
  "Drinks",
  "Cleaning supplies",
  "Toiletries",
  "Baby essentials",
  "Other household items",
] as const;
export const statuses = ["enough", "low", "out"] as const;
