import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { getAnalyticsWindow, getPlanLimits, isLimitReached } from "../services/subscriptionService.js";

const priorities = ["Low", "Medium", "High", "Urgent"];
const statuses = ["todo", "in_progress", "completed"];
const editableFields = [
  "title",
  "description",
  "priority",
  "status",
  "completed",
  "dueDate",
  "estimatedMinutes",
  "actualMinutes",
  "projectId",
  "tags",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const validId = (id) => mongoose.isValidObjectId(id);

const normalizeTask = (task) => {
  const input = {};
  for (const field of editableFields) {
    if (Object.hasOwn(task, field)) input[field] = task[field];
  }

  if (typeof input.title === "string") input.title = input.title.trim();
  if (typeof input.description === "string") input.description = input.description.trim();
  if (Array.isArray(input.tags)) {
    input.tags = [...new Set(input.tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12);
  }
  if (Object.hasOwn(input, "completed")) {
    input.status = input.completed ? "completed" : input.status === "completed" ? "todo" : input.status;
  }
  if (input.status) input.completed = input.status === "completed";
  return input;
};

const validateTaskInput = (input, { partial = false } = {}) => {
  if (!partial || Object.hasOwn(input, "title")) {
    if (typeof input.title !== "string" || input.title.length < 1 || input.title.length > 160) {
      return "Task title must be between 1 and 160 characters.";
    }
  }
  if (input.priority && !priorities.includes(input.priority)) {
    return "Choose a valid task priority.";
  }
  if (input.status && !statuses.includes(input.status)) {
    return "Choose a valid task status.";
  }
  for (const field of ["estimatedMinutes", "actualMinutes"]) {
    if (input[field] != null && (!Number.isFinite(Number(input[field])) || Number(input[field]) < 0)) {
      return `${field === "estimatedMinutes" ? "Estimated" : "Actual"} minutes must be zero or more.`;
    }
    if (input[field] != null) input[field] = Number(input[field]);
  }
  if (input.projectId && !validId(input.projectId)) return "Choose a valid project.";
  if (input.tags && (!Array.isArray(input.tags) || input.tags.length > 12)) {
    return "Tasks can have up to 12 tags.";
  }
  return null;
};

// POST /api/tasks
export const createTask = async (req, res) => {
  const input = normalizeTask(req.body ?? {});
  const invalid = validateTaskInput(input);
  if (invalid) return res.status(400).json({ message: invalid });

  try {
    const taskLimit = getPlanLimits(req.user).tasks;
    if (isLimitReached(taskLimit, await Task.countDocuments({ userId: req.user._id }))) {
      return res.status(403).json({
        code: "PLAN_LIMIT_REACHED",
        message: `Your free plan includes up to ${taskLimit} tasks. Upgrade your plan to add more.`,
      });
    }
    if (input.projectId) {
      const projectExists = await Project.exists({ _id: input.projectId, userId: req.user._id });
      if (!projectExists) return res.status(400).json({ message: "The selected project was not found." });
    }
    const task = await Task.create({ ...input, userId: req.user._id });
    return res.status(201).json(task);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Check the task details and try again." });
    }
    console.error(`[tasks.create] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't create this task. Please try again." });
  }
};

// GET /api/tasks
export const getTasks = async (req, res) => {
  try {
    const query = { userId: req.user._id };
    const { status, priority, projectId, search, dueFrom, dueTo } = req.query;
    if (statuses.includes(status)) query.status = status;
    else if (status === "active") query.completed = false;
    else if (status === "completed") query.completed = true;
    if (priorities.includes(priority)) query.priority = priority;
    if (projectId && validId(projectId)) query.projectId = projectId;
    if (search && String(search).trim()) {
      const matcher = new RegExp(escapeRegex(String(search).trim().slice(0, 100)), "i");
      query.$or = [{ title: matcher }, { description: matcher }, { tags: matcher }];
    }
    if (dueFrom || dueTo) {
      query.dueDate = {};
      if (dueFrom && !Number.isNaN(Date.parse(dueFrom))) query.dueDate.$gte = new Date(dueFrom);
      if (dueTo && !Number.isNaN(Date.parse(dueTo))) query.dueDate.$lte = new Date(dueTo);
    }

    const sortFields = { createdAt: "createdAt", dueDate: "dueDate", priority: "priority", title: "title" };
    const sortField = sortFields[req.query.sort] || "createdAt";
    const direction = req.query.order === "asc" ? 1 : -1;
    const sort = { [sortField]: direction, _id: direction };

    if (req.query.page || req.query.limit) {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
      const [items, total] = await Promise.all([
        Task.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
        Task.countDocuments(query),
      ]);
      return res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    }

    return res.json(await Task.find(query).sort(sort).lean());
  } catch (error) {
    console.error(`[tasks.list] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load your tasks. Please try again." });
  }
};

// PUT /api/tasks/:id
export const updateTask = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid task ID." });
  const input = normalizeTask(req.body ?? {});
  const invalid = validateTaskInput(input, { partial: true });
  if (invalid) return res.status(400).json({ message: invalid });

  try {
    if (input.projectId) {
      const projectExists = await Project.exists({ _id: input.projectId, userId: req.user._id });
      if (!projectExists) return res.status(400).json({ message: "The selected project was not found." });
    }
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: input },
      { new: true, runValidators: true },
    );
    if (!task) return res.status(404).json({ message: "Task not found." });
    return res.json(task);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Check the task details and try again." });
    }
    console.error(`[tasks.update] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't update this task. Please try again." });
  }
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid task ID." });
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ message: "Task not found." });
    return res.json({ message: "Task deleted." });
  } catch (error) {
    console.error(`[tasks.delete] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't delete this task. Please try again." });
  }
};

// GET /api/tasks/analytics
export const getAnalytics = async (req, res) => {
  try {
    const { days: analyticsDays, planLimit } = getAnalyticsWindow(req.user, req.query.days);
    const tasks = await Task.find({ userId: req.user._id }).select("completed priority status createdAt updatedAt").lean();
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const byPriority = Object.fromEntries(priorities.map((priority) => [priority.toLowerCase(), tasks.filter((task) => task.priority === priority).length]));
    const now = new Date();
    let rangeDays = analyticsDays;
    if (rangeDays === null) {
      const firstActivity = tasks.reduce((earliest, task) => !earliest || task.createdAt < earliest ? task.createdAt : earliest, null);
      rangeDays = firstActivity ? Math.min(3650, Math.max(1, Math.ceil((now - firstActivity) / 86_400_000) + 1)) : 7;
    }
    const endDay = new Date(now);
    endDay.setUTCHours(0, 0, 0, 0);
    const startDay = new Date(endDay);
    startDay.setUTCDate(endDay.getUTCDate() - (rangeDays - 1));
    const completionsByDay = new Map();
    for (const task of tasks) {
      if (!task.completed || !task.updatedAt) continue;
      const date = new Date(task.updatedAt).toISOString().slice(0, 10);
      completionsByDay.set(date, (completionsByDay.get(date) || 0) + 1);
    }
    const dailyCompleted = Array.from({ length: rangeDays }, (_, index) => {
      const day = new Date(startDay);
      day.setUTCDate(startDay.getUTCDate() + index);
      const date = day.toISOString().slice(0, 10);
      return {
        date,
        completed: completionsByDay.get(date) || 0,
      };
    });

    return res.json({
      total,
      completed,
      pending: total - completed,
      completionRate: total ? Number(((completed / total) * 100).toFixed(1)) : 0,
      highPriority: byPriority.high + byPriority.urgent,
      mediumPriority: byPriority.medium,
      lowPriority: byPriority.low,
      byPriority,
      dailyCompleted,
      rangeDays,
      analyticsLimitDays: planLimit,
    });
  } catch (error) {
    console.error(`[tasks.analytics] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load task analytics. Please try again." });
  }
};
