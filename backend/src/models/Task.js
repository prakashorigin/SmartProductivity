import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    priority: { type: String, enum: ["Low", "Medium", "High", "Urgent"], default: "Medium" },
    status: { type: String, enum: ["todo", "in_progress", "completed"], default: "todo" },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date, default: null },
    estimatedMinutes: { type: Number, min: 0, max: 100000, default: null },
    actualMinutes: { type: Number, min: 0, max: 100000, default: 0 },
    tags: { type: [{ type: String, trim: true, maxlength: 32 }], default: [] },
  },
  { timestamps: true },
);

taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, dueDate: 1, status: 1 });
taskSchema.index({ userId: 1, projectId: 1, status: 1 });

export default mongoose.model("Task", taskSchema);
