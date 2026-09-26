import { createElement, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Clock3, CreditCard, ListTodo, Users } from "lucide-react";
import { getAdminAnalyticsAPI } from "../services/api";

const revenueLabel = (entries = []) => entries.map(({ currency, amount }) => new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "usd").toUpperCase() }).format(amount)).join(" · ") || "—";

function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { const { data } = await getAdminAnalyticsAPI(); setStats(data); setError(""); }
    catch (requestError) { setError(requestError.response?.data?.message || "We couldn't load platform analytics."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const cards = stats ? [
    [Users, "Total users", stats.totalUsers], [Users, "Active users", stats.activeUsers], [Users, "New users · 30 days", stats.newUsers],
    [ListTodo, "Total tasks", stats.totalTasks], [CheckCircle2, "Completed tasks", stats.completedTasks], [Clock3, "Focus hours", `${(stats.totalFocusMinutes / 60).toFixed(1)} h`],
    [CreditCard, "Active subscriptions", stats.activeSubscriptions], [CreditCard, "Monthly recurring revenue", revenueLabel(stats.monthlyRevenue)],
  ] : [];

  return <section className="mx-auto max-w-7xl"><header className="mb-6"><p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Platform operations</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Admin overview</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A current view of accounts, workspaces, and billing activity.</p></header>{error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}<button type="button" onClick={() => { setLoading(true); void load(); }} className="font-semibold underline">Retry</button></div>}{loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading platform metrics">{[1,2,3,4,5,6,7,8].map((key) => <div key={key} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div> : stats && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([icon, label, value]) => <article key={label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>{createElement(icon, { size: 17, className: "shrink-0 text-indigo-600 dark:text-indigo-300", "aria-hidden": true })}</div><p className="mt-3 break-words text-xl font-bold text-slate-900 dark:text-white">{value}</p></article>)}</div><div className="mt-6 grid gap-4 md:grid-cols-2"><ActionCard to="/admin/users" title="Manage accounts" description="Search users, review access, suspend, or restore accounts." /><ActionCard to="/admin/tasks" title="Review platform tasks" description="Filter platform tasks by title, status, and priority." /><ActionCard to="/admin/subscriptions" title="Subscription activity" description="Review plan, status, billing interval, and renewal dates." /><ActionCard to="/admin/settings" title="Service configuration" description="Check database, email delivery, billing, and free-plan settings." /></div></>}</section>;
}

function ActionCard({ to, title, description }) {
  return <Link to={to} className="group rounded-2xl border border-slate-200 bg-white p-5 no-underline transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"><div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2><ArrowUpRight size={17} className="text-slate-400 transition group-hover:text-indigo-600 dark:group-hover:text-indigo-300" aria-hidden="true" /></div><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p></Link>;
}

export default AdminOverview;
