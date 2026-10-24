import { test, expect } from "@playwright/test";
test("create an unknown item, add two units, buy one, preserve the remainder and history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "A happy home starts here." })).toBeVisible();
  await page.getByRole("button", { name: "Add an item", exact: true }).click();
  await page.getByLabel("Product name").fill("Market spinach");
  await page.getByLabel("Package size").fill("1 bunch");
  await page.getByRole("button", { name: "Save household item" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/demo/items");
  await page.getByRole("textbox", { name: "Search household items" }).fill("Market spinach");
  await page.getByRole("link", { name: "Market spinach 1 bunch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Market spinach", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add to list", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Required quantity").fill("2");
  await page.getByLabel("Purchase unit", { exact: true }).fill("bunch");
  await page.getByRole("button", { name: "Add to shopping list", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/demo/shopping-list");
  const row = page.locator(".full-shopping-row").filter({ hasText: "Market spinach" });
  await expect(row).toContainText("Price not recorded");
  await row.getByRole("button", { name: "Record purchase", exact: true }).click();
  await page.getByLabel("Actual quantity", { exact: true }).fill("1");
  await page.getByLabel("Actual unit price (MYR)").fill("3.25");
  await page.getByLabel("Store", { exact: false }).fill("Test market");
  await page.getByRole("button", { name: "Save purchase", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("1 bunch");
  await expect(row).toContainText("3.25");
  await page.reload();
  await expect(
    page.locator(".full-shopping-row").filter({ hasText: "Market spinach" }),
  ).toContainText("1 bunch");
  await page.goto("/demo/purchases");
  await page.getByRole("textbox", { name: "Search purchases" }).fill("Market spinach");
  await expect(page.getByRole("row").filter({ hasText: "Market spinach" })).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: "Market spinach" })).toContainText(
    "Test market",
  );
  expect(errors).toEqual([]);
});
test("existing barcode lookup is read-only until a user chooses an action", async ({ page }) => {
  await page.goto("/demo/scan");
  await page.getByLabel("Barcode number").fill("9556001123459");
  await page.getByRole("button", { name: "Look up product" }).click();
  await expect(page.locator(".scan-result")).toContainText("Fresh milk");
  await expect(page.locator(".scan-result")).toContainText("Out of stock");
  await page.goto("/demo/shopping-list");
  await expect(page.locator(".full-shopping-row").filter({ hasText: "Fresh milk" })).toContainText(
    "2 bottle",
  );
});
test("camera is requested only on open and failure leaves manual creation available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
      configurable: true,
    });
  });
  await page.goto("/demo/scan");
  await expect(page.getByText("Camera permission was denied.", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Open camera" }).click();
  await expect(page.getByText("Camera permission was denied.", { exact: false })).toBeVisible();
  await page.getByLabel("Barcode number").fill("0012345678905");
  await page.getByRole("button", { name: "Look up product" }).click();
  await page.getByRole("button", { name: "Create this item manually" }).click();
  await expect(page.getByLabel("Barcode", { exact: false }).last()).toHaveValue("0012345678905");
});
test("late camera acquisition stops its tracks after leaving the scanner", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      cameraRequested?: boolean;
      cameraStopped?: boolean;
      resolveCamera?: () => void;
    };
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: () =>
          new Promise((resolve) => {
            state.cameraRequested = true;
            state.resolveCamera = () =>
              resolve({
                getTracks: () => [
                  {
                    stop: () => {
                      state.cameraStopped = true;
                    },
                  },
                ],
              });
          }),
      },
      configurable: true,
    });
  });
  await page.goto("/demo/scan");
  await page.getByRole("button", { name: "Open camera" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { cameraRequested: boolean }).cameraRequested),
    )
    .toBe(true);
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await page.evaluate(() => (window as unknown as { resolveCamera: () => void }).resolveCamera());
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { cameraStopped: boolean }).cameraStopped),
    )
    .toBe(true);
});
test("duplicate pending products offer an explicit quantity update", async ({ page }) => {
  await page.goto("/demo/shopping-list");
  await page.getByRole("button", { name: "Add to list", exact: true }).click();
  await expect(page.getByText("This item is already pending:", { exact: false })).toBeVisible();
  await page.getByLabel("Household item").selectOption({ label: "Jasmine rice · 5 kg" });
  await expect(page.getByLabel("Purchase unit", { exact: true })).toHaveValue("bag");
  await page.getByLabel("Required quantity").fill("3");
  await page.getByRole("button", { name: "Update quantity" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".full-shopping-row").filter({ hasText: "Jasmine rice" })).toHaveCount(
    1,
  );
  await expect(
    page.locator(".full-shopping-row").filter({ hasText: "Jasmine rice" }),
  ).toContainText("3 bag");
});
test("availability changes update dashboard counts and empty searches are meaningful", async ({
  page,
}) => {
  await page.goto("/demo/items");
  await page.getByRole("textbox", { name: "Search household items" }).fill("Fresh milk");
  await page.getByRole("button", { name: "Change availability for Fresh milk" }).click();
  await page.getByRole("menuitem", { name: "Enough", exact: true }).click();
  await expect(page.locator(".inventory-row")).toContainText("Enough");
  await page.getByRole("textbox", { name: "Search household items" }).fill("nothing-matches-123");
  await expect(page.getByText("No matching essentials")).toBeVisible();
});
test("mobile screens have no horizontal overflow and bottom navigation works", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/demo",
    "/demo/items",
    "/demo/shopping-list",
    "/demo/scan",
    "/demo/purchases",
    "/demo/household",
    "/demo/settings",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Scan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo\/scan$/);
  await expect(page.getByRole("button", { name: "Open camera" })).toBeVisible();
});
test("dark theme persists after refresh", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
test("unauthenticated protected routes and APIs fail closed", async ({ page, request }) => {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.includes("replace-with"),
  );
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Connect your Supabase project")).toHaveCount(configured ? 0 : 1);
  expect((await request.get("/api/lookup?barcode=9556001123456")).status()).toBe(
    configured ? 401 : 503,
  );
  expect((await request.get("/api/images?path=other/image.png")).status()).toBe(
    configured ? 401 : 503,
  );
});
