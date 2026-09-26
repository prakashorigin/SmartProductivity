import { useDispatch } from "react-redux";
import { editTask, removeTask } from "../store/taskSlice";

const priorityClasses = {
  Low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  High: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  Urgent: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function TaskCard({ task, projectName, onEdit, selected = false, onSelect }) {
  const dispatch = useDispatch();
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && !task.completed;

  const toggleComplete = () => {
    dispatch(
      editTask({
        id: task._id,
        updates: { completed: !task.completed },
      }),
    );
  };

  const handleStatusChange = (event) => {
    dispatch(editTask({ id: task._id, updates: { status: event.target.value } }));
  };

  const handleDelete = () => {
    if (window.confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      dispatch(removeTask(task._id));
    }
  };

  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-gray-800 ${isOverdue ? "border-red-200 dark:border-red-900" : "border-gray-200 dark:border-gray-700"} ${task.completed ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        {onSelect && (
          <input
            type="checkbox"
            aria-label={`Select ${task.title}`}
            checked={selected}
            onChange={(event) => onSelect(task._id, event.target.checked)}
            className="mt-1 h-4 w-4 accent-indigo-600"
          />
        )}
        <input
          type="checkbox"
          aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
          checked={Boolean(task.completed)}
          onChange={toggleComplete}
          className="mt-1 h-4 w-4 accent-indigo-600"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className={`break-words font-semibold text-gray-900 dark:text-white ${task.completed ? "line-through" : ""}`}>{task.title}</h2>
              {task.description && <p className="mt-1 whitespace-pre-line text-sm text-gray-500 dark:text-gray-400">{task.description}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClasses[task.priority] || priorityClasses.Medium}`}>{task.priority || "Medium"}</span>
              {isOverdue && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">Overdue</span>}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
            {projectName && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" />{projectName}</span>}
            {dueDate && <span className={isOverdue ? "font-semibold text-red-600 dark:text-red-300" : ""}>Due {dueDate.toLocaleDateString()}</span>}
            {task.estimatedMinutes > 0 && <span>Estimate {task.estimatedMinutes} min</span>}
            {(task.tags || []).map((tag) => <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-700">#{tag}</span>)}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-700">
            <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              Status
              <select value={task.completed ? "completed" : task.status || "todo"} onChange={handleStatusChange} aria-label={`Status for ${task.title}`} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <div className="flex gap-1">
              {onEdit && <button type="button" onClick={() => onEdit(task)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40">Edit</button>}
              <button type="button" onClick={handleDelete} aria-label={`Delete ${task.title}`} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default TaskCard;
