import express from "express";
import protect from "../middleware/authMiddleware.js";
import { createProject, deleteProject, listProjects, updateProject } from "../controllers/projectController.js";

const router = express.Router();

router.use(protect);
router.route("/").get(listProjects).post(createProject);
router.route("/:id").put(updateProject).delete(deleteProject);

export default router;
