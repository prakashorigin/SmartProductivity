import mongoose from "mongoose";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import { getPlanLimits, isLimitReached } from "../services/subscriptionService.js";

const projectInput = (body) => {
  const input = {};
  for (const key of ["name", "description", "color", "icon", "status", "deadline"]) {
    if (Object.hasOwn(body, key)) input[key] = body[key];
  }
  if (typeof input.name === "string") input.name = input.name.trim();
  if (typeof input.description === "string") input.description = input.description.trim();
  return input;
};

const validId = (id) => mongoose.isValidObjectId(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listProjects = async (req, res) => {
  try {
    const query = { userId: req.user._id };
    if (req.query.search && String(req.query.search).trim()) {
      const matcher = new RegExp(escapeRegex(String(req.query.search).trim().slice(0, 100)), "i");
      query.$or = [{ name: matcher }, { description: matcher }];
    }
    const [projects, taskCounts] = await Promise.all([
      Project.find(query).sort({ updatedAt: -1 }).lean(),
      Task.aggregate([
        { $match: { userId: req.user._id } },
        {
          $group: {
            _id: "$projectId",
            total: { $sum: 1 },
            completed: { $sum: { $cond: ["$completed", 1, 0] } },
          },
        },
      ]),
    ]);

    const countsByProject = new Map(taskCounts.map((entry) => [String(entry._id), entry]));
    return res.json(
      projects.map((project) => {
        const counts = countsByProject.get(String(project._id)) ?? { total: 0, completed: 0 };
        return {
          ...project,
          taskCount: counts.total,
          completedCount: counts.completed,
          progress: counts.total ? Math.round((counts.completed / counts.total) * 100) : 0,
        };
      }),
    );
  } catch (error) {
    console.error(`[projects.list] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load your projects. Please try again." });
  }
};

export const createProject = async (req, res) => {
  const input = projectInput(req.body ?? {});
  if (typeof input.name !== "string" || input.name.length < 2 || input.name.length > 80) {
    return res.status(400).json({ message: "Project name must be between 2 and 80 characters." });
  }
  try {
    const projectLimit = getPlanLimits(req.user).projects;
    if (isLimitReached(projectLimit, await Project.countDocuments({ userId: req.user._id }))) {
      return res.status(403).json({
        code: "PLAN_LIMIT_REACHED",
        message: `Your free plan includes up to ${projectLimit} projects. Upgrade your plan to add more.`,
      });
    }
    const project = await Project.create({ ...input, userId: req.user._id });
    return res.status(201).json(project);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Check the project details and try again." });
    }
    console.error(`[projects.create] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't create this project. Please try again." });
  }
};

export const updateProject = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid project ID." });
  const input = projectInput(req.body ?? {});
  if (Object.hasOwn(input, "name") && (input.name.length < 2 || input.name.length > 80)) {
    return res.status(400).json({ message: "Project name must be between 2 and 80 characters." });
  }
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: input },
      { new: true, runValidators: true },
    );
    if (!project) return res.status(404).json({ message: "Project not found." });
    return res.json(project);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Check the project details and try again." });
    }
    console.error(`[projects.update] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't update this project. Please try again." });
  }
};

export const deleteProject = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid project ID." });
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ message: "Project not found." });
    await Task.updateMany({ userId: req.user._id, projectId: project._id }, { $unset: { projectId: 1 } });
    return res.json({ message: "Project deleted. Its tasks were kept in your task list." });
  } catch (error) {
    console.error(`[projects.delete] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't delete this project. Please try again." });
  }
};
