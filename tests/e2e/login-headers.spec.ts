import { expect, test } from "@playwright/test";

test("login renders and accepts a form submission with cookies from other localhost apps", async ({
  page,
  context,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  await context.addCookies(
    Array.from({ length: 10 }, (_, index) => ({
      name: `other-local-app-${index}`,
      value: "x".repeat(3000),
      url: origin,
    })),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) errors.push(message.text());
  });
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Welcome home." })).toBeVisible();
  const login = page.getByRole("button", { name: "Log in", exact: true });
  if (await login.isEnabled()) {
    await page.getByLabel("Email address").fill("header-check@rumahstock.invalid");
    await page.getByLabel("Password", { exact: true }).fill("Invalid-login-only-7319");
    await login.click();
    await expect(page.getByText("We couldn’t sign you in.", { exact: false })).toBeVisible();
    await expect(page.getByText("We couldn’t connect.", { exact: false })).toHaveCount(0);
  }
  await page.getByRole("link", { name: "Create an account", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "A happier home starts here." })).toBeVisible();
  expect(
    (await context.cookies()).filter((cookie) => cookie.name.startsWith("other-local-app-")).length,
  ).toBe(10);
  expect(errors).toEqual([]);
});

test("server continues to reject headers beyond the bounded allowance", async ({ request }) => {
  const response = await request.get("/login", {
    headers: { Cookie: `oversized=${"x".repeat(70000)}` },
  });
  expect(response.status()).toBe(431);
});
