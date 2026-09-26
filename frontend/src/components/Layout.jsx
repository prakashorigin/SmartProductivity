import { NavLink, Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const mobileLinks = [
  { to: "/dashboard", label: "Home", icon: "⌂" },
  { to: "/tasks", label: "Tasks", icon: "✓" },
  { to: "/projects", label: "Projects", icon: "▦" },
  { to: "/pomodoro", label: "Focus", icon: "◷" },
  { to: "/calendar", label: "Calendar", icon: "▣" },
];

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 pb-24 sm:p-6 sm:pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden dark:border-gray-700 dark:bg-gray-900/95">
        {mobileLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-medium no-underline ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`}
          >
            <span aria-hidden="true" className="text-lg leading-5">{link.icon}</span>
            <span className="truncate">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default Layout;
