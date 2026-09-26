import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getSessionAnalyticsAPI, getTaskAnalyticsAPI } from "../services/api";

const COLORS = ["#2563eb", "#f59e0b", "#16a34a", "#dc2626"];
const formatDay = (value, days) => {
  const date = new Date(`${value}T12:00:00`);
  return days <= 7
    ? date.toLocaleDateString(undefined, { weekday: "short" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function Analytics() {
  const { user } = useSelector((state) => state.auth);
  const plan = user?.subscriptionPlan || user?.subscription || "free";
  const [range, setRange] = useState("7");
  const [retryKey, setRetryKey] = useState(0);
  const [taskStats, setTaskStats] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getTaskAnalyticsAPI({ days: range }), getSessionAnalyticsAPI({ days: range })])
      .then(([taskResponse, sessionResponse]) => {
        if (!active) return;
        setTaskStats(taskResponse.data);
        setSessionStats(sessionResponse.data);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "We couldn't load your analytics. Try again.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, retryKey]);

  const taskPieData = taskStats ? [
    { name: "Completed", value: taskStats.completed },
    { name: "Pending", value: taskStats.pending },
  ] : [];
  const priorityData = taskStats ? [
    { name: "High", count: taskStats.highPriority },
    { name: "Medium", count: taskStats.mediumPriority },
    { name: "Low", count: taskStats.lowPriority },
  ] : [];
  const studyData = sessionStats?.dailyStudy || [];
  const dayLimit = sessionStats?.analyticsLimitDays;
  const clamped = dayLimit != null && (range === "all" || Number(range) > dayLimit);

  if (loading && !sessionStats) {
    return <div className="mx-auto max-w-7xl" role="status" aria-label="Loading analytics"><div className="mb-6 h-9 w-56 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" /><div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((key) => <div key={key} className="h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />)}</div><div className="grid gap-5 lg:grid-cols-2">{[1, 2].map((key) => <div key={key} className="h-80 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />)}</div></div>;
  }

  return <section className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Your progress, in context</p><h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Productivity analytics</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">See how your focus time and completed work change over time.</p></div><label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Date range<select aria-label="Analytics date range" value={range} onChange={(event) => { setLoading(true); setRange(event.target.value); }} className="mt-1 block min-w-40 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium normal-case text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"><option value="7">Last 7 days</option><option value="30" disabled={plan === "free"}>Last 30 days{plan === "free" ? " · Pro" : ""}</option><option value="90" disabled={plan === "free"}>Last 90 days{plan === "free" ? " · Pro" : ""}</option><option value="365" disabled={plan !== "premium"}>Last 365 days{plan !== "premium" ? " · Premium" : ""}</option><option value="all" disabled={plan !== "premium"}>All history{plan !== "premium" ? " · Premium" : ""}</option></select></label></header>

    {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setRetryKey((key) => key + 1); }} className="font-semibold underline">Retry</button></div>}
    {clamped && <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><span>Your current plan includes {dayLimit} days of analytics. The charts are limited to that range.</span><Link to="/pricing" className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Compare plans</Link></div>}

    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><MiniStat label="Total tasks" value={taskStats?.total || 0} color="text-blue-600" /><MiniStat label="Completion rate" value={`${taskStats?.completionRate || 0}%`} color="text-green-600" /><MiniStat label="Study hours" value={sessionStats?.totalStudyHours || 0} color="text-purple-600" /><MiniStat label="Current streak" value={`${sessionStats?.streak || 0} days`} color="text-orange-500" /></div>

    <div className="mb-6 grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"><h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Task completion</h2>{taskPieData.every((entry) => entry.value === 0) ? <ChartEmpty message="Add and complete tasks to see your progress." /> : <div aria-label="Task completion chart" role="img"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={taskPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label={({ name, value }) => `${name}: ${value}`}>{taskPieData.map((_, index) => <Cell key={index} fill={COLORS[index]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer><p className="sr-only">{taskStats.completed} completed tasks and {taskStats.pending} pending tasks.</p></div>}</article>
      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"><h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Priority distribution</h2>{priorityData.every((entry) => entry.count === 0) ? <ChartEmpty message="Task priorities will appear here when you add work." /> : <div aria-label="Task priority chart" role="img"><ResponsiveContainer width="100%" height={250}><BarChart data={priorityData}><CartesianGrid strokeDasharray="3 3" opacity={0.12} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>}</article></div>

    <article className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"><div className="mb-4"><h2 className="font-semibold text-gray-900 dark:text-white">Daily focus time</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{range === "all" ? "All available session history" : `Last ${sessionStats?.rangeDays || range} days`}</p></div>{studyData.every((entry) => entry.minutes === 0) ? <ChartEmpty message="Completed focus sessions will appear here." /> : <div aria-label="Daily focus time chart" role="img"><ResponsiveContainer width="100%" height={280}><BarChart data={studyData} margin={{ left: -20, right: 8 }}><CartesianGrid strokeDasharray="3 3" opacity={0.12} /><XAxis dataKey="date" tickFormatter={(value) => formatDay(value, sessionStats?.rangeDays || 7)} minTickGap={24} /><YAxis allowDecimals={false} /><Tooltip labelFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString()} formatter={(value) => [`${value} minutes`, "Focus time"]} /><Bar dataKey="minutes" name="Focus time" fill="#4f46e5" radius={[5, 5, 0, 0]} maxBarSize={40} /></BarChart></ResponsiveContainer><p className="sr-only">{studyData.reduce((sum, entry) => sum + entry.minutes, 0)} minutes of focus time across {studyData.length} days.</p></div>}</article>

    {taskStats?.dailyCompleted && <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"><h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Daily task completions</h2>{taskStats.dailyCompleted.every((entry) => entry.completed === 0) ? <ChartEmpty message="Completed tasks will appear here." /> : <ResponsiveContainer width="100%" height={250}><BarChart data={taskStats.dailyCompleted}><CartesianGrid strokeDasharray="3 3" opacity={0.12} /><XAxis dataKey="date" tickFormatter={(value) => formatDay(value, taskStats.rangeDays || 7)} minTickGap={24} /><YAxis allowDecimals={false} /><Tooltip labelFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString()} /><Bar dataKey="completed" name="Completed tasks" fill="#16a34a" radius={[5, 5, 0, 0]} maxBarSize={40} /></BarChart></ResponsiveContainer>}</article>}
  </section>;
}

function ChartEmpty({ message }) {
  return <div className="flex h-[250px] items-center justify-center rounded-xl bg-gray-50 px-5 text-center text-sm text-gray-500 dark:bg-gray-700/40 dark:text-gray-400">{message}</div>;
}

function MiniStat({ label, value, color }) {
  return <article className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"><p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p></article>;
}

export default Analytics;
