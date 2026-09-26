import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

function Sidebar() {
  const { user } = useSelector((state) => state.auth);
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/tasks", label: "Tasks", icon: "📝" },
    { to: "/projects", label: "Projects", icon: "📁" },
    { to: "/calendar", label: "Calendar", icon: "🗓️" },
    { to: "/pomodoro", label: "Pomodoro", icon: "⏱️" },
    { to: "/analytics", label: "Analytics", icon: "📈" },
    { to: "/notifications", label: "Notifications", icon: "🔔" },
    { to: "/profile", label: "Profile", icon: "👤" },
    ...(user?.role === "admin" || user?.role === "superadmin" ? [{ to: "/admin", label: "Admin", icon: "🛡️" }] : []),
  ];

  return (
    <aside className="w-60 bg-white dark:bg-gray-800 shadow-md min-h-[calc(100vh-56px)] p-4 hidden md:block">
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm no-underline transition-colors ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`
            }
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
