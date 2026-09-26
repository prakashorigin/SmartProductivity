import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    clientSessionId: { type: String, trim: true, maxlength: 100, default: null },
    type: {
      type: String,
      enum: ["focus", "short_break", "long_break", "study", "break"],
      default: "focus",
      index: true,
    },
    duration: { type: Number, required: true, min: 0 }, // completed minutes, retained for older clients
    plannedDuration: { type: Number, min: 0 }, // minutes
    actualDuration: { type: Number, min: 0 }, // minutes excluding paused time
    startedAt: { type: Date, required: true },
    pausedAt: { type: Date, default: null },
    resumedAt: { type: Date, default: null },
    completedAt: { type: Date, required: true },
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

sessionSchema.index({ userId: 1, startedAt: -1 });
sessionSchema.index({ userId: 1, type: 1, completedAt: -1 });
sessionSchema.index(
  { userId: 1, clientSessionId: 1 },
  { unique: true, partialFilterExpression: { clientSessionId: { $type: "string" } } },
);

export default mongoose.model("Session", sessionSchema);
