import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import path from "node:path";

const enabled = process.env.RUN_INTEGRATION === "1";
const backendRoot = fileURLToPath(new URL("..", import.meta.url));
const serverEntry = path.join(backendRoot, "dist", "server.js");
const testPassword = "IntegrationPass123!";

const availablePort = async () => {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
};

const request = (base, method, route, { token, body } = {}) => fetch(`${base}${route}`, {
  method,
  headers: {
    ...(body ? { "content-type": "application/json" } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

test("Mongo-backed API supports auth, owner-scoped data, focus idempotency, and account removal", {
  skip: !enabled && "Set RUN_INTEGRATION=1 and MONGO_URI to a disposable test database.",
  timeout: 90_000,
}, async (t) => {
  const port = await availablePort();
  const base = `http://127.0.0.1:${port}`;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `integration-a-${runId}@example.invalid`;
  const emailB = `integration-b-${runId}@example.invalid`;
  const output = [];
  let tokenA = "";
  let tokenB = "";
  let passwordA = testPassword;
  let child;

  try {
    child = spawn(process.execPath, [serverEntry], {
      cwd: backendRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(port),
        JWT_SECRET: process.env.JWT_SECRET || "smartproductivity-integration-test-secret-only",
        MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smartproductivity_test",
        FRONTEND_URL: "http://localhost:4000",
        SMTP_HOST: "",
        SMTP_FROM: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => output.push(String(chunk)));
    child.stderr.on("data", (chunk) => output.push(String(chunk)));

    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null) break;
      try {
        const health = await fetch(`${base}/health`);
        if (health.ok && (await health.json()).database === "connected") { ready = true; break; }
      } catch { /* The API is still starting. */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.equal(ready, true, `API failed to become healthy:\n${output.join("")}`);

    const apiHealth = await fetch(`${base}/api/health`);
    assert.equal(apiHealth.status, 200);
    assert.equal((await apiHealth.json()).database, "connected");
    const missingRoute = await fetch(`${base}/api/not-a-route`);
    assert.equal(missingRoute.status, 404);
    assert.equal((await missingRoute.json()).code, "NOT_FOUND");

    const invalidRegistration = await request(base, "POST", "/api/auth/register", {
      body: { name: "S", email: "not-an-email", password: "short", confirmPassword: "different" },
    });
    assert.equal(invalidRegistration.status, 400);
    assert.equal((await invalidRegistration.json()).code, "VALIDATION_FAILED");

    const registrationA = await request(base, "POST", "/api/auth/register", { body: { name: "Integration Student A", email: ` ${emailA.toUpperCase()} `, password: testPassword } });
    assert.equal(registrationA.status, 201);
    const accountA = await registrationA.json();
    tokenA = accountA.token;
    assert.equal(accountA.email, emailA);
    assert.equal(accountA.emailVerified, false);
    assert.equal("password" in accountA, false);
    const currentUser = await request(base, "GET", "/api/auth/me", { token: tokenA });
    assert.equal(currentUser.status, 200);
    assert.equal((await currentUser.json()).data.id, accountA._id);
    assert.equal((await request(base, "GET", "/api/auth/me")).status, 401);

    const duplicate = await request(base, "POST", "/api/auth/register", { body: { name: "Another Student", email: emailA, password: testPassword } });
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).code, "EMAIL_IN_USE");

    const badLogin = await request(base, "POST", "/api/auth/login", { body: { email: emailA, password: "wrong-password" } });
    assert.equal(badLogin.status, 401);
    const registrationB = await request(base, "POST", "/api/auth/register", { body: { name: "Integration Student B", email: emailB, password: testPassword } });
    assert.equal(registrationB.status, 201);
    tokenB = (await registrationB.json()).token;
    assert.equal((await request(base, "POST", "/api/auth/logout", { token: tokenB })).status, 200);
    assert.equal((await request(base, "GET", "/api/auth/me", { token: tokenB })).status, 401);
    tokenB = (await (await request(base, "POST", "/api/auth/login", { body: { email: emailB, password: testPassword } })).json()).token;

    const deniedAdmin = await request(base, "GET", "/api/admin/analytics", { token: tokenB });
    assert.equal(deniedAdmin.status, 403);

    const projectResponse = await request(base, "POST", "/api/projects", { token: tokenA, body: { name: "Integration project", color: "#4f46e5" } });
    assert.equal(projectResponse.status, 201);
    const project = await projectResponse.json();
    assert.equal((await (await request(base, "GET", "/api/projects", { token: tokenB })).json()).length, 0);
    assert.equal((await request(base, "DELETE", `/api/projects/${project._id}`, { token: tokenB })).status, 404);

    const taskResponse = await request(base, "POST", "/api/tasks", { token: tokenA, body: { title: "Scoped integration task", projectId: project._id, priority: "High" } });
    assert.equal(taskResponse.status, 201);
    const task = await taskResponse.json();
    assert.equal((await (await request(base, "GET", "/api/tasks", { token: tokenB })).json()).length, 0);
    assert.equal((await request(base, "PUT", `/api/tasks/${task._id}`, { token: tokenB, body: { title: "Unauthorized update" } })).status, 404);

    const completedAt = new Date();
    const sessionBody = {
      clientSessionId: `integration-${runId}`,
      type: "focus",
      plannedDuration: 25,
      actualDuration: 1,
      duration: 1,
      startedAt: new Date(completedAt.getTime() - 60_000).toISOString(),
      completedAt: completedAt.toISOString(),
      taskId: task._id,
    };
    const customSession = await request(base, "POST", "/api/sessions", { token: tokenA, body: { ...sessionBody, clientSessionId: `custom-${runId}`, plannedDuration: 2, actualDuration: 2, duration: 2 } });
    assert.equal(customSession.status, 403);
    assert.equal((await customSession.json()).code, "PLAN_FEATURE_REQUIRED");
    const firstSession = await request(base, "POST", "/api/sessions", { token: tokenA, body: sessionBody });
    assert.equal(firstSession.status, 201);
    const duplicateSession = await request(base, "POST", "/api/sessions", { token: tokenA, body: sessionBody });
    assert.equal(duplicateSession.status, 200);
    const oldCompletedAt = new Date(Date.now() - 8 * 86_400_000);
    const oldSession = await request(base, "POST", "/api/sessions", {
      token: tokenA,
      body: {
        clientSessionId: `old-session-${runId}`,
        type: "focus",
        plannedDuration: 25,
        actualDuration: 3,
        duration: 3,
        startedAt: new Date(oldCompletedAt.getTime() - 3 * 60_000).toISOString(),
        completedAt: oldCompletedAt.toISOString(),
      },
    });
    assert.equal(oldSession.status, 201);
    const notifications = await (await request(base, "GET", "/api/notifications", { token: tokenA })).json();
    assert.equal(notifications.items.some((item) => item.type === "pomodoro_complete"), true);
    const [sessionAnalyticsResponse, taskAnalyticsResponse] = await Promise.all([
      request(base, "GET", "/api/sessions/analytics?days=90", { token: tokenA }),
      request(base, "GET", "/api/tasks/analytics?days=90", { token: tokenA }),
    ]);
    assert.equal(sessionAnalyticsResponse.status, 200);
    assert.equal(taskAnalyticsResponse.status, 200);
    const sessionAnalytics = await sessionAnalyticsResponse.json();
    const taskAnalytics = await taskAnalyticsResponse.json();
    assert.equal(sessionAnalytics.totalSessions, 1);
    assert.equal(sessionAnalytics.totalStudyMinutes, 1);
    assert.equal(sessionAnalytics.rangeDays, 7);
    assert.equal(sessionAnalytics.dailyStudy.length, 7);
    assert.equal(taskAnalytics.rangeDays, 7);
    assert.equal(taskAnalytics.analyticsLimitDays, 7);

    const resetRequest = await request(base, "POST", "/api/auth/forgot-password", { body: { email: emailA } });
    assert.equal(resetRequest.status, 200);
    assert.match((await resetRequest.json()).message, /if an account exists/i);

    const oldToken = tokenA;
    const changedPassword = "ChangedIntegrationPass123!";
    const passwordUpdate = await request(base, "PUT", "/api/auth/profile", { token: tokenA, body: { password: changedPassword } });
    assert.equal(passwordUpdate.status, 200);
    tokenA = (await passwordUpdate.json()).token;
    passwordA = changedPassword;
    assert.equal((await request(base, "GET", "/api/auth/profile", { token: oldToken })).status, 401);
    assert.equal((await request(base, "GET", "/api/auth/profile", { token: tokenA })).status, 200);

    const wrongDelete = await request(base, "DELETE", "/api/auth/account", { token: tokenA, body: { password: testPassword } });
    assert.equal(wrongDelete.status, 401);
    const deleteA = await request(base, "DELETE", "/api/auth/account", { token: tokenA, body: { password: passwordA } });
    assert.equal(deleteA.status, 200);
    tokenA = "";
    const deleteB = await request(base, "DELETE", "/api/auth/account", { token: tokenB, body: { password: testPassword } });
    assert.equal(deleteB.status, 200);
    tokenB = "";
  } finally {
    if (tokenA) await request(base, "DELETE", "/api/auth/account", { token: tokenA, body: { password: passwordA } }).catch(() => {});
    if (tokenB) await request(base, "DELETE", "/api/auth/account", { token: tokenB, body: { password: testPassword } }).catch(() => {});
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
    }
  }
});
