const numericSetting = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const getPlans = () => ({
  free: {
    tasks: numericSetting("FREE_TASK_LIMIT", 50),
    projects: numericSetting("FREE_PROJECT_LIMIT", 3),
    focusSessionsPerDay: numericSetting("FREE_FOCUS_SESSIONS_PER_DAY", 5),
    analyticsDays: numericSetting("FREE_ANALYTICS_DAYS", 7),
    customPomodoro: false,
  },
  pro: { tasks: null, projects: null, focusSessionsPerDay: null, analyticsDays: 90, customPomodoro: true },
  premium: { tasks: null, projects: null, focusSessionsPerDay: null, analyticsDays: null, customPomodoro: true },
});

export const getEffectivePlan = (user) => {
  const requestedPlan = user.subscriptionPlan || user.subscription || "free";
  const subscriptionActive = ["active", "trialing"].includes(user.subscriptionStatus || "active");
  return requestedPlan !== "free" && !subscriptionActive ? "free" : requestedPlan;
};

export const getPlanLimits = (user) => {
  const plans = getPlans();
  return plans[getEffectivePlan(user)] || plans.free;
};

export const getPlanSummary = (user) => ({
  plan: getEffectivePlan(user),
  subscriptionStatus: user.subscriptionStatus || "active",
  currentPeriodEnd: user.currentPeriodEnd || null,
  limits: getPlanLimits(user),
});

export const isLimitReached = (limit, currentUsage) => limit != null && currentUsage >= limit;

export const getAnalyticsWindow = (user, requestedDays) => {
  const planLimit = getPlanLimits(user).analyticsDays;
  if (requestedDays === "all" && planLimit === null) return { days: null, planLimit };
  const requested = Number.parseInt(requestedDays, 10);
  const normalized = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 3650) : 7;
  return { days: Math.max(1, Math.min(normalized, planLimit ?? 3650)), planLimit };
};
