import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, BellRing, CalendarClock, CheckCircle2, Clock3, FolderPlus, ListPlus, Timer, TrendingUp } from "lucide-react";
import { fetchTasks } from "../store/taskSlice";
import { fetchProfile } from "../store/authSlice";
import { getSessionAnalyticsAPI, getSessionsAPI, resendVerificationAPI } from "../services/api";

const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items: tasks, loading: tasksLoading, error: tasksError } = useSelector((state) => state.tasks);
  const [sessionStats, setSessionStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [statsError, setStatsError] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const todayKey = dayKey(new Date());

  const loadOverview = useCallback(() => {
    setStatsError("");
    Promise.all([getSessionAnalyticsAPI(), getSessionsAPI({ limit: 5 })])
      .then(([stats, sessions]) => { setSessionStats(stats.data); setRecentSessions(sessions.data); })
      .catch((error) => setStatsError(error.response?.data?.message || "Focus activity is temporarily unavailable."));
  }, []);

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchProfile());
    loadOverview();
  }, [dispatch, loadOverview]);

  const todayTasks = useMemo(() => tasks.filter((task) => task.dueDate && dayKey(new Date(task.dueDate)) === todayKey), [tasks, todayKey]);
  const completedTasks = tasks.filter((task) => task.completed || task.status === "completed").length;
  const pendingTasks = tasks.length - completedTasks;
  const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const completedToday = todayTasks.filter((task) => task.completed || task.status === "completed").length;
  const upcomingTasks = tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) >= new Date()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);
  const recentTasks = [...tasks].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)).slice(0, 5);

  const resendVerification = async () => {
    setVerificationBusy(true);
    setVerificationMessage("");
    try {
      const { data } = await resendVerificationAPI();
      setVerificationMessage(data.message);
    } catch (error) {
      setVerificationMessage(error.response?.data?.message || "We couldn't send a verification link. Please try again.");
    } finally {
      setVerificationBusy(false);
    }
  };

  return <section className="mx-auto max-w-7xl">
    {user?.emailVerified === false && <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><BellRing size={18} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" /><div><p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Verify your email address</p><p role="status" className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">{verificationMessage || `Your email address (${user.email}) has not been verified. Request a new link if you can't find the message.`}</p></div></div><button type="button" onClick={resendVerification} disabled={verificationBusy} className="shrink-0 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-900/40">{verificationBusy ? "Sending…" : "Resend verification"}</button></div>}

    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p><h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Welcome back, {user?.name || "there"}</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">A clear plan makes it easier to get started.</p></div><div className="flex flex-wrap gap-2"><Link to="/tasks?create=1" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-indigo-700"><ListPlus size={16} aria-hidden="true" /> Add task</Link><Link to="/pomodoro" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 no-underline hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"><Timer size={16} aria-hidden="true" /> Start focus</Link><Link to="/projects?create=1" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 no-underline hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"><FolderPlus size={16} aria-hidden="true" /> New project</Link><Link to="/analytics" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 no-underline hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"><TrendingUp size={16} aria-hidden="true" /> Analytics</Link></div></header>

    {(tasksError || statsError) && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"><span>{tasksError || statsError}</span><button type="button" onClick={() => { dispatch(fetchTasks()); loadOverview(); }} className="font-semibold underline">Retry</button></div>}

    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5"><StatCard label="Today's Tasks" value={tasksLoading ? "…" : todayTasks.length} detail={`${completedToday} completed`} icon={CalendarClock} /><StatCard label="Completed" value={`${completedTasks}`} detail="Across your workspace" icon={CheckCircle2} /><StatCard label="Study Time" value={`${sessionStats?.totalStudyHours || 0}h`} detail={`${sessionStats?.totalSessions || 0} focus sessions`} icon={Clock3} /><StatCard label="Productivity" value={`${completionRate}%`} detail={`${pendingTasks} tasks in progress`} icon={TrendingUp} /><StatCard label="Current Streak" value={`${sessionStats?.streak || 0}`} detail="days of focused work" icon={Timer} /></div>

    <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]"><section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-gray-900 dark:text-white">Weekly focus time</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Your study sessions over the past seven days</p></div><Link to="/analytics" className="text-xs font-semibold text-indigo-700 no-underline hover:underline dark:text-indigo-300">View analytics →</Link></div>{sessionStats?.dailyStudy?.length ? <ResponsiveContainer width="100%" height={230}><BarChart data={sessionStats.dailyStudy} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.18} /><XAxis dataKey="date" tickFormatter={(date) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip labelFormatter={(date) => new Date(`${date}T12:00:00`).toLocaleDateString()} formatter={(value) => [`${value} minutes`, "Focus time"]} /><Bar dataKey="minutes" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer> : <div className="flex h-[230px] flex-col items-center justify-center rounded-xl bg-gray-50 text-center dark:bg-gray-700/40"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">Your focus history will show here</p><Link to="/pomodoro" className="mt-2 text-sm font-semibold text-indigo-700 no-underline hover:underline dark:text-indigo-300">Start a focus session</Link></div>}</section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-gray-900 dark:text-white">Upcoming deadlines</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">The next tasks to keep in view</p></div><CalendarClock className="text-indigo-600 dark:text-indigo-300" size={18} aria-hidden="true" /></div>{upcomingTasks.length ? <ul className="space-y-3">{upcomingTasks.map((task) => <li key={task._id} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-gray-700"><div className="min-w-0"><p className="truncate text-sm font-medium text-gray-900 dark:text-white">{task.title}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{task.priority} priority</p></div><time className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400" dateTime={new Date(task.dueDate).toISOString()}>{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></li>)}</ul> : <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-700/40 dark:text-gray-400">No upcoming deadlines. Add a due date to a task to see it here.</div>}<Link to="/calendar" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 no-underline hover:underline dark:text-indigo-300">Open calendar <ArrowRight size={14} aria-hidden="true" /></Link></section></div>

    <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-gray-900 dark:text-white">Today’s tasks</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{todayTasks.length ? `${completedToday} of ${todayTasks.length} complete` : "A focused view of today's due work"}</p></div><Link to="/tasks" className="text-xs font-semibold text-indigo-700 no-underline hover:underline dark:text-indigo-300">All tasks →</Link></div>{todayTasks.length ? <ul className="space-y-2">{todayTasks.slice(0, 5).map((task) => <li key={task._id} className="flex items-center gap-3 rounded-lg px-2 py-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.completed ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" /><span className={`min-w-0 flex-1 truncate text-sm ${task.completed ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"}`}>{task.title}</span><span className="text-xs text-gray-500">{task.priority}</span></li>)}</ul> : <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-700/40 dark:text-gray-400">No tasks are due today. Add a task or take a focus break.</p>}</section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-gray-900 dark:text-white">Recent activity</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Recently updated tasks and saved focus work</p></div><Link to="/projects" aria-label="Open projects" className="rounded-lg p-2 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"><FolderPlus size={18} aria-hidden="true" /></Link></div>{recentTasks.length || recentSessions.length ? <ul className="space-y-3">{[...recentTasks.slice(0, 3).map((task) => ({ id: `task-${task._id}`, title: task.title, date: task.updatedAt || task.createdAt, label: task.completed ? "Task completed" : "Task updated" })), ...recentSessions.slice(0, 2).map((session) => ({ id: `session-${session._id}`, title: `${session.actualDuration ?? session.duration} min focus session`, date: session.completedAt || session.date, label: "Focus session" }))].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 4).map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-gray-700"><div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{entry.title}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{entry.label}</p></div><time className="shrink-0 text-xs text-gray-400">{entry.date ? new Date(entry.date).toLocaleDateString() : ""}</time></li>)}</ul> : <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-700/40 dark:text-gray-400">Your latest work will appear here.</p>}</section></div>
  </section>;
}

function StatCard({ label, value, detail, icon: Icon }) {
  return <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>{createElement(Icon, { size: 17, className: "shrink-0 text-indigo-600 dark:text-indigo-300", "aria-hidden": true })}</div><p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p><p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{detail}</p></article>;
}

export default Dashboard;
