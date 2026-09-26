import axios, { type AxiosInstance, type AxiosResponse } from "axios";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  role: "user" | "admin" | "superadmin";
  subscription?: "free" | "pro" | "premium";
  subscriptionPlan?: "free" | "pro" | "premium";
  subscriptionStatus?: string;
  currentPeriodEnd?: string | null;
  token: string;
  [key: string]: unknown;
}

export interface AuthResponse extends AuthUser {
  success: boolean;
  verificationEmailSent?: boolean;
}

export interface ProfileResponse extends Omit<AuthUser, "token"> {
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string | null;
}

export interface TaskRecord {
  _id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "completed";
  priority: "Low" | "Medium" | "High" | "Urgent";
  dueDate?: string | null;
  projectId?: string | null;
  completed?: boolean;
  [key: string]: unknown;
}

export interface ProjectRecord {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  [key: string]: unknown;
}

export interface PageQuery {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

const API: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const requestError = error as { config?: { url?: string }; response?: { status?: number } };
    const isAuthEntryRequest = /\/auth\/(login|register)$/.test(requestError.config?.url ?? "");
    if (requestError.response?.status === 401 && !isAuthEntryRequest) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const registerAPI = (data: { name: string; email: string; password: string }): Promise<AxiosResponse<AuthResponse>> => API.post("/auth/register", data);
export const loginAPI = (data: { email: string; password: string }): Promise<AxiosResponse<AuthResponse>> => API.post("/auth/login", data);
export const logoutAPI = () => API.post<{ success: boolean; message: string }>("/auth/logout");
export const getProfileAPI = (): Promise<AxiosResponse<ProfileResponse>> => API.get("/auth/profile");
export const updateProfileAPI = (data: { name?: string; email?: string; password?: string }): Promise<AxiosResponse<AuthResponse>> => API.put("/auth/profile", data);
export const requestPasswordResetAPI = (email: string) => API.post<{ success: boolean; message: string }>("/auth/forgot-password", { email });
export const resetPasswordAPI = (token: string | undefined, password: string) => API.post<{ success: boolean; message: string }>(`/auth/reset-password/${token}`, { password });
export const verifyEmailAPI = (token: string | undefined) => API.post<{ success: boolean; message: string }>(`/auth/verify-email/${token}`);
export const resendVerificationAPI = () => API.post<{ success: boolean; emailSent?: boolean; message: string }>("/auth/verify-email");
export const deleteAccountAPI = (password: string) => API.delete<{ success: boolean; message: string }>("/auth/account", { data: { password } });

export const getTasksAPI = (params?: PageQuery) => API.get<TaskRecord[] | { items: TaskRecord[]; pagination: unknown }>("/tasks", { params });
export const createTaskAPI = (data: Partial<TaskRecord>) => API.post<TaskRecord>("/tasks", data);
export const updateTaskAPI = (id: string, data: Partial<TaskRecord>) => API.put<TaskRecord>(`/tasks/${id}`, data);
export const deleteTaskAPI = (id: string) => API.delete(`/tasks/${id}`);
export const getTaskAnalyticsAPI = (params?: { days?: string }) => API.get<Record<string, unknown>>("/tasks/analytics", { params });

export const createSessionAPI = (data: Record<string, unknown>) => API.post("/sessions", data);
export const getSessionsAPI = (params?: PageQuery) => API.get("/sessions", { params });
export const getSessionAnalyticsAPI = (params?: { days?: string }) => API.get<Record<string, unknown>>("/sessions/analytics", { params });

export const getProjectsAPI = (params?: PageQuery) => API.get<ProjectRecord[] | { items: ProjectRecord[]; pagination: unknown }>("/projects", { params });
export const createProjectAPI = (data: Partial<ProjectRecord>) => API.post<ProjectRecord>("/projects", data);
export const updateProjectAPI = (id: string, data: Partial<ProjectRecord>) => API.put<ProjectRecord>(`/projects/${id}`, data);
export const deleteProjectAPI = (id: string) => API.delete(`/projects/${id}`);

export const getNotificationsAPI = (params?: PageQuery) => API.get("/notifications", { params });
export const markNotificationReadAPI = (id: string) => API.patch(`/notifications/${id}/read`);
export const markAllNotificationsReadAPI = () => API.patch("/notifications/read-all");
export const deleteNotificationAPI = (id: string) => API.delete(`/notifications/${id}`);

export const getPlansAPI = () => API.get("/payments/plans");
export const getCurrentSubscriptionAPI = () => API.get("/payments/subscription");
export const createCheckoutSessionAPI = (plan: string) => API.post<{ url: string }>("/payments/create-checkout-session", { plan });
export const createCustomerPortalAPI = () => API.post<{ url: string }>("/payments/customer-portal");

export const getAdminUsersAPI = (params?: PageQuery) => API.get("/admin/users", { params });
export const getAdminTasksAPI = (params?: PageQuery) => API.get("/admin/tasks", { params });
export const getAdminSubscriptionsAPI = (params?: PageQuery) => API.get("/admin/subscriptions", { params });
export const getAdminSettingsAPI = () => API.get("/admin/settings");
export const getAuditLogsAPI = (params?: PageQuery) => API.get("/admin/audit-logs", { params });
export const deleteAdminUserAPI = (id: string) => API.delete(`/admin/users/${id}`);
export const setUserSuspensionAPI = (id: string, data: { suspended: boolean; reason?: string }) => API.patch(`/admin/users/${id}/status`, data);
export const updateUserRoleAPI = (id: string, data: { role: AuthUser["role"] }) => API.put(`/admin/users/${id}/role`, data);
export const getAdminAnalyticsAPI = () => API.get<Record<string, unknown>>("/admin/analytics");

export default API;
