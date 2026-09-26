import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAdminAnalyticsAPI, getAdminSettingsAPI, getAdminSubscriptionsAPI, getAdminTasksAPI, getAuditLogsAPI } from "../services/api";

const titles = { "/admin/tasks": "Platform tasks", "/admin/subscriptions": "Subscriptions", "/admin/analytics": "Platform analytics", "/admin/settings": "Service settings", "/admin/audit-logs": "Audit logs" };

function AdminWorkspace() {
  const { pathname } = useLocation();
  const [data, setData] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let response;
      if (pathname === "/admin/tasks") response = await getAdminTasksAPI({ page: pagination.page, limit: 20, search: search || undefined, status: status || undefined });
      else if (pathname === "/admin/subscriptions") response = await getAdminSubscriptionsAPI({ page: pagination.page, limit: 20, plan: plan || undefined, status: status || undefined });
      else if (pathname === "/admin/analytics") response = await getAdminAnalyticsAPI();
      else if (pathname === "/admin/settings") response = await getAdminSettingsAPI();
      else response = await getAuditLogsAPI({ page: pagination.page, limit: 25 });
      setData(response.data);
      if (response.data.pagination) setPagination(response.data.pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't load this admin page.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, pagination.page, search, status, plan]);

  useEffect(() => {
    const timer = window.setTimeout(load, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  useEffect(() => { setPagination((current) => ({ ...current, page: 1 })); }, [pathname, search, status, plan]);

  const title = titles[pathname] || "Admin";
  const paged = ["/admin/tasks", "/admin/subscriptions", "/admin/audit-logs"].includes(pathname);

  return <section className="min-w-0"><header className="mb-5"><p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Platform operations</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pathname === "/admin/settings" ? "Safe runtime configuration status. Secret values are never shown." : "Search and review platform-level data."}</p></header>
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}<button onClick={load} type="button" className="shrink-0 font-semibold underline">Retry</button></div>}
    {pathname === "/admin/tasks" && <TaskControls search={search} setSearch={setSearch} status={status} setStatus={setStatus} />}
    {pathname === "/admin/subscriptions" && <SubscriptionControls plan={plan} setPlan={setPlan} status={status} setStatus={setStatus} />}
    {loading ? <Loading /> : !data ? null : pathname === "/admin/tasks" ? <TaskTable items={data.items || []} /> : pathname === "/admin/subscriptions" ? <SubscriptionTable items={data.items || []} /> : pathname === "/admin/settings" ? <SettingsPanel data={data} /> : pathname === "/admin/analytics" ? <AnalyticsPanel data={data} /> : <AuditTable items={data.items || []} />}
    {!loading && paged && data && <Pagination pagination={pagination} onPage={(page) => setPagination((current) => ({ ...current, page }))} />}
  </section>;
}

function TaskControls({ search, setSearch, status, setStatus }) {
  return <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[minmax(200px,1fr)_180px]"><label className="sr-only" htmlFor="admin-task-search">Search tasks</label><input id="admin-task-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or description" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" /><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter tasks by status" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"><option value="">All statuses</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></div>;
}

function SubscriptionControls({ plan, setPlan, status, setStatus }) {
  return <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2"><select value={plan} onChange={(event) => setPlan(event.target.value)} aria-label="Filter subscriptions by plan" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"><option value="">All paid plans</option><option value="pro">Pro</option><option value="premium">Premium</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter subscriptions by status" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"><option value="">All statuses</option><option value="active">Active</option><option value="trialing">Trialing</option><option value="past_due">Past due</option><option value="canceled">Canceled</option><option value="incomplete">Incomplete</option></select></div>;
}

function TaskTable({ items }) {
  if (!items.length) return <Empty>No tasks match these filters.</Empty>;
  return <Table headers={["Task", "Owner", "Status", "Priority", "Due date"]}>{items.map((item) => <tr key={item._id}><td><span className="font-semibold text-slate-900 dark:text-white">{item.title}</span></td><td>{item.userId?.name || "Deleted user"}<span className="block text-xs text-slate-500">{item.userId?.email || ""}</span></td><td><StatusBadge value={item.status} /></td><td>{item.priority}</td><td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "—"}</td></tr>)}</Table>;
}

function SubscriptionTable({ items }) {
  if (!items.length) return <Empty>No subscriptions match these filters. New subscriptions appear after Stripe webhooks sync them.</Empty>;
  return <Table headers={["Account", "Plan", "Status", "Price", "Renews / ends"]}>{items.map((item) => { const fraction = new Intl.NumberFormat(undefined, { style: "currency", currency: item.currency?.toUpperCase() || "USD" }).resolvedOptions().maximumFractionDigits; const price = new Intl.NumberFormat(undefined, { style: "currency", currency: item.currency?.toUpperCase() || "USD" }).format((item.unitAmount || 0) / (10 ** fraction)); return <tr key={item._id}><td><span className="font-semibold text-slate-900 dark:text-white">{item.userId?.name || "Deleted user"}</span><span className="block text-xs text-slate-500">{item.userId?.email || ""}</span></td><td className="capitalize">{item.plan}</td><td><StatusBadge value={item.status} /></td><td>{price} / {item.interval}</td><td>{item.currentPeriodEnd ? new Date(item.currentPeriodEnd).toLocaleDateString() : "—"}</td></tr>; })}</Table>;
}

function AnalyticsPanel({ data }) {
  const stats = [["Users", data.totalUsers], ["Active users", data.activeUsers], ["New users · 30 days", data.newUsers], ["Tasks", data.totalTasks], ["Completed tasks", data.completedTasks], ["Focus sessions", data.totalSessions], ["Focus time", `${(data.totalFocusMinutes / 60).toFixed(1)} hours`], ["Active subscriptions", data.activeSubscriptions]];
  return <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p></article>)}</div><article className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold text-slate-900 dark:text-white">Monthly recurring revenue by currency</h2><div className="mt-4 flex flex-wrap gap-3">{data.monthlyRevenue?.length ? data.monthlyRevenue.map(({ currency, amount }) => <div key={currency} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800"><span className="text-xs uppercase text-slate-500">{currency}</span><p className="mt-1 font-bold text-slate-900 dark:text-white">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)}</p></div>) : <p className="text-sm text-slate-500 dark:text-slate-400">No active paid subscriptions yet.</p>}</div></article></>;
}

function SettingsPanel({ data }) {
  const stateRows = [["MongoDB", data.database, data.database === "connected"], ["Stripe billing", data.billingConfigured ? "Configured" : "Needs setup", data.billingConfigured], ["Account email delivery", data.emailConfigured ? "Configured" : "Disabled", data.emailConfigured], ["Environment", data.nodeEnvironment, data.nodeEnvironment !== "production"]];
  return <div className="grid gap-4 xl:grid-cols-[1fr_1fr]"><article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold text-slate-900 dark:text-white">Service readiness</h2><div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{stateRows.map(([label, value, ready]) => <div key={label} className="flex items-center justify-between gap-4 py-3"><span className="text-sm text-slate-600 dark:text-slate-300">{label}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"}`}>{value}</span></div>)}</div><p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">Sensitive connection values are intentionally hidden. Configure secrets in the backend environment and restart the service.</p></article><article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold text-slate-900 dark:text-white">Free plan limits</h2><dl className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{Object.entries(data.freePlanLimits || {}).map(([key, value]) => <div key={key} className="flex justify-between gap-3 py-3 text-sm"><dt className="capitalize text-slate-600 dark:text-slate-300">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="font-semibold text-slate-900 dark:text-white">{value === null ? "Unlimited" : typeof value === "boolean" ? value ? "Enabled" : "Disabled" : value}</dd></div>)}</dl></article></div>;
}

function AuditTable({ items }) {
  if (!items.length) return <Empty>No audit events have been recorded.</Empty>;
  return <Table headers={["Action", "Actor", "Target", "Time", "Details"]}>{items.map((item) => <tr key={item._id}><td className="font-semibold text-slate-900 dark:text-white">{item.action}</td><td>{item.actorId?.name || "Deleted account"}<span className="block text-xs text-slate-500">{item.actorRole}</span></td><td>{item.targetType || "—"} {item.targetId ? `· ${item.targetId}` : ""}</td><td className="whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</td><td className="max-w-xs truncate">{JSON.stringify(item.metadata || {})}</td></tr>)}</Table>;
}

function Table({ headers, children }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-200">{children}</tbody></table></div></div>;
}

function StatusBadge({ value }) { return <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200">{String(value || "unknown").replaceAll("_", " ")}</span>; }
function Empty({ children }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">{children}</div>; }
function Loading() { return <div className="space-y-3" role="status" aria-label="Loading admin data">{[1, 2, 3, 4].map((key) => <div key={key} className="h-14 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}</div>; }
function Pagination({ pagination, onPage }) { return <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"><button type="button" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40 dark:border-slate-700">Previous</button><span className="text-slate-500 dark:text-slate-400">{pagination.total} records · Page {pagination.page} of {Math.max(pagination.pages, 1)}</span><button type="button" disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40 dark:border-slate-700">Next</button></div>; }

export default AdminWorkspace;
