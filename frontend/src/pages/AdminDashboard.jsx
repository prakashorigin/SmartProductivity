import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  deleteAdminUserAPI,
  getAdminAnalyticsAPI,
  getAdminUsersAPI,
  setUserSuspensionAPI,
  updateUserRoleAPI,
} from "../services/api";

const formatRevenue = (entries = []) => entries.map(({ currency, amount }) => new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "usd").toUpperCase() }).format(amount)).join(" · ") || "—";

function AdminDashboard({ usersOnly = false }) {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");

  const loadUsers = useCallback(async (page = 1, query = search, role = roleFilter, status = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const [{ data: userData }, { data: analytics }] = await Promise.all([
        getAdminUsersAPI({ page, limit: 20, search: query || undefined, role: role || undefined, status: status || undefined }),
        getAdminAnalyticsAPI(),
      ]);
      setUsers(userData.items);
      setPagination(userData.pagination);
      setStats(analytics);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't load the admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => loadUsers(1), 250);
    return () => window.clearTimeout(timeout);
  }, [search, roleFilter, statusFilter, loadUsers]);

  const handleRoleChange = async (target, role) => {
    setActionId(target._id);
    setError("");
    try {
      await updateUserRoleAPI(target._id, { role });
      await loadUsers(pagination.page);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't update this user's role.");
    } finally {
      setActionId("");
    }
  };

  const handleSuspend = async (target) => {
    const suspend = target.accountStatus !== "suspended";
    setActionId(target._id);
    setError("");
    try {
      await setUserSuspensionAPI(target._id, {
        suspended: suspend,
        reason: suspend ? "Suspended by an administrator" : undefined,
      });
      await loadUsers(pagination.page);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't update this account.");
    } finally {
      setActionId("");
    }
  };

  const handleDelete = async (target) => {
    if (!window.confirm(`Delete ${target.name} and permanently remove their productivity data?`)) return;
    setActionId(target._id);
    setError("");
    try {
      await deleteAdminUserAPI(target._id);
      await loadUsers(Math.min(pagination.page, Math.max(1, Math.ceil((pagination.total - 1) / pagination.limit))));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't delete this user.");
    } finally {
      setActionId("");
    }
  };

  const metricCards = stats ? [
    ["Total users", stats.totalUsers],
    ["Active users", stats.activeUsers],
    ["New users · 30 days", stats.newUsers],
    ["Total tasks", stats.totalTasks],
    ["Focus sessions", stats.totalSessions],
    ["Active subscriptions", stats.activeSubscriptions],
    ["Monthly recurring revenue", formatRevenue(stats.monthlyRevenue)],
  ] : [];

  return (
    <section className="mx-auto max-w-7xl">
      <header className="mb-6"><p className="mb-1 text-sm font-medium text-indigo-600 dark:text-indigo-300">Platform operations</p><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{usersOnly ? "User management" : "Admin dashboard"}</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{usersOnly ? "Review accounts, roles, and access." : "User access and platform activity at a glance."}</p></header>
      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}<button type="button" onClick={() => loadUsers(pagination.page)} className="font-semibold underline">Retry</button></div>}

      {!usersOnly && metricCards.length > 0 && <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{metricCards.map(([label, value]) => <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p><p className="mt-2 break-words text-xl font-bold text-gray-900 dark:text-white">{value}</p></div>)}</div>}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 p-4 dark:border-gray-700"><div><h2 className="font-semibold text-gray-900 dark:text-white">Users</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pagination.total} accounts</p></div><div className="grid w-full gap-2 sm:grid-cols-[minmax(200px,1fr)_auto_auto] sm:w-auto"><label className="sr-only" htmlFor="admin-user-search">Search users</label><input id="admin-user-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">All roles</option><option value="user">User</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by account status" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option></select></div></div>

        {loading ? <div className="space-y-px" aria-label="Loading users">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse bg-gray-50 dark:bg-gray-700/50" />)}</div> : users.length === 0 ? <div className="px-6 py-14 text-center text-sm text-gray-500 dark:text-gray-400">No users match this search.</div> : <>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-300"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{users.map((target) => <tr key={target._id} className="text-gray-700 dark:text-gray-200"><td className="px-4 py-3"><p className="font-semibold text-gray-900 dark:text-white">{target.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{target.email}</p></td><td className="px-4 py-3">{currentUser?.role === "superadmin" && target._id !== currentUser._id ? <select value={target.role} disabled={actionId === target._id} onChange={(event) => handleRoleChange(target, event.target.value)} aria-label={`Change ${target.name}'s role`} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700"><option value="user">User</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select> : <span className="capitalize">{target.role}</span>}</td><td className="px-4 py-3 capitalize">{target.subscriptionPlan || target.subscription || "free"}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${target.accountStatus === "suspended" ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"}`}>{target.accountStatus || "active"}</span></td><td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(target.createdAt).toLocaleDateString()}</td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" disabled={actionId === target._id || target._id === currentUser?._id} onClick={() => handleSuspend(target)} className="rounded-md px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-40 dark:text-amber-300 dark:hover:bg-amber-950/40">{target.accountStatus === "suspended" ? "Restore" : "Suspend"}</button><button type="button" disabled={actionId === target._id || target._id === currentUser?._id} onClick={() => handleDelete(target)} className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-950/40">Delete</button></div></td></tr>)}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-700"><button type="button" disabled={pagination.page <= 1 || loading} onClick={() => loadUsers(pagination.page - 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-gray-600">Previous</button><span className="text-gray-500 dark:text-gray-400">Page {pagination.page} of {pagination.pages}</span><button type="button" disabled={pagination.page >= pagination.pages || loading} onClick={() => loadUsers(pagination.page + 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-gray-600">Next</button></div>
        </>}
      </section>
    </section>
  );
}

export default AdminDashboard;
