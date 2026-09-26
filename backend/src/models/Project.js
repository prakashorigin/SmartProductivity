import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    color: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: "#4f46e5" },
    icon: { type: String, trim: true, maxlength: 32, default: "folder" },
    status: { type: String, enum: ["active", "completed", "archived"], default: "active" },
    deadline: { type: Date, default: null },
  },
  { timestamps: true },
);

projectSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("Project", projectSchema);
