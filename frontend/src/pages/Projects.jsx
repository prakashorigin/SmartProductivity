import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createProjectAPI,
  deleteProjectAPI,
  getProjectsAPI,
  updateProjectAPI,
} from "../services/api";

const initialForm = { name: "", description: "", color: "#4f46e5", deadline: "" };

function Projects() {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(() => searchParams.get("create") === "1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getProjectsAPI();
      setProjects(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't load your projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
    setError("");
  };

  const openEdit = (project) => {
    setEditingId(project._id);
    setForm({
      name: project.name,
      description: project.description || "",
      color: project.color || "#4f46e5",
      deadline: project.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : "",
    });
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      deadline: form.deadline ? new Date(`${form.deadline}T23:59:59`).toISOString() : null,
    };
    try {
      if (editingId) await updateProjectAPI(editingId, payload);
      else await createProjectAPI(payload);
      setShowForm(false);
      setForm(initialForm);
      await loadProjects();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't save this project. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete “${project.name}”? Its tasks will stay in your task list.`)) return;
    setError("");
    try {
      await deleteProjectAPI(project._id);
      setProjects((current) => current.filter((item) => item._id !== project._id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't delete this project.");
    }
  };

  return (
    <section className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-indigo-600 dark:text-indigo-300">Your workspace</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Group tasks around the goals you’re working toward.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          New project
        </button>
      </header>

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">{editingId ? "Edit project" : "Create a project"}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">Close</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Project name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength={2} maxLength={80} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="e.g. Biology finals" />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deadline
              <input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} rows={3} className="mt-1 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="What are you aiming to complete?" />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">Project color <input aria-label="Project color" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent" /></label>
            <button disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : editingId ? "Save changes" : "Create project"}</button>
          </div>
        </form>
      )}

      <label className="mb-4 block max-w-md text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Search projects
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Project name or description" className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      </label>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading projects">
          {[0, 1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-gray-800" />)}
        </div>
      ) : projects.filter((project) => `${project.name} ${project.description || ""}`.toLowerCase().includes(search.trim().toLowerCase())).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl dark:bg-indigo-950/50">▦</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your projects start here</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">{projects.length ? "Try another search term." : "Create a project for a course, a personal goal, or anything you want to make progress on."}</p>
          {projects.length === 0 && <button type="button" onClick={openCreate} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Create your first project</button>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.filter((project) => `${project.name} ${project.description || ""}`.toLowerCase().includes(search.trim().toLowerCase())).map((project) => (
            <article key={project._id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="h-1.5" style={{ backgroundColor: project.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h2>
                    {project.deadline && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Due {new Date(project.deadline).toLocaleDateString()}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-600 dark:bg-gray-700 dark:text-gray-300">{project.status}</span>
                </div>
                <p className="mt-3 min-h-10 text-sm text-gray-500 dark:text-gray-400">{project.description || "No description added."}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{project.completedCount || 0} of {project.taskCount || 0} tasks</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{project.progress || 0}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full transition-all" style={{ width: `${project.progress || 0}%`, backgroundColor: project.color }} /></div>
                <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                  <button type="button" onClick={() => openEdit(project)} className="rounded-md px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40">Edit</button>
                  <button type="button" onClick={() => handleDelete(project)} className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Projects;
