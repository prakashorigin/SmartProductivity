import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getAnalytics,
} from "../controllers/taskController.js";

const router = express.Router();

// Analytics must come before /:id to avoid route conflict
router.get("/analytics", protect, getAnalytics);

router.route("/").post(protect, createTask).get(protect, getTasks);

router.route("/:id").put(protect, updateTask).delete(protect, deleteTask);

export default router;
