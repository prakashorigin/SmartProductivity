import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import { getProfileAPI, loginAPI, logoutAPI, registerAPI, type AuthResponse, type AuthUser, type ProfileResponse } from "../services/api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface Credentials { email: string; password: string }
interface Registration extends Credentials { name: string }

const readStoredAuth = (): Pick<AuthState, "user" | "token"> => {
  try {
    const user = localStorage.getItem("user");
    return { user: user ? JSON.parse(user) as AuthUser : null, token: localStorage.getItem("token") };
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return { user: null, token: null };
  }
};

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
  const requestError = error as AxiosError<{ message?: string }>;
  if (requestError.code === "ERR_NETWORK" || !requestError.response) {
    return "We couldn't reach the SmartProductivity server. Check that the API and MongoDB are running, then try again.";
  }
  return requestError.response.data?.message || fallback;
};

const saveAuth = (data: AuthResponse): AuthResponse => {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data));
  return data;
};

export const loginUser = createAsyncThunk<AuthResponse, Credentials, { rejectValue: string }>("auth/login", async (credentials, { rejectWithValue }) => {
  try { const { data } = await loginAPI(credentials); return saveAuth(data); }
  catch (error) { return rejectWithValue(getRequestErrorMessage(error, "We couldn't sign you in. Please try again.")); }
});

export const registerUser = createAsyncThunk<AuthResponse, Registration, { rejectValue: string }>("auth/register", async (userData, { rejectWithValue }) => {
  try { const { data } = await registerAPI(userData); return saveAuth(data); }
  catch (error) { return rejectWithValue(getRequestErrorMessage(error, "We couldn't create your account. Please check your details and try again.")); }
});

export const fetchProfile = createAsyncThunk<ProfileResponse, void, { rejectValue: string }>("auth/fetchProfile", async (_, { rejectWithValue }) => {
  try { const { data } = await getProfileAPI(); return data; }
  catch (error) { return rejectWithValue(getRequestErrorMessage(error, "We couldn't load your profile. Please try again.")); }
});

const stored = readStoredAuth();
const initialState: AuthState = { user: stored.user, token: stored.token, loading: false, error: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => { state.user = null; state.token = null; state.error = null; localStorage.removeItem("token"); localStorage.removeItem("user"); },
    clearError: (state) => { state.error = null; },
    updateCredentials: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
      if (action.payload.token) state.token = action.payload.token;
      if (state.user) localStorage.setItem("user", JSON.stringify(state.user));
      if (action.payload.token) localStorage.setItem("token", action.payload.token);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; state.token = action.payload.token; })
      .addCase(loginUser.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message || "Sign in failed."; })
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; state.token = action.payload.token; })
      .addCase(registerUser.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message || "Registration failed."; })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        if (state.user) {
          state.user = { ...state.user, ...action.payload };
          localStorage.setItem("user", JSON.stringify(state.user));
        }
      });
  },
});

export const { logout, clearError, updateCredentials } = authSlice.actions;
export const signOut = createAsyncThunk("auth/signOut", async (_: void, { dispatch }) => {
  try { await logoutAPI(); } catch { /* Clear the local session even if the API is offline. */ }
  dispatch(logout());
});
export default authSlice.reducer;
