import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchTasks } from "../store/taskSlice";
import { createSessionAPI, getSessionAnalyticsAPI, getSessionsAPI } from "../services/api";

const TIMER_KEY = "smartproductivity.timer.v1";
const DURATIONS_KEY = "smartproductivity.timer.durations.v1";
const DEFAULT_DURATIONS = { focus: 25, short_break: 5, long_break: 15 };
const MODE_LABELS = { focus: "Focus", short_break: "Short break", long_break: "Long break" };

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const makeSessionId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const initialTimer = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
    if (!saved || !MODE_LABELS[saved.mode]) return null;
    if (saved.status === "running") {
      const remainingMs = Math.max(0, Number(saved.endsAt) - Date.now());
      return { ...saved, remainingMs, status: remainingMs === 0 ? "saving" : "running" };
    }
    return saved;
  } catch {
    return null;
  }
};

const initialDurations = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(DURATIONS_KEY) || "null");
    if (!saved) return DEFAULT_DURATIONS;
    return Object.fromEntries(Object.keys(DEFAULT_DURATIONS).map((key) => [key, Math.min(180, Math.max(1, Number(saved[key]) || DEFAULT_DURATIONS[key]))]));
  } catch {
    return DEFAULT_DURATIONS;
  }
};

const makeIdleTimer = (mode, durationMinutes, sessionsToday = 0) => ({
  mode,
  status: "idle",
  plannedMinutes: durationMinutes,
  remainingMs: durationMinutes * 60_000,
  endsAt: null,
  startedAt: null,
  pausedAt: null,
  resumedAt: null,
  pausedMs: 0,
  clientSessionId: null,
  sessionsToday,
  dayKey: localDateKey(),
});

function PomodoroTimer() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items: tasks } = useSelector((state) => state.tasks);
  const canCustomize = ["pro", "premium"].includes(user?.subscriptionPlan || user?.subscription) && ["active", "trialing"].includes(user?.subscriptionStatus || "active");
  const [durations, setDurations] = useState(() => canCustomize ? initialDurations() : DEFAULT_DURATIONS);
  const [timer, setTimer] = useState(() => initialTimer() || makeIdleTimer("focus", DEFAULT_DURATIONS.focus));
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [autoBreak, setAutoBreak] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saveError, setSaveError] = useState("");
  const completedRequest = useRef(null);

  useEffect(() => {
    dispatch(fetchTasks());
    getSessionAnalyticsAPI().then(({ data }) => setStats(data)).catch(() => setStats(null));
    getSessionsAPI({ limit: 8 }).then(({ data }) => setHistory(data)).catch(() => setHistory([]));
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  }, [timer]);

  useEffect(() => {
    localStorage.setItem(DURATIONS_KEY, JSON.stringify(durations));
  }, [durations]);

  useEffect(() => {
    if (timer.status !== "running") return undefined;
    const updateRemaining = () => {
      const remainingMs = Math.max(0, timer.endsAt - Date.now());
      setTimer((current) => {
        if (current.status !== "running") return current;
        return { ...current, remainingMs, status: remainingMs === 0 ? "saving" : "running" };
      });
    };
    updateRemaining();
    const interval = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(interval);
  }, [timer.status, timer.endsAt]);

  const playCompletionSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audio = new AudioContextClass();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.6);
      oscillator.onended = () => audio.close();
    } catch {
      // Audio may be unavailable or blocked until the user interacts with the page.
    }
  }, [soundEnabled]);

  const notifyCompletion = useCallback((mode) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`${MODE_LABELS[mode]} complete`, {
        body: mode === "focus" ? "Focus session saved. Take a short break." : "Break finished. Ready for another focus session?",
      });
    }
  }, []);

  const saveCompletedSession = useCallback(async () => {
    if (timer.status !== "saving" || !timer.clientSessionId || completedRequest.current === timer.clientSessionId) return;
    completedRequest.current = timer.clientSessionId;
    setSaveError("");
    playCompletionSound();
    notifyCompletion(timer.mode);

    const completedAt = new Date(timer.endsAt || Date.now());
    const elapsedMs = Math.max(0, completedAt.getTime() - new Date(timer.startedAt).getTime() - timer.pausedMs);
    const actualDuration = Number((elapsedMs / 60_000).toFixed(2));
    try {
      await createSessionAPI({
        clientSessionId: timer.clientSessionId,
        type: timer.mode,
        plannedDuration: timer.plannedMinutes,
        actualDuration,
        duration: actualDuration,
        startedAt: timer.startedAt,
        pausedAt: timer.pausedAt,
        resumedAt: timer.resumedAt,
        completedAt: completedAt.toISOString(),
        taskId: selectedTaskId || undefined,
      });
      const sessionsSoFarToday = timer.dayKey === localDateKey() ? timer.sessionsToday : 0;
      const nextSessions = timer.mode === "focus" ? sessionsSoFarToday + 1 : sessionsSoFarToday;
      setTimer((current) => {
        const shouldAutoBreak = current.mode === "focus" && autoBreak;
        const nextMode = shouldAutoBreak ? (nextSessions > 0 && nextSessions % 4 === 0 ? "long_break" : "short_break") : "focus";
        const duration = durations[nextMode];
        const shouldStart = shouldAutoBreak;
        return {
          ...makeIdleTimer(nextMode, duration, nextSessions),
          status: shouldStart ? "running" : "idle",
          startedAt: shouldStart ? new Date().toISOString() : null,
          endsAt: shouldStart ? Date.now() + duration * 60_000 : null,
          clientSessionId: shouldStart ? makeSessionId() : null,
        };
      });
      getSessionAnalyticsAPI().then(({ data }) => setStats(data)).catch(() => {});
      getSessionsAPI({ limit: 8 }).then(({ data }) => setHistory(data)).catch(() => {});
    } catch (error) {
      completedRequest.current = null;
      setTimer((current) => ({ ...current, status: "save_error" }));
      setSaveError(error.response?.data?.message || "This session couldn't be saved. Check your connection and retry.");
    }
  }, [timer, selectedTaskId, autoBreak, durations, playCompletionSound, notifyCompletion]);

  useEffect(() => {
    if (timer.status !== "saving") return undefined;
    const timeout = window.setTimeout(() => { void saveCompletedSession(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [saveCompletedSession, timer.status]);

  const chooseMode = (mode) => {
    if (timer.status === "running" || timer.status === "saving") return;
    setSaveError("");
    completedRequest.current = null;
    const sessionsToday = timer.dayKey === localDateKey() ? timer.sessionsToday : 0;
    setTimer(makeIdleTimer(mode, durations[mode], sessionsToday));
  };

  const startTimer = () => {
    const now = Date.now();
    const startedAt = timer.startedAt || new Date(now).toISOString();
    const sessionId = timer.clientSessionId || makeSessionId();
    const remainingMs = Math.max(1, timer.remainingMs);
    const resumedAt = timer.status === "paused" ? new Date(now).toISOString() : timer.resumedAt;
    const pausedMs = timer.status === "paused" && timer.pausedAt
      ? timer.pausedMs + Math.max(0, now - new Date(timer.pausedAt).getTime())
      : timer.pausedMs;
    completedRequest.current = null;
    setSaveError("");
    setTimer((current) => ({
      ...current,
      status: "running",
      startedAt,
      endsAt: now + remainingMs,
      remainingMs,
      resumedAt,
      pausedMs,
      pausedAt: null,
      clientSessionId: sessionId,
    }));
  };

  const pauseTimer = () => {
    const now = Date.now();
    setTimer((current) => ({
      ...current,
      status: "paused",
      remainingMs: Math.max(0, current.endsAt - now),
      pausedAt: new Date(now).toISOString(),
      endsAt: null,
    }));
  };

  const resetTimer = () => {
    if (timer.status === "saving") return;
    completedRequest.current = null;
    setSaveError("");
    const sessionsToday = timer.dayKey === localDateKey() ? timer.sessionsToday : 0;
    setTimer(makeIdleTimer(timer.mode, durations[timer.mode], sessionsToday));
  };

  const skipTimer = () => {
    if (timer.status === "saving") return;
    const nextMode = timer.mode === "focus" ? "short_break" : "focus";
    completedRequest.current = null;
    setSaveError("");
    const sessionsToday = timer.dayKey === localDateKey() ? timer.sessionsToday : 0;
    setTimer(makeIdleTimer(nextMode, durations[nextMode], sessionsToday));
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") await Notification.requestPermission();
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Fullscreen can be unavailable in embedded browser contexts.
    }
  };

  const saveDurations = (mode, value) => {
    if (!canCustomize) return;
    const next = { ...durations, [mode]: Math.min(180, Math.max(1, Number(value) || 1)) };
    setDurations(next);
    if (timer.status === "idle" && timer.mode === mode) {
      const sessionsToday = timer.dayKey === localDateKey() ? timer.sessionsToday : 0;
      setTimer(makeIdleTimer(mode, next[mode], sessionsToday));
    }
  };

  const remainingMs = timer.remainingMs;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = timer.plannedMinutes ? 1 - remainingMs / (timer.plannedMinutes * 60_000) : 0;
  const circumference = 2 * Math.PI * 46;
  const sessionsToday = timer.dayKey === localDateKey() ? timer.sessionsToday : 0;
  const focusMinutesToday = useMemo(() => {
    if (timer.dayKey !== localDateKey()) return 0;
    return stats?.dailyStudy?.find((entry) => entry.date === localDateKey())?.minutes || 0;
  }, [stats, timer.dayKey]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Stay with one thing at a time</p><h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Focus timer</h2></div>
          <button type="button" onClick={toggleFullscreen} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Focus mode</button>
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Timer mode">
          {Object.entries(MODE_LABELS).map(([mode, label]) => <button key={mode} type="button" role="tab" aria-selected={timer.mode === mode} onClick={() => chooseMode(mode)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${timer.mode === mode ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"}`}>{label} · {durations[mode]}m</button>)}
        </div>

        <div className="relative mx-auto mb-7 h-64 w-64 sm:h-72 sm:w-72">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-100 dark:text-gray-700" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))} className={timer.mode === "focus" ? "text-indigo-600" : "text-emerald-500"} style={{ transition: "stroke-dashoffset 250ms linear" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">{MODE_LABELS[timer.mode]}</span>
            <span role="timer" aria-live="off" className="mt-2 font-mono text-6xl font-semibold tracking-tight text-gray-900 dark:text-white">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
            <span className="mt-2 text-sm text-gray-500 dark:text-gray-400">{timer.status === "paused" ? "Paused" : timer.status === "running" ? "Session in progress" : timer.status === "saving" ? "Saving session…" : "Ready when you are"}</span>
          </div>
        </div>

        <label className="mx-auto mb-5 block max-w-sm text-sm font-medium text-gray-600 dark:text-gray-300">Focus task <span className="font-normal text-gray-400">(optional)</span>
          <select value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)} disabled={timer.status === "running" || timer.status === "saving"} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">No task selected</option>{tasks.filter((task) => !task.completed).map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}</select>
        </label>

        {saveError && <div role="alert" className="mx-auto mb-4 max-w-sm rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{saveError}<button type="button" onClick={() => { completedRequest.current = null; setTimer((current) => ({ ...current, status: "saving" })); }} className="ml-2 font-semibold underline">Retry save</button></div>}

        <div className="flex flex-wrap justify-center gap-3">
          {timer.status === "running" ? <button type="button" onClick={pauseTimer} className="min-w-32 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600">Pause</button> : <button type="button" onClick={startTimer} disabled={timer.status === "saving" || timer.status === "save_error"} className="min-w-32 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{timer.status === "paused" ? "Resume" : "Start focus"}</button>}
          <button type="button" onClick={resetTimer} disabled={timer.status === "saving"} className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Reset</button>
          <button type="button" onClick={skipTimer} disabled={timer.status === "saving"} className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Skip</button>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-gray-500 dark:text-gray-400">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={autoBreak} onChange={(event) => setAutoBreak(event.target.checked)} className="accent-indigo-600" />Auto-start breaks</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} className="accent-indigo-600" />Sound</label>
          <button type="button" onClick={requestNotifications} className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">Enable browser notifications</button>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Today’s focus</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/40"><p className="text-xs text-indigo-700 dark:text-indigo-300">Focus time</p><p className="mt-1 text-2xl font-bold text-indigo-900 dark:text-indigo-100">{Math.floor(focusMinutesToday / 60)}h {Math.round(focusMinutesToday % 60)}m</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40"><p className="text-xs text-emerald-700 dark:text-emerald-300">Sessions</p><p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{sessionsToday}</p></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {Object.entries(MODE_LABELS).map(([mode, label]) => <label key={mode} className="text-center text-[11px] text-gray-500 dark:text-gray-400">{label}<span className="mt-1 flex items-center justify-center gap-1 rounded-lg bg-gray-50 p-2 dark:bg-gray-700"><input type="number" min="1" max="180" value={durations[mode]} onChange={(event) => saveDurations(mode, event.target.value)} disabled={!canCustomize || timer.status === "running" || timer.status === "saving"} className="w-10 bg-transparent text-center text-sm font-semibold text-gray-800 outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-white" aria-label={`${label} minutes`} />m</span></label>)}
          </div>
          {canCustomize ? <p className="mt-3 text-xs text-gray-400">Custom durations are saved on this device.</p> : <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Custom durations are available with <Link to="/pricing" className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Pro or Premium</Link>.</p>}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-gray-900 dark:text-white">Recent sessions</h2><span className="text-xs text-gray-400">Saved to your account</span></div>
          {history.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-700 dark:text-gray-400">Completed focus sessions will appear here.</p> : <ul className="space-y-3">{history.slice(0, 6).map((session) => <li key={session._id || session.clientSessionId} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{session.taskId?.title || MODE_LABELS[session.type] || "Focus session"}</p><p className="text-xs text-gray-400">{new Date(session.completedAt || session.date).toLocaleString()}</p></div><span className="shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-200">{session.actualDuration ?? session.duration}m</span></li>)}</ul>}
        </section>
      </aside>
    </div>
  );
}

export default PomodoroTimer;
