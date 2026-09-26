import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "../components/Layout";
import AdminLayout from "../components/AdminLayout";
import PrivateRoute from "../components/PrivateRoute";

const Landing = lazy(() => import("../pages/Landing"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const VerifyEmail = lazy(() => import("../pages/VerifyEmail"));
const Pricing = lazy(() => import("../pages/Pricing"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Tasks = lazy(() => import("../pages/Tasks"));
const Projects = lazy(() => import("../pages/Projects"));
const Pomodoro = lazy(() => import("../pages/Pomodoro"));
const Analytics = lazy(() => import("../pages/Analytics"));
const Calendar = lazy(() => import("../pages/Calendar"));
const Notifications = lazy(() => import("../pages/Notifications"));
const Profile = lazy(() => import("../pages/Profile"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const AdminOverview = lazy(() => import("../pages/AdminOverview"));
const AdminWorkspace = lazy(() => import("../pages/AdminWorkspace"));

function PageLoading() {
  return <div role="status" className="flex min-h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading page…</div>;
}

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* User workspace routes */}
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/pomodoro" element={<Pomodoro />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Separate admin navigation and role guard */}
          <Route element={<PrivateRoute allowedRoles={["admin", "superadmin"]}><AdminLayout /></PrivateRoute>}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/users" element={<AdminDashboard usersOnly />} />
            <Route path="/admin/tasks" element={<AdminWorkspace />} />
            <Route path="/admin/subscriptions" element={<AdminWorkspace />} />
            <Route path="/admin/analytics" element={<AdminWorkspace />} />
            <Route path="/admin/settings" element={<AdminWorkspace />} />
            <Route path="/admin/audit-logs" element={<AdminWorkspace />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
