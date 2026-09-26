import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addTask, editTask, fetchTasks } from "../store/taskSlice";

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const taskDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
const parseDateKey = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
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
const statusLabel = (task) => task.completed || task.status === "completed" ? "Completed" : task.status === "in_progress" ? "In progress" : "To do";
const eventColor = (task) => {
  if (task.completed || task.status === "completed") return "bg-emerald-100 text-emerald-800 line-through dark:bg-emerald-950/50 dark:text-emerald-300";
  if (task.priority === "Urgent") return "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
  if (task.priority === "High") return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300";
};

function Calendar() {
  const dispatch = useDispatch();
  const { items: tasks, loading, error } = useSelector((state) => state.tasks);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState("month");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("todo");
  const [taskDate, setTaskDate] = useState(dateKey(new Date()));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState("");
  const [dropDateKey, setDropDateKey] = useState("");

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  const tasksByDate = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      const key = taskDateKey(task.dueDate);
      if (key) map.set(key, [...(map.get(key) || []), task]);
    }
    for (const dayTasks of map.values()) {
      dayTasks.sort((left, right) => {
        const completeOrder = Number(Boolean(left.completed)) - Number(Boolean(right.completed));
        return completeOrder || (left.title || "").localeCompare(right.title || "");
      });
    }
    return map;
  }, [tasks]);

  const selectedTasks = tasksByDate.get(dateKey(selectedDate)) || [];
  const gridDays = useMemo(() => {
    if (view === "day") return [new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())];
    if (view === "week") return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDate), index));
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    return Array.from({ length: 42 }, (_, index) => addDays(startOfWeek(monthStart), index));
  }, [cursor, selectedDate, view]);

  const openCreate = () => {
    setEditingTask(null);
    setTitle("");
    setPriority("Medium");
    setStatus("todo");
    setTaskDate(dateKey(selectedDate));
    setFormError("");
    setCalendarMessage("");
    setShowEditor(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setTitle(task.title || "");
    setPriority(task.priority || "Medium");
    setStatus(task.completed ? "completed" : task.status || "todo");
    setTaskDate(taskDateKey(task.dueDate));
    setFormError("");
    setCalendarMessage("");
    setShowEditor(true);
  };

  const moveTaskToDate = async (taskId, day) => {
    const nextDate = dateKey(day);
    const task = tasks.find((item) => item._id === taskId);
    if (!task || taskDateKey(task.dueDate) === nextDate) return;
    setCalendarMessage("");
    try {
      await dispatch(editTask({ id: taskId, updates: { dueDate: nextDate } })).unwrap();
      setSelectedDate(day);
      setCursor(new Date(day.getFullYear(), day.getMonth(), 1));
      setCalendarMessage(`Moved “${task.title}” to ${day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`);
    } catch (saveError) {
      setCalendarMessage(typeof saveError === "string" ? saveError : "We couldn't move that task. Please try again.");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setFormError("");
    const payload = {
      title: title.trim(),
      priority,
      status,
      completed: status === "completed",
      dueDate: taskDate || null,
    };
    try {
      if (editingTask) {
        await dispatch(editTask({ id: editingTask._id, updates: payload })).unwrap();
      } else {
        await dispatch(addTask(payload)).unwrap();
      }
      const chosenDate = parseDateKey(taskDate);
      if (chosenDate) {
        setSelectedDate(chosenDate);
        setCursor(new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1));
      }
      setCalendarMessage(editingTask ? "Task updated." : "Task added to your calendar.");
      setShowEditor(false);
    } catch (saveError) {
      setFormError(typeof saveError === "string" ? saveError : "We couldn't save this task. Check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const moveCalendar = (direction) => {
    if (view === "day") {
      setSelectedDate((day) => addDays(day, direction));
    } else if (view === "week") {
      setSelectedDate((day) => addDays(day, direction * 7));
    } else {
      const firstOfNextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
      const lastDay = new Date(firstOfNextMonth.getFullYear(), firstOfNextMonth.getMonth() + 1, 0).getDate();
      const nextSelectedDate = new Date(firstOfNextMonth.getFullYear(), firstOfNextMonth.getMonth(), Math.min(selectedDate.getDate(), lastDay));
      setCursor(firstOfNextMonth);
      setSelectedDate(nextSelectedDate);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCursor(today);
    setSelectedDate(today);
  };

  const heading = view === "month"
    ? formatMonth(cursor)
    : view === "week"
      ? `${startOfWeek(selectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(startOfWeek(selectedDate), 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <section className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-indigo-600 dark:text-indigo-300">Plan your time</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Move tasks between days, or select one to edit its details.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">+ Create task</button>
      </header>

      {calendarMessage && <p role="status" className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">{calendarMessage}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center">
                <button type="button" aria-label="Previous date range" onClick={() => moveCalendar(-1)} className="rounded-l-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">‹</button>
                <button type="button" aria-label="Next date range" onClick={() => moveCalendar(1)} className="rounded-r-lg border-y border-r border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">›</button>
              </div>
              <button type="button" onClick={goToToday} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Today</button>
              <h2 className="ml-1 min-w-36 text-lg font-semibold text-gray-900 dark:text-white">{heading}</h2>
            </div>
            <div className="inline-flex self-start rounded-lg bg-gray-100 p-1 dark:bg-gray-700 sm:self-auto">
              {["month", "week", "day"].map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${view === item ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white" : "text-gray-500 dark:text-gray-300"}`}>{item}</button>)}
            </div>
          </div>

          {view !== "day" && <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">{day}</div>)}</div>}

          {loading ? <div className="h-96 animate-pulse bg-gray-50 dark:bg-gray-800" aria-label="Loading calendar" /> : (
            <div className={`grid ${view === "day" ? "grid-cols-1" : "grid-cols-7"}`}>
              {gridDays.map((day) => {
                const key = dateKey(day);
                const dayTasks = tasksByDate.get(key) || [];
                const isSelected = key === dateKey(selectedDate);
                const isToday = key === dateKey(new Date());
                const inMonth = day.getMonth() === cursor.getMonth();
                const visibleLimit = view === "month" ? 2 : view === "day" ? 8 : 4;
                return <div key={key} onDragOver={(event) => { if (draggingTaskId) { event.preventDefault(); setDropDateKey(key); } }} onDragLeave={() => setDropDateKey("")} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/plain") || draggingTaskId; setDraggingTaskId(""); setDropDateKey(""); if (id) moveTaskToDate(id, day); }} className={`min-h-20 border-b border-r border-gray-100 p-1.5 transition sm:min-h-28 sm:p-2 ${view === "day" ? "min-h-80 sm:min-h-[32rem]" : ""} ${view === "month" && !inMonth ? "bg-gray-50/70 dark:bg-gray-900/30" : ""} ${isSelected ? "bg-indigo-50/70 dark:bg-indigo-950/20" : ""} ${dropDateKey === key ? "bg-indigo-100 ring-2 ring-inset ring-indigo-400 dark:bg-indigo-950/60" : ""}`}>
                  <button type="button" onClick={() => { setSelectedDate(day); if (view === "month") setCursor(new Date(day.getFullYear(), day.getMonth(), 1)); }} aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} aria-pressed={isSelected} className="flex w-full items-center justify-between text-left">
                    <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs ${isToday ? "bg-indigo-600 font-bold text-white" : isSelected ? "font-bold text-indigo-700 dark:text-indigo-300" : "text-gray-600 dark:text-gray-300"}`}>{day.getDate()}</span>
                    <span className="text-[10px] text-gray-400 sm:hidden">{dayTasks.length ? `${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}` : ""}</span>
                  </button>
                  <div className="mt-1 hidden space-y-1 sm:block">
                    {dayTasks.slice(0, visibleLimit).map((task) => <button key={task._id} type="button" draggable onDragStart={(event) => { setDraggingTaskId(task._id); event.dataTransfer.setData("text/plain", task._id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDraggingTaskId(""); setDropDateKey(""); }} onClick={() => openEdit(task)} aria-label={`${task.title}, ${statusLabel(task)}. Select to edit or drag to move.`} title="Select to edit or drag to another day" className={`block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium ${eventColor(task)} ${draggingTaskId === task._id ? "opacity-40" : ""}`}>{task.title}</button>)}
                    {dayTasks.length > visibleLimit && <button type="button" onClick={() => { setSelectedDate(day); setView("day"); }} className="px-1 text-[10px] font-medium text-gray-500 hover:text-indigo-700 dark:text-gray-400 dark:hover:text-indigo-300">+{dayTasks.length - visibleLimit} more</button>}
                  </div>
                  {dayTasks.length > 0 && <div aria-hidden="true" className="mt-2 flex gap-1 sm:hidden">{dayTasks.slice(0, 4).map((task) => <span key={task._id} className={`h-1.5 w-1.5 rounded-full ${task.completed ? "bg-emerald-500" : task.priority === "Urgent" ? "bg-rose-500" : "bg-indigo-500"}`} />)}</div>}
                  {draggingTaskId && <span className="sr-only">Drop task here to change its date</span>}
                </div>;
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 px-4 py-3 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400"><span className="font-medium text-gray-600 dark:text-gray-300">Task priority</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-indigo-500" />Normal</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" />High</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-500" />Urgent</span><span className="ml-auto hidden sm:inline">Drag a task to another day to reschedule</span></div>
        </section>

        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selected day</p><h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2></div>
            <button type="button" onClick={openCreate} aria-label="Create task for selected day" className="rounded-lg border border-gray-200 p-2 text-lg leading-none text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:text-indigo-300 dark:hover:bg-indigo-950/50">+</button>
          </div>
          {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}<button type="button" onClick={() => dispatch(fetchTasks())} className="ml-2 underline">Retry</button></div>}
          <div className="mt-5 space-y-3">
            {selectedTasks.length === 0 ? <div className="rounded-xl bg-gray-50 px-4 py-8 text-center dark:bg-gray-700/60"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">Nothing planned for this date</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Add a task here or choose another day.</p><button type="button" onClick={openCreate} className="mt-3 text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Create a task</button></div> : selectedTasks.map((task) => <article key={task._id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"><button type="button" onClick={() => openEdit(task)} className="w-full text-left"><div className="flex items-start gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${task.completed ? "bg-emerald-500" : task.priority === "Urgent" ? "bg-rose-500" : task.priority === "High" ? "bg-amber-500" : "bg-indigo-500"}`} /><div className="min-w-0 flex-1"><h3 className={`break-words text-sm font-semibold text-gray-800 dark:text-gray-200 ${task.completed ? "line-through opacity-60" : ""}`}>{task.title}</h3><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{task.priority} priority · {statusLabel(task)}{task.estimatedMinutes ? ` · ${task.estimatedMinutes} min` : ""}</p></div><span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">Edit</span></div></button></article>)}
          </div>
        </aside>
      </div>

      {showEditor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowEditor(false); }}><form onSubmit={handleSave} role="dialog" aria-modal="true" aria-labelledby="calendar-task-heading" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-5 flex items-start justify-between"><div><h2 id="calendar-task-heading" className="font-semibold text-gray-900 dark:text-white">{editingTask ? "Edit calendar task" : "Create calendar task"}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update the task details or move it to another date.</p></div><button type="button" onClick={() => setShowEditor(false)} aria-label="Close editor" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button></div>
        {formError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{formError}</p>}
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task title<input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="What needs to get done?" /></label>
        <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date<input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></label><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label></div>
        <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Clear the date to remove this task from the calendar.</p>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowEditor(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : editingTask ? "Save changes" : "Create task"}</button></div>
      </form></div>}
    </section>
  );
}

export default Calendar;
