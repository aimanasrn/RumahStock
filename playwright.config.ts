import { defineConfig } from "@playwright/test";
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL:
      process.env.TEST_BASE_URL ??
      (process.env.E2E_PRODUCTION ? "http://localhost:3100" : "http://localhost:3000"),
    browserName: "chromium",
    viewport: { width: 1536, height: 1024 },
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: {
    command: process.env.E2E_PRODUCTION ? "npm run start -- --port 3100" : "npm run dev",
    url: `${process.env.TEST_BASE_URL ?? (process.env.E2E_PRODUCTION ? "http://localhost:3100" : "http://localhost:3000")}/demo`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
