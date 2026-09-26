import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotificationsAPI, getProjectsAPI, getTasksAPI } from "../services/api";

function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ tasks: [], projects: [], notifications: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return undefined;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      const [tasksResult, projectsResult, notificationsResult] = await Promise.allSettled([
        getTasksAPI({ search: trimmed, page: 1, limit: 5 }),
        getProjectsAPI({ search: trimmed }),
        getNotificationsAPI({ search: trimmed, page: 1, limit: 5 }),
      ]);
      setResults({
        tasks: tasksResult.status === "fulfilled" ? tasksResult.value.data.items?.slice(0, 5) || tasksResult.value.data.slice(0, 5) : [],
        projects: projectsResult.status === "fulfilled" ? projectsResult.value.data.slice(0, 5) : [],
        notifications: notificationsResult.status === "fulfilled" ? notificationsResult.value.data.items.slice(0, 5) : [],
      });
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const hasResults = useMemo(() => Object.values(results).some((items) => items.length > 0), [results]);

  const selectResult = (path, value = query) => {
    navigate(`${path}?search=${encodeURIComponent(value.trim())}`);
    setOpen(false);
    setQuery("");
  };

  const renderResults = () => {
    if (query.trim().length < 2) return <p className="px-4 py-5 text-sm text-gray-500 dark:text-gray-400">Type at least 2 characters to search tasks, projects, and notifications.</p>;
    if (loading) return <p role="status" className="px-4 py-5 text-sm text-gray-500 dark:text-gray-400">Searching…</p>;
    if (!hasResults) return <p className="px-4 py-5 text-sm text-gray-500 dark:text-gray-400">No matches found.</p>;
    return <div className="max-h-[min(65vh,440px)] overflow-y-auto p-2">
      {results.tasks.length > 0 && <SearchGroup title="Tasks" items={results.tasks} label={(task) => task.title} detail={(task) => task.description || task.priority} onSelect={() => selectResult("/tasks")} />}
      {results.projects.length > 0 && <SearchGroup title="Projects" items={results.projects} label={(project) => project.name} detail={(project) => project.description || `${project.taskCount || 0} tasks`} onSelect={() => selectResult("/projects")} />}
      {results.notifications.length > 0 && <SearchGroup title="Notifications" items={results.notifications} label={(notification) => notification.title} detail={(notification) => notification.message} onSelect={() => selectResult("/notifications")} />}
    </div>;
  };

  return <>
    <div className="relative hidden lg:block">
      <input ref={inputRef} type="search" aria-label="Search tasks, projects, and notifications" aria-keyshortcuts="Control+K Meta+K" value={query} onFocus={() => setOpen(true)} onChange={(event) => setQuery(event.target.value)} placeholder="Search…  ⌘K" className="w-56 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 xl:w-64 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      {open && <div className="absolute right-0 top-full z-50 mt-2 w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-[11px] text-gray-400 dark:border-gray-700"><span>SEARCH RESULTS</span><button type="button" onClick={() => setOpen(false)} className="rounded px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700">Esc</button></div>{renderResults()}</div>}
    </div>
    <button type="button" aria-label="Open search" onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 lg:hidden dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">⌕</button>
    {open && <div className="fixed inset-0 z-[60] bg-gray-950/40 p-3 pt-20 lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"><input ref={inputRef} type="search" aria-label="Search tasks, projects, and notifications" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, projects…" className="w-full border-0 border-b border-gray-100 bg-transparent px-4 py-4 text-base text-gray-900 outline-none dark:border-gray-700 dark:text-white" />{renderResults()}</div></div>}
  </>;
}

function SearchGroup({ title, items, label, detail, onSelect }) {
  return <section className="mb-1 last:mb-0"><h2 className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</h2>{items.map((item) => <button key={item._id} type="button" onClick={onSelect} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40"><span className="block truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{label(item)}</span><span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{detail(item)}</span></button>)}</section>;
}

export default GlobalSearch;
