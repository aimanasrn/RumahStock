import { test } from "node:test";
import assert from "node:assert/strict";
import { authSchema } from "../src/lib/auth-validation";

test("login ignores empty hidden registration fields", () => {
  const value = authSchema.parse({
    kind: "login",
    email: "test@example.com",
    password: "test-password",
    name: "",
    confirm: "",
  });
  assert.equal(value.kind, "login");
  assert.equal("name" in value, false);
});
test("forgot password ignores empty hidden password fields", () => {
  assert.equal(
    authSchema.safeParse({
      kind: "forgot-password",
      email: "test@example.com",
      password: "",
      name: "",
      confirm: "",
    }).success,
    true,
  );
});
test("reset password ignores hidden email and requires matching passwords", () => {
  assert.equal(
    authSchema.safeParse({
      kind: "reset-password",
      email: "",
      password: "test-password",
      confirm: "test-password",
    }).success,
    true,
  );
  assert.equal(
    authSchema.safeParse({
      kind: "reset-password",
      password: "test-password",
      confirm: "different-password",
    }).success,
    false,
  );
});
test("registration validates required name, password confirmation and local invitation redirect", () => {
  const valid = {
    kind: "register",
    name: "Test",
    email: "test@example.com",
    password: "test-password",
    confirm: "test-password",
  };
  assert.equal(authSchema.safeParse(valid).success, true);
  assert.equal(authSchema.safeParse({ ...valid, name: "" }).success, false);
  assert.equal(authSchema.safeParse({ ...valid, next: "https://example.com" }).success, false);
});
