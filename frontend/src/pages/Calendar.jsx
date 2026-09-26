import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addTask, fetchTasks } from "../store/taskSlice";

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const startOfWeek = (date) => {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
};
const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};
const formatMonth = (date) => date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

function Calendar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: tasks, loading, error } = useSelector((state) => state.tasks);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState("month");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  const tasksByDate = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = dateKey(new Date(task.dueDate));
      map.set(key, [...(map.get(key) || []), task]);
    }
    return map;
  }, [tasks]);

  const selectedTasks = tasksByDate.get(dateKey(selectedDate)) || [];
  const gridDays = useMemo(() => {
    if (view === "day") return [new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())];
    if (view === "week") return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDate), index));
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [cursor, selectedDate, view]);

  const moveCalendar = (direction) => {
    if (view === "day") setSelectedDate((date) => addDays(date, direction));
    else if (view === "week") setSelectedDate((date) => addDays(date, direction * 7));
    else setCursor((date) => new Date(date.getFullYear(), date.getMonth() + direction, 1));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setFormError("");
    try {
      await dispatch(addTask({
        title: title.trim(),
        priority,
        status: "todo",
        completed: false,
        dueDate: dateKey(selectedDate),
      })).unwrap();
      setTitle("");
      setShowCreate(false);
    } catch (saveError) {
      setFormError(typeof saveError === "string" ? saveError : "Couldn't add the task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const heading = view === "month"
    ? formatMonth(cursor)
    : view === "week"
      ? `${startOfWeek(selectedDate).toLocaleDateString()} – ${addDays(startOfWeek(selectedDate), 6).toLocaleDateString()}`
      : selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <section className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-sm font-medium text-indigo-600 dark:text-indigo-300">Make room for what matters</p><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1></div>
        <button type="button" onClick={() => { setTitle(""); setFormError(""); setShowCreate(true); }} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Add task to date</button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2"><button type="button" aria-label="Previous date range" onClick={() => moveCalendar(-1)} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">‹</button><button type="button" onClick={() => { const today = new Date(); setCursor(today); setSelectedDate(today); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Today</button><button type="button" aria-label="Next date range" onClick={() => moveCalendar(1)} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">›</button><h2 className="ml-2 font-semibold text-gray-900 dark:text-white">{heading}</h2></div>
            <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">{["month", "week", "day"].map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${view === item ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white" : "text-gray-500 dark:text-gray-300"}`}>{item}</button>)}</div>
          </div>

          {view !== "day" && <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">{day}</div>)}</div>}
          {loading ? <div className="h-96 animate-pulse bg-gray-50 dark:bg-gray-800" aria-label="Loading calendar" /> : (
            <div className={`${view === "day" ? "grid min-h-72 grid-cols-1" : "grid grid-cols-7"}`}>
              {gridDays.map((day) => {
                const key = dateKey(day);
                const dayTasks = tasksByDate.get(key) || [];
                const isSelected = key === dateKey(selectedDate);
                const isToday = key === dateKey(new Date());
                const inMonth = day.getMonth() === cursor.getMonth();
                return <button key={key} type="button" onClick={() => { setSelectedDate(day); if (view === "month") setCursor(new Date(day.getFullYear(), day.getMonth(), 1)); }} className={`min-h-24 border-b border-r border-gray-100 p-1.5 text-left transition hover:bg-indigo-50/70 dark:border-gray-700 dark:hover:bg-indigo-950/30 sm:min-h-28 sm:p-2 ${view === "month" && !inMonth ? "bg-gray-50/70 text-gray-300 dark:bg-gray-900/30" : ""} ${isSelected ? "bg-indigo-50 dark:bg-indigo-950/40" : ""}`}>
                  <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs ${isToday ? "bg-indigo-600 font-bold text-white" : isSelected ? "font-bold text-indigo-700 dark:text-indigo-300" : "text-gray-600 dark:text-gray-300"}`}>{day.getDate()}</span>
                  <span className="mt-1 hidden space-y-1 sm:block">{dayTasks.slice(0, view === "month" ? 2 : 4).map((task) => <span key={task._id} className={`block truncate rounded px-1.5 py-1 text-[10px] ${task.completed ? "bg-emerald-50 text-emerald-700 line-through dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"}`}>{task.title}</span>)}{dayTasks.length > (view === "month" ? 2 : 4) && <span className="px-1 text-[10px] text-gray-400">+{dayTasks.length - (view === "month" ? 2 : 4)} more</span>}</span>
                  {dayTasks.length > 0 && <span className="mt-1 flex gap-0.5 sm:hidden">{dayTasks.slice(0, 4).map((task) => <span key={task._id} className={`h-1.5 w-1.5 rounded-full ${task.completed ? "bg-emerald-500" : "bg-indigo-500"}`} />)}</span>}
                </button>;
              })}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selected day</p><h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2></div><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">{selectedTasks.length} tasks</span></div>
          {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}<button type="button" onClick={() => dispatch(fetchTasks())} className="ml-2 underline">Retry</button></div>}
          <div className="mt-5 space-y-3">{selectedTasks.length === 0 ? <div className="rounded-xl bg-gray-50 px-4 py-8 text-center dark:bg-gray-700/60"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">Nothing planned for this date</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Add a task here or choose another day.</p></div> : selectedTasks.map((task) => <article key={task._id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"><div className="flex items-start gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${task.completed ? "bg-emerald-500" : "bg-indigo-500"}`} /><div className="min-w-0 flex-1"><h3 className={`break-words text-sm font-semibold text-gray-800 dark:text-gray-200 ${task.completed ? "line-through opacity-60" : ""}`}>{task.title}</h3><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{task.priority} priority{task.estimatedMinutes ? ` · ${task.estimatedMinutes} min` : ""}</p></div></div></article>)}</div>
          <button type="button" onClick={() => navigate("/tasks")} className="mt-5 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Open task list</button>
        </aside>
      </div>

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><form onSubmit={handleCreate} role="dialog" aria-modal="true" aria-labelledby="calendar-task-heading" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"><div className="mb-5 flex items-start justify-between"><div><h2 id="calendar-task-heading" className="font-semibold text-gray-900 dark:text-white">Add task for {selectedDate.toLocaleDateString()}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The selected date will be its due date.</p></div><button type="button" onClick={() => setShowCreate(false)} className="text-gray-500">✕</button></div>{formError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{formError}</p>}<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Task title<input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="What needs to get done?" /></label><label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Add task"}</button></div></form></div>}
    </section>
  );
}

export default Calendar;
