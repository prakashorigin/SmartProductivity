import Notification from "../models/Notification.js";
import Task from "../models/Task.js";

const refreshDueTaskNotifications = async (userId) => {
  const now = new Date();
  const endOfTomorrow = new Date(now);
  endOfTomorrow.setDate(now.getDate() + 1);
  endOfTomorrow.setHours(23, 59, 59, 999);

  const tasks = await Task.find({
    userId,
    completed: false,
    dueDate: { $lte: endOfTomorrow },
  }).sort({ dueDate: 1 }).limit(200).select("title dueDate").lean();

  await Promise.all(tasks.map((task) => {
    const overdue = new Date(task.dueDate) < now;
    const type = overdue ? "task_overdue" : "task_due";
    const dedupeKey = `task:${task._id}:${new Date(task.dueDate).toISOString()}`;
    return Notification.updateOne(
      { userId, dedupeKey },
      {
        $set: {
          type,
          title: overdue ? "Task is overdue" : "Task due soon",
          message: overdue ? `“${task.title}” is past its due date.` : `“${task.title}” is due within the next day.`,
          link: "/tasks",
          taskId: task._id,
        },
        $setOnInsert: { userId, dedupeKey, readAt: null },
      },
      { upsert: true },
    );
  }));
};

export const listNotifications = async (req, res) => {
  try {
    await refreshDueTaskNotifications(req.user._id);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = { userId: req.user._id };
    if (req.query.search && String(req.query.search).trim()) {
      const matcher = new RegExp(String(req.query.search).trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: matcher }, { message: matcher }];
    }
    const [items, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, readAt: null }),
    ]);
    return res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, unreadCount });
  } catch (error) {
    console.error(`[notifications.list] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load notifications. Please try again." });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    return res.json(notification);
  } catch (error) {
    console.error(`[notifications.read] ${error.name}.`);
    return res.status(400).json({ message: "We couldn't update that notification." });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    return res.json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error(`[notifications.readAll] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't update notifications. Please try again." });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const result = await Notification.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ message: "Notification not found." });
    return res.json({ message: "Notification deleted." });
  } catch (error) {
    console.error(`[notifications.delete] ${error.name}.`);
    return res.status(400).json({ message: "We couldn't delete that notification." });
  }
};
