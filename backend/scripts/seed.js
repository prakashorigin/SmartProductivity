import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import User from "../src/models/User.js";
import Project from "../src/models/Project.js";
import Task from "../src/models/Task.js";
import Session from "../src/models/Session.js";
import Notification from "../src/models/Notification.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const seed = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The demo seed is disabled in production.");
  }
  const demoPassword = process.env.DEMO_USER_PASSWORD || "";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "";
  if (demoPassword.length < 12 || adminPassword.length < 12) {
    throw new Error("Set unique DEMO_USER_PASSWORD and DEMO_ADMIN_PASSWORD values of at least 12 characters in backend/.env before seeding.");
  }

  await connectDatabase();
  const demoEmail = (process.env.DEMO_USER_EMAIL || "student@smartproductivity.local").toLowerCase();
  const adminEmail = (process.env.DEMO_ADMIN_EMAIL || "admin@smartproductivity.local").toLowerCase();
  const demoPasswordHash = await bcrypt.hash(demoPassword, 12);
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  let demoUser = await User.findOne({ email: demoEmail });
  const demoUserCreated = !demoUser;
  if (!demoUser) {
    demoUser = await User.create({ name: "Demo Student", email: demoEmail, password: demoPasswordHash, role: "user" });
  }

  let adminUser = await User.findOne({ email: adminEmail });
  const adminUserCreated = !adminUser;
  if (!adminUser) {
    adminUser = await User.create({ name: "Demo Admin", email: adminEmail, password: adminPasswordHash, role: "superadmin" });
  }

  const projectDefinitions = [
    { name: "Study plan", description: "A sample project for planning this week's study sessions.", color: "#4f46e5" },
    { name: "Personal goals", description: "A place for habits and personal tasks.", color: "#0f766e" },
  ];
  const projects = [];
  for (const definition of projectDefinitions) {
    let project = await Project.findOne({ userId: demoUser._id, name: definition.name });
    if (!project) project = await Project.create({ ...definition, userId: demoUser._id });
    projects.push(project);
  }

  const taskDefinitions = [
    { title: "Review biology notes", description: "Read the cell structure chapter and write a short summary.", priority: "High", status: "todo", projectId: projects[0]._id, estimatedMinutes: 40, tags: ["study"] },
    { title: "Practice JavaScript arrays", description: "Complete a few map and filter exercises.", priority: "Medium", status: "in_progress", projectId: projects[0]._id, estimatedMinutes: 30, tags: ["coding"] },
    { title: "Plan tomorrow", description: "Choose the three most important tasks for the day.", priority: "Low", status: "completed", completed: true, projectId: projects[1]._id, estimatedMinutes: 10, tags: ["planning"] },
  ];
  const tasks = [];
  for (const definition of taskDefinitions) {
    let task = await Task.findOne({ userId: demoUser._id, title: definition.title });
    if (!task) task = await Task.create({ ...definition, userId: demoUser._id });
    tasks.push(task);
  }

  const hasSessions = await Session.exists({ userId: demoUser._id });
  if (!hasSessions) {
    const completedAt = new Date(Date.now() - 25 * 60_000);
    await Session.create({
      userId: demoUser._id,
      taskId: tasks[1]._id,
      projectId: projects[0]._id,
      clientSessionId: `seed-${demoUser._id}-focus-1`,
      type: "focus",
      duration: 25,
      plannedDuration: 25,
      actualDuration: 25,
      startedAt: completedAt,
      completedAt: new Date(),
      date: new Date(),
    });
  }

  await Notification.updateOne(
    { userId: demoUser._id, dedupeKey: "seed:welcome" },
    { $setOnInsert: { type: "system", title: "Welcome to SmartProductivity", message: "Your demo workspace is ready. Add a task and start a focus session.", link: "/dashboard", readAt: null } },
    { upsert: true },
  );

  console.log("Demo data is ready.");
  console.log(demoUserCreated
    ? `Demo student account created (${demoEmail}); use the password configured in backend/.env.`
    : `Demo student account already exists; its password was left unchanged (${demoEmail}).`);
  console.log(adminUserCreated
    ? `Demo admin account created (${adminEmail}); use the password configured in backend/.env.`
    : `Demo admin account already exists; its password was left unchanged (${adminEmail}).`);
};

try {
  await seed();
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDatabase().catch(() => {});
}
