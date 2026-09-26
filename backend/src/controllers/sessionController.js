import mongoose from "mongoose";
import Session from "../models/Session.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Notification from "../models/Notification.js";
import { getAnalyticsWindow, getPlanLimits, isLimitReached } from "../services/subscriptionService.js";

const focusTypes = new Set(["focus", "study"]);
const breakTypes = new Set(["short_break", "long_break", "break"]);
const defaultDurations = { focus: 25, short_break: 5, long_break: 15, break: 5, study: 25 };

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// POST /api/sessions — store a completed focus or break session.
export const createSession = async (req, res) => {
  const body = req.body ?? {};
  const rawType = body.type || "focus";
  const type = rawType === "study" ? "focus" : rawType === "break" ? "short_break" : rawType;
  const plannedDuration = Number(body.plannedDuration ?? body.duration);
  const actualDuration = Number(body.actualDuration ?? body.duration);
  const completedAt = parseDate(body.completedAt) || new Date();
  const startedAt = parseDate(body.startedAt) || new Date(completedAt.getTime() - actualDuration * 60_000);

  if (!focusTypes.has(type) && !breakTypes.has(type)) {
    return res.status(400).json({ message: "Choose a valid focus or break session type." });
  }
  if (!Number.isFinite(plannedDuration) || plannedDuration <= 0 || plannedDuration > 24 * 60) {
    return res.status(400).json({ message: "Session duration must be between 1 minute and 24 hours." });
  }
  if (!Number.isFinite(actualDuration) || actualDuration < 0 || actualDuration > plannedDuration + 1) {
    return res.status(400).json({ message: "Actual session time must be between zero and the planned duration." });
  }
  if (startedAt > completedAt || completedAt > new Date(Date.now() + 60_000)) {
    return res.status(400).json({ message: "Session timestamps are invalid." });
  }
  const planLimits = getPlanLimits(req.user);
  if (!planLimits.customPomodoro && plannedDuration !== defaultDurations[type]) {
    return res.status(403).json({
      code: "PLAN_FEATURE_REQUIRED",
      message: "Custom focus and break lengths are available on Pro and Premium. The free plan uses 25/5/15 minute intervals.",
    });
  }
  const clientSessionId = typeof body.clientSessionId === "string" ? body.clientSessionId.trim() : null;
  if (clientSessionId && !/^[a-z0-9-]{8,100}$/i.test(clientSessionId)) {
    return res.status(400).json({ message: "Session identifier is invalid." });
  }

  try {
    if (clientSessionId) {
      const alreadySaved = await Session.findOne({ userId: req.user._id, clientSessionId });
      if (alreadySaved) return res.json(alreadySaved);
    }
    if (focusTypes.has(type)) {
      const dailyLimit = planLimits.focusSessionsPerDay;
      if (dailyLimit != null) {
        const dayStart = new Date();
        dayStart.setUTCHours(0, 0, 0, 0);
        const focusToday = await Session.countDocuments({
          userId: req.user._id,
          type: { $in: ["focus", "study"] },
          completedAt: { $gte: dayStart },
        });
        if (isLimitReached(dailyLimit, focusToday)) {
          return res.status(403).json({
            code: "PLAN_LIMIT_REACHED",
            message: `Your free plan includes ${dailyLimit} focus sessions per day. Upgrade for unlimited sessions.`,
          });
        }
      }
    }
    const relatedIds = [];
    if (body.taskId) {
      if (!mongoose.isValidObjectId(body.taskId) || !(await Task.exists({ _id: body.taskId, userId: req.user._id }))) {
        return res.status(400).json({ message: "The selected task was not found." });
      }
      relatedIds.push(["taskId", body.taskId]);
    }
    if (body.projectId) {
      if (!mongoose.isValidObjectId(body.projectId) || !(await Project.exists({ _id: body.projectId, userId: req.user._id }))) {
        return res.status(400).json({ message: "The selected project was not found." });
      }
      relatedIds.push(["projectId", body.projectId]);
    }

    const actualRounded = Number(actualDuration.toFixed(2));
    const session = await Session.create({
      userId: req.user._id,
      clientSessionId,
      type,
      duration: actualRounded,
      plannedDuration,
      actualDuration: actualRounded,
      startedAt,
      pausedAt: parseDate(body.pausedAt),
      resumedAt: parseDate(body.resumedAt),
      completedAt,
      date: completedAt,
      ...Object.fromEntries(relatedIds),
    });

    if (focusTypes.has(type) && body.taskId && actualRounded > 0) {
      await Task.updateOne(
        { _id: body.taskId, userId: req.user._id },
        { $inc: { actualMinutes: actualRounded } },
      );
    }
    if (focusTypes.has(type)) {
      await Notification.create({
        userId: req.user._id,
        type: "pomodoro_complete",
        title: "Focus session complete",
        message: `You completed a ${Number(actualRounded.toFixed(0))}-minute focus session. Take a moment before your next task.`,
        link: "/pomodoro",
      });
    }
    return res.status(201).json(session);
  } catch (error) {
    if (error.code === 11000 && clientSessionId) {
      const alreadySaved = await Session.findOne({ userId: req.user._id, clientSessionId });
      if (alreadySaved) return res.json(alreadySaved);
    }
    console.error(`[sessions.create] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't save this session. Please try again." });
  }
};

// GET /api/sessions
export const getSessions = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const sessions = await Session.find({ userId: req.user._id })
      .populate("taskId", "title")
      .populate("projectId", "name color")
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean();
    return res.json(sessions);
  } catch (error) {
    console.error(`[sessions.list] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load session history. Please try again." });
  }
};

// GET /api/sessions/analytics
export const getSessionAnalytics = async (req, res) => {
  try {
    const { days: analyticsDays, planLimit } = getAnalyticsWindow(req.user, req.query.days);
    const match = { userId: req.user._id };
    const allActiveDays = await Session.aggregate([
      { $match: { ...match, type: { $in: [...focusTypes] } } },
      { $project: { day: { $dateToString: { format: "%Y-%m-%d", date: { $ifNull: ["$completedAt", "$date"] }, timezone: "UTC" } }, minutes: { $ifNull: ["$actualDuration", "$duration"] } } },
      { $group: { _id: "$day", minutes: { $sum: "$minutes" } } },
      { $sort: { _id: 1 } },
    ]);

    const today = new Date();
    let rangeDays = analyticsDays;
    if (rangeDays === null) {
      const firstActivity = allActiveDays[0]?._id;
      rangeDays = firstActivity ? Math.min(3650, Math.max(1, Math.ceil((today - new Date(`${firstActivity}T00:00:00Z`)) / 86_400_000) + 1)) : 7;
    }
    const startDay = new Date(today);
    startDay.setUTCHours(0, 0, 0, 0);
    startDay.setUTCDate(startDay.getUTCDate() - (rangeDays - 1));
    const startKey = startDay.toISOString().slice(0, 10);
    const activeDays = allActiveDays.filter((item) => item._id >= startKey);
    const typeTotals = await Session.aggregate([
      { $match: match },
      { $project: { type: 1, day: { $dateToString: { format: "%Y-%m-%d", date: { $ifNull: ["$completedAt", "$date"] }, timezone: "UTC" } }, minutes: { $ifNull: ["$actualDuration", "$duration"] } } },
      { $match: { day: { $gte: startKey } } },
      { $group: { _id: "$type", minutes: { $sum: "$minutes" }, count: { $sum: 1 } } },
    ]);
    const totalFor = (types) => typeTotals.filter((item) => types.has(item._id)).reduce((sum, item) => sum + item.minutes, 0);
    const focusSessionCount = typeTotals.filter((item) => focusTypes.has(item._id)).reduce((sum, item) => sum + item.count, 0);
    const totalStudyMinutes = totalFor(focusTypes);
    const totalBreakMinutes = totalFor(breakTypes);
    const minutesByDay = new Map(activeDays.map((item) => [item._id, item.minutes]));
    const todayKey = today.toISOString().slice(0, 10);
    const dailyStudy = Array.from({ length: rangeDays }, (_, index) => {
      const day = new Date(startDay);
      day.setUTCDate(startDay.getUTCDate() + index);
      const date = day.toISOString().slice(0, 10);
      const minutes = Number((minutesByDay.get(date) || 0).toFixed(1));
      return { date, minutes, hours: Number((minutes / 60).toFixed(2)) };
    });

    const activityDays = [...minutesByDay.keys()].sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let previousDate = null;
    for (const dayKey of activityDays) {
      const currentDate = new Date(`${dayKey}T00:00:00Z`);
      const distance = previousDate ? (currentDate - previousDate) / 86_400_000 : 0;
      currentStreak = distance === 1 ? currentStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      previousDate = currentDate;
    }

    let streak = 0;
    const todayOrYesterday = [todayKey, new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)];
    let streakStart = minutesByDay.has(todayKey) ? todayKey : todayOrYesterday[1];
    while (minutesByDay.has(streakStart)) {
      streak++;
      streakStart = new Date(new Date(`${streakStart}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
    }

    const averageFocusMinutes = focusSessionCount ? Number((totalStudyMinutes / focusSessionCount).toFixed(1)) : 0;
    return res.json({
      totalStudyMinutes: Number(totalStudyMinutes.toFixed(1)),
      totalStudyHours: Number((totalStudyMinutes / 60).toFixed(1)),
      totalBreakMinutes: Number(totalBreakMinutes.toFixed(1)),
      totalSessions: focusSessionCount,
      averageFocusMinutes,
      streak,
      longestStreak,
      dailyStudy,
      rangeDays,
      analyticsLimitDays: planLimit,
    });
  } catch (error) {
    console.error(`[sessions.analytics] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load focus analytics. Please try again." });
  }
};
