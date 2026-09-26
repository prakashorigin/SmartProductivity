import test from "node:test";
import assert from "node:assert/strict";
import { authValidation } from "../src/controllers/auth.controller.js";
import { registerUser, resetPassword } from "../src/controllers/auth.controller.js";

const responseRecorder = () => {
  const response = { statusCode: 200, body: null };
  response.status = (status) => { response.statusCode = status; return response; };
  response.json = (body) => { response.body = body; return response; };
  return response;
};

test("email normalization trims whitespace and folds case", () => {
  assert.equal(authValidation.normalizeEmail("  Student@Example.COM "), "student@example.com");
});

test("password validation accepts supported lengths and rejects bcrypt overflow", () => {
  assert.equal(authValidation.validPassword("12345678"), true);
  assert.equal(authValidation.validPassword("short"), false);
  assert.equal(authValidation.validPassword("a".repeat(73)), false);
  assert.equal(authValidation.validPassword("é".repeat(36)), true);
  assert.equal(authValidation.validPassword("é".repeat(37)), false);
});

test("registration returns a clear validation response when required fields are missing", async () => {
  const response = responseRecorder();
  await registerUser({ body: { name: "", email: "", password: "" } }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, "REQUIRED_FIELDS");
  assert.match(response.body.message, /name, email address, and password/i);
});

test("registration rejects an invalid email before accessing the database", async () => {
  const response = responseRecorder();
  await registerUser({ body: { name: "Student", email: "invalid", password: "password123" } }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, "INVALID_EMAIL");
});

test("password reset rejects malformed or short requests before database access", async () => {
  const badTokenResponse = responseRecorder();
  await resetPassword({ params: { token: "bad" }, body: { password: "password123" } }, badTokenResponse);
  assert.equal(badTokenResponse.statusCode, 400);
  assert.match(badTokenResponse.body.message, /link is invalid or expired/i);

  const weakPasswordResponse = responseRecorder();
  await resetPassword({ params: { token: "a".repeat(64) }, body: { password: "short" } }, weakPasswordResponse);
  assert.equal(weakPasswordResponse.statusCode, 400);
  assert.match(weakPasswordResponse.body.message, /at least 8 characters/i);
});
