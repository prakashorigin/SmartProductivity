import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { addTask, editTask, fetchTasks, removeTask } from "../store/taskSlice";
import { getProjectsAPI } from "../services/api";
import TaskCard from "../components/TaskCard";

const emptyTask = {
  title: "",
  description: "",
  priority: "Medium",
  status: "todo",
  dueDate: "",
  estimatedMinutes: "",
  projectId: "",
  tags: "",
};
const priorityRank = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

function Tasks() {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { items: tasks, loading, error: taskError } = useSelector((state) => state.tasks);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("created");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(() => searchParams.get("create") === "1");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const pageSize = 8;

  useEffect(() => {
    dispatch(fetchTasks());
    getProjectsAPI().then(({ data }) => setProjects(data)).catch(() => setProjects([]));
  }, [dispatch]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = tasks.filter((task) => {
      const matchesSearch = !query || [task.title, task.description, ...(task.tags || [])].some((value) => String(value || "").toLowerCase().includes(query));
      const currentStatus = task.completed ? "completed" : task.status || "todo";
      const matchesStatus = status === "all" || (status === "active" ? currentStatus !== "completed" : currentStatus === status);
      const matchesPriority = priority === "all" || task.priority === priority;
      return matchesSearch && matchesStatus && matchesPriority;
    });

    result.sort((left, right) => {
      if (sort === "due") return (left.dueDate ? new Date(left.dueDate).getTime() : Infinity) - (right.dueDate ? new Date(right.dueDate).getTime() : Infinity);
      if (sort === "priority") return (priorityRank[left.priority] ?? 4) - (priorityRank[right.priority] ?? 4);
      if (sort === "title") return left.title.localeCompare(right.title);
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });
    return result;
  }, [tasks, search, status, priority, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const visibleTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);
  const projectNames = useMemo(() => new Map(projects.map((project) => [project._id, project.name])), [projects]);

  useEffect(() => setPage(1), [search, status, priority, sort]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyTask);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (task) => {
    setEditingId(task._id);
    setForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "Medium",
      status: task.completed ? "completed" : task.status || "todo",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
      estimatedMinutes: task.estimatedMinutes ?? "",
      projectId: task.projectId || "",
      tags: (task.tags || []).join(", "),
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: form.status,
      completed: form.status === "completed",
      dueDate: form.dueDate || null,
      estimatedMinutes: form.estimatedMinutes === "" ? null : Number(form.estimatedMinutes),
      projectId: form.projectId || null,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      if (editingId) await dispatch(editTask({ id: editingId, updates: payload })).unwrap();
      else await dispatch(addTask(payload)).unwrap();
      setShowForm(false);
      setForm(emptyTask);
    } catch (error) {
      setFormError(typeof error === "string" ? error : "We couldn't save this task. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectTask = (id, checked) => {
    setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((selectedId) => selectedId !== id));
  };

  const selectVisible = (checked) => {
    const visibleIds = visibleTasks.map((task) => task._id);
    setSelected((current) => checked ? [...new Set([...current, ...visibleIds])] : current.filter((id) => !visibleIds.includes(id)));
  };

  const completeSelected = async () => {
    await Promise.all(selected.map((id) => dispatch(editTask({ id, updates: { completed: true } })).unwrap().catch(() => null)));
    setSelected([]);
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.length} selected task${selected.length === 1 ? "" : "s"}?`)) return;
    await Promise.all(selected.map((id) => dispatch(removeTask(id)).unwrap().catch(() => null)));
    setSelected([]);
  };

  return (
    <section className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-indigo-600 dark:text-indigo-300">Keep moving forward</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tasks.length} task{tasks.length === 1 ? "" : "s"} in your workspace</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">+ New task</button>
      </header>

      {taskError && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"><span>{taskError}</span><button type="button" onClick={() => dispatch(fetchTasks())} className="font-semibold underline">Retry</button></div>}

      <div className="mb-5 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:col-span-2 xl:col-span-1">Search tasks
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, description, tag…" className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="all">All tasks</option><option value="active">Active</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Priority
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="all">Any priority</option><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="created">Recently added</option><option value="due">Due date</option><option value="priority">Priority</option><option value="title">Title</option>
          </select>
        </label>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <form role="dialog" aria-modal="true" aria-labelledby="task-form-heading" onSubmit={handleSubmit} className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="task-form-heading" className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? "Edit task" : "Create task"}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add enough detail to make the next step clear.</p></div><button type="button" aria-label="Close task dialog" onClick={() => setShowForm(false)} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button></div>
            {formError && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">Title
                <input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={160} placeholder="e.g. Review chapter 4 notes" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">Description
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} maxLength={2000} placeholder="Notes or details…" className="mt-1 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority
                <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Due date
                <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimate (minutes)
                <input type="number" min="0" max="100000" value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: event.target.value })} placeholder="Optional" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Project
                <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">No project</option>{projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}</select>
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags <span className="font-normal text-gray-400">(comma separated)</span>
                <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="exam, reading" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : editingId ? "Save task" : "Create task"}</button></div>
          </form>
        </div>
      )}

      {selected.length > 0 && <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm dark:bg-indigo-950/40"><span className="font-medium text-indigo-900 dark:text-indigo-200">{selected.length} selected</span><div className="flex gap-2"><button type="button" onClick={completeSelected} className="rounded-md bg-white px-3 py-1.5 font-medium text-indigo-700 dark:bg-gray-800 dark:text-indigo-300">Mark complete</button><button type="button" onClick={deleteSelected} className="rounded-md bg-white px-3 py-1.5 font-medium text-red-600 dark:bg-gray-800 dark:text-red-300">Delete selected</button></div></div>}

      <div className="mb-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={visibleTasks.length > 0 && visibleTasks.every((task) => selected.includes(task._id))} onChange={(event) => selectVisible(event.target.checked)} className="h-4 w-4 accent-indigo-600" />Select this page</label><span>{filteredTasks.length ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredTasks.length)} of ${filteredTasks.length}` : "0 tasks"}</span></div>

      {loading ? (
        <div className="space-y-3" aria-label="Loading tasks">{[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-white dark:bg-gray-800" />)}</div>
      ) : visibleTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-800"><p className="text-3xl">✓</p><h2 className="mt-3 font-semibold text-gray-900 dark:text-white">{tasks.length ? "No tasks match these filters" : "Nothing on your list yet"}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tasks.length ? "Try a different search or filter." : "Add your first task and make a little progress today."}</p>{tasks.length === 0 && <button type="button" onClick={openCreate} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Create your first task</button>}</div>
      ) : (
        <div className="space-y-3">{visibleTasks.map((task) => <TaskCard key={task._id} task={task} projectName={projectNames.get(task.projectId)} onEdit={openEdit} selected={selected.includes(task._id)} onSelect={selectTask} />)}</div>
      )}

      {pageCount > 1 && <nav aria-label="Task pages" className="mt-5 flex items-center justify-center gap-2"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-gray-700">Previous</button><span className="px-2 text-sm text-gray-500 dark:text-gray-400">Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-gray-700">Next</button></nav>}
    </section>
  );
}

export default Tasks;
