import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getTasksAPI,
  createTaskAPI,
  updateTaskAPI,
  deleteTaskAPI,
} from "../services/api";

const apiError = (error, fallback) =>
  error.response?.data?.message || fallback;

export const fetchTasks = createAsyncThunk("tasks/fetchTasks", async (_, { rejectWithValue }) => {
  try {
    const { data } = await getTasksAPI();
    return data;
  } catch (error) {
    return rejectWithValue(apiError(error, "We couldn't load your tasks."));
  }
});

export const addTask = createAsyncThunk("tasks/addTask", async (taskData, { rejectWithValue }) => {
  try {
    const { data } = await createTaskAPI(taskData);
    return data;
  } catch (error) {
    return rejectWithValue(apiError(error, "We couldn't create this task."));
  }
});

export const editTask = createAsyncThunk(
  "tasks/editTask",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await updateTaskAPI(id, updates);
      return data;
    } catch (error) {
      return rejectWithValue(apiError(error, "We couldn't update this task."));
    }
  },
);

export const removeTask = createAsyncThunk("tasks/removeTask", async (id, { rejectWithValue }) => {
  try {
    await deleteTaskAPI(id);
    return id;
  } catch (error) {
    return rejectWithValue(apiError(error, "We couldn't delete this task."));
  }
});

const taskSlice = createSlice({
  name: "tasks",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(addTask.pending, (state) => {
        state.error = null;
      })
      .addCase(addTask.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(addTask.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(editTask.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (t) => t._id === action.payload._id,
        );
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(removeTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t._id !== action.payload);
      })
      .addMatcher((action) => [editTask.rejected.type, removeTask.rejected.type].includes(action.type), (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export default taskSlice.reducer;
