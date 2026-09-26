import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { signOut } from "../store/authSlice";
import { getNotificationsAPI } from "../services/api";
import ThemeToggle from "./ThemeToggle";
import GlobalSearch from "./GlobalSearch";

function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    getNotificationsAPI({ limit: 1 })
      .then(({ data }) => setUnreadCount(data.unreadCount || 0))
      .catch(() => setUnreadCount(0));
  }, [user, location.pathname]);

  const handleLogout = () => {
    dispatch(signOut());
    navigate("/");
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link
        to="/"
        className="text-xl font-bold text-blue-600 dark:text-blue-400 no-underline"
        aria-label="SmartProductivity home"
      >
        <img
          src="/SmartProductivity%20logo.png"
          alt="SmartProductivity"
          className="h-12 w-40 rounded-md bg-white object-contain"
        />
      </Link>

      <div className="flex items-center gap-4">
        {user && <GlobalSearch />}
        {user && (
          <Link
            to="/notifications"
            aria-label={user && unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 no-underline hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <span aria-hidden="true">🔔</span>
            {user && unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>
        )}
        <ThemeToggle />

        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
              Hi, {user.name}
            </span>
            {user.role === "admin" || user.role === "superadmin" ? (
              <Link
                to="/admin"
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                Admin
              </Link>
            ) : null}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm cursor-pointer transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link
              to="/login"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm no-underline transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
