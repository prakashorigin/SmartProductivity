import express from "express";
import protect from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  getAllUsers,
  deleteUser,
  getAdminAnalytics,
  updateUserRole,
  getAllTasks,
  getAuditLogs,
  setUserSuspension,
  getAllSubscriptions,
  getAdminSettings,
} from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require auth + admin/superadmin role
router.use(protect);
router.use(authorize("admin", "superadmin"));

router.get("/users", getAllUsers);
router.get("/tasks", getAllTasks);
router.get("/subscriptions", getAllSubscriptions);
router.get("/settings", getAdminSettings);
router.get("/audit-logs", authorize("superadmin"), getAuditLogs);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id/status", setUserSuspension);
router.put("/users/:id/role", authorize("superadmin"), updateUserRole);
router.get("/analytics", getAdminAnalytics);

export default router;
