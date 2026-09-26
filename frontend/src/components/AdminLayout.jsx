import { NavLink, Outlet } from "react-router-dom";
import { createElement } from "react";
import { useSelector } from "react-redux";
import { Activity, BarChart3, CreditCard, FileClock, LayoutDashboard, ListTodo, Settings2, Users } from "lucide-react";
import Navbar from "./Navbar";

function AdminLayout() {
  const { user } = useSelector((state) => state.auth);
  const links = [
    ["/admin", "Overview", LayoutDashboard],
    ["/admin/users", "Users", Users],
    ["/admin/tasks", "Tasks", ListTodo],
    ["/admin/subscriptions", "Subscriptions", CreditCard],
    ["/admin/analytics", "Analytics", BarChart3],
    ["/admin/settings", "Settings", Settings2],
    ...(user?.role === "superadmin" ? [["/admin/audit-logs", "Audit logs", FileClock]] : []),
  ];

  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><Navbar /><div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8"><div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300"><Activity size={15} aria-hidden="true" /> Platform administration</div><div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"><nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto lg:flex-col">{links.map(([to, label, icon]) => <NavLink key={to} end={to === "/admin"} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition lg:w-full ${isActive ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{createElement(icon, { size: 17, "aria-hidden": true })}{label}</NavLink>)}</nav></aside><main className="min-w-0"><Outlet /></main></div></div></div>;
}

export default AdminLayout;
