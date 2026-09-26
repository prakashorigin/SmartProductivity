import test from "node:test";
import assert from "node:assert/strict";
import { getAnalyticsWindow, getEffectivePlan, getPlanLimits, getPlanSummary, isLimitReached } from "../src/services/subscriptionService.js";

test("free plan uses configurable limits with documented defaults", () => {
  const limits = getPlanLimits({ subscriptionPlan: "free", subscriptionStatus: "active" });
  assert.deepEqual(limits, { tasks: 50, projects: 3, focusSessionsPerDay: 5, analyticsDays: 7, customPomodoro: false });
});

test("inactive paid plans fall back to free access", () => {
  assert.equal(getEffectivePlan({ subscriptionPlan: "pro", subscriptionStatus: "past_due" }), "free");
  assert.equal(getEffectivePlan({ subscriptionPlan: "pro", subscriptionStatus: "active" }), "pro");
});

test("paid plan limits and summary reflect the active plan", () => {
  assert.deepEqual(getPlanLimits({ subscriptionPlan: "pro", subscriptionStatus: "active" }), { tasks: null, projects: null, focusSessionsPerDay: null, analyticsDays: 90, customPomodoro: true });
  assert.equal(getPlanSummary({ subscriptionPlan: "premium", subscriptionStatus: "active" }).limits.analyticsDays, null);
});

test("unlimited limits do not trip usage checks", () => {
  assert.equal(isLimitReached(50, 50), true);
  assert.equal(isLimitReached(50, 49), false);
  assert.equal(isLimitReached(null, 5000), false);
});

test("analytics ranges are capped by the active subscription", () => {
  assert.deepEqual(getAnalyticsWindow({ subscriptionPlan: "free", subscriptionStatus: "active" }, "90"), { days: 7, planLimit: 7 });
  assert.deepEqual(getAnalyticsWindow({ subscriptionPlan: "pro", subscriptionStatus: "active" }, "365"), { days: 90, planLimit: 90 });
  assert.deepEqual(getAnalyticsWindow({ subscriptionPlan: "premium", subscriptionStatus: "active" }, "all"), { days: null, planLimit: null });
});
