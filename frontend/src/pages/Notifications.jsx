import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import {
  deleteNotificationAPI,
  getNotificationsAPI,
  markAllNotificationsReadAPI,
  markNotificationReadAPI,
} from "../services/api";

const typeLabels = {
  task_due: "Task due",
  task_overdue: "Overdue",
  pomodoro_complete: "Focus session",
  subscription: "Subscription",
  system: "System",
};

function Notifications() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getNotificationsAPI({ page, limit: 20, search: search.trim() || undefined });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setPagination(data.pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't load notifications.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markRead = async (item) => {
    if (item.readAt) return;
    try {
      const { data } = await markNotificationReadAPI(item._id);
      setItems((current) => current.map((notification) => notification._id === item._id ? data : notification));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't update this notification.");
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsReadAPI();
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't update notifications.");
    }
  };

  const removeItem = async (id) => {
    const item = items.find((notification) => notification._id === id);
    try {
      await deleteNotificationAPI(id);
      setItems((current) => current.filter((notification) => notification._id !== id));
      if (item && !item.readAt) setUnreadCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't delete this notification.");
    }
  };

  const visibleItems = filter === "unread" ? items.filter((item) => !item.readAt) : items;

  return (
    <section className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-sm font-medium text-indigo-600 dark:text-indigo-300">Stay in the loop</p><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{unreadCount} unread</p></div>
        <button type="button" disabled={unreadCount === 0} onClick={markAllRead} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Mark all as read</button>
      </header>

      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}<button type="button" onClick={() => loadNotifications(pagination.page)} className="font-semibold underline">Retry</button></div>}
      <label className="mb-4 block max-w-md text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Search notifications<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search message or title" className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></label>
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Notification filter">{[{ id: "all", label: "All" }, { id: "unread", label: `Unread${unreadCount ? ` (${unreadCount})` : ""}` }].map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={filter === tab.id} onClick={() => setFilter(tab.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === tab.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>{tab.label}</button>)}</div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {loading ? <div className="space-y-px" aria-label="Loading notifications">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse bg-gray-50 dark:bg-gray-700/60" />)}</div> : visibleItems.length === 0 ? <div className="px-6 py-16 text-center"><span className="text-3xl" aria-hidden="true">✓</span><h2 className="mt-3 font-semibold text-gray-900 dark:text-white">{filter === "unread" ? "You’re all caught up" : "No notifications yet"}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Task reminders and focus updates will show up here.</p></div> : <ul className="divide-y divide-gray-100 dark:divide-gray-700">{visibleItems.map((item) => <li key={item._id} className={`flex gap-4 p-4 sm:p-5 ${item.readAt ? "" : "bg-indigo-50/40 dark:bg-indigo-950/20"}`}>
          <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm ${item.type === "task_overdue" ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300" : item.type === "pomodoro_complete" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"}`} aria-hidden="true">{item.type === "task_overdue" ? "!" : item.type === "pomodoro_complete" ? "✓" : "•"}</span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-gray-900 dark:text-white">{item.title}</h2>{!item.readAt && <span className="h-2 w-2 rounded-full bg-indigo-600" aria-label="Unread" />}<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-300">{typeLabels[item.type] || "Update"}</span></div><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.message}</p><p className="mt-2 text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</p><div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">{item.link && <Link to={item.link} onClick={() => markRead(item)} className="text-indigo-700 hover:underline dark:text-indigo-300">Open</Link>}{!item.readAt && <button type="button" onClick={() => markRead(item)} className="text-gray-500 hover:underline dark:text-gray-400">Mark read</button>}<button type="button" onClick={() => removeItem(item._id)} className="text-red-600 hover:underline dark:text-red-300">Delete</button></div></div>
        </li>)}</ul>}
      </div>
      {pagination.pages > 1 && <nav aria-label="Notification pages" className="mt-4 flex items-center justify-center gap-3"><button type="button" disabled={pagination.page <= 1 || loading} onClick={() => loadNotifications(pagination.page - 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-gray-700">Previous</button><span className="text-sm text-gray-500 dark:text-gray-400">Page {pagination.page} of {pagination.pages}</span><button type="button" disabled={pagination.page >= pagination.pages || loading} onClick={() => loadNotifications(pagination.page + 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-gray-700">Next</button></nav>}
    </section>
  );
}

export default Notifications;
