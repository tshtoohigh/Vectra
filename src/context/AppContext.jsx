import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { CognitoAuth } from '../services/aws/cognitoAuth.js';
import { APIGateway } from '../services/aws/apiGateway.js';
import { SNSNotifier } from '../services/aws/snsNotifier.js';
import { EventBridgeScheduler } from '../services/aws/eventBridgeScheduler.js';
import { DEMO_TASKS, DEMO_MODULES, DEMO_USER } from '../utils/demoData.js';
import { shortId } from '../utils/id.js';
import {
  calculatePriority,
  sortByPriority,
  calculateDailyWorkload,
  detectOverloads,
} from '../utils/priorityMath.js';

const AppContext = createContext(null);

const tasksKey = (email) => `vectra.tasks.${email}`;
const modulesKey = (email) => `vectra.modules.${email}`;

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

const newId = (prefix) => shortId(`${prefix}_`);

export function AppProvider({ children }) {
  // ---------- Session ----------
  const session = CognitoAuth.init();
  const authedUser = session?.user || null;
  const isDemo = !authedUser;

  const [user, setUser] = useState(authedUser || null);

  const storeEmail = user?.email || 'guest';

  // New users get a clean empty state — no pre-recorded dummy data
  const [tasks, setTasks] = useState(() => load(tasksKey(storeEmail), []));
  const [modules, setModules] = useState(() => load(modulesKey(storeEmail), []));

  // Load tasks from real DynamoDB on mount (if API configured)
  useEffect(() => {
    if (APIGateway.isConfigured()) {
      APIGateway.getTasks()
        .then((result) => {
          if (result?.tasks?.length) {
            console.log(`[DynamoDB] Loaded ${result.tasks.length} tasks from AWS`);
            setTasks(result.tasks);
          }
        })
        .catch((err) => console.warn('[DynamoDB] Initial load failed:', err.message));
    }
  }, []);

  // ---------- Notifications & toasts ----------
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Persist on change
  useEffect(() => {
    persist(tasksKey(storeEmail), tasks);
  }, [tasks, storeEmail]);

  useEffect(() => {
    persist(modulesKey(storeEmail), modules);
  }, [modules, storeEmail]);

  // ---------- Toast helpers ----------
  const pushToast = useCallback((toast) => {
    const id = newId('toast');
    setToasts((prev) => [...prev, { id, tone: 'info', ...toast }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), toast.duration || 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---------- EventBridge → SNS deadline sweep ----------
  useEffect(() => {
    const runSweep = () => {
      const fresh = SNSNotifier.checkAndNotify(tasksRef.current);
      if (fresh.length) {
        setNotifications(SNSNotifier.getNotifications());
        const top = fresh[0];
        pushToast({
          tone: top.type === 'overdue' || top.type === 'critical' ? 'error' : 'warning',
          title: top.title,
          message: top.message,
        });
      }
    };

    EventBridgeScheduler.registerJob('deadline-sweep', runSweep);
    EventBridgeScheduler.start({ intervalMs: 90000 });

    // Initial sweep shortly after mount so the bell reflects reality
    const t = setTimeout(() => {
      SNSNotifier.checkAndNotify(tasksRef.current);
      setNotifications(SNSNotifier.getNotifications());
    }, 1200);

    return () => {
      clearTimeout(t);
      EventBridgeScheduler.unregisterJob('deadline-sweep');
      EventBridgeScheduler.stop();
    };
  }, [pushToast]);

  const dismissNotification = useCallback((id) => {
    SNSNotifier.dismiss(id);
    setNotifications(SNSNotifier.getNotifications());
  }, []);

  const clearNotifications = useCallback(() => {
    SNSNotifier.clearAll();
    setNotifications([]);
  }, []);

  // ---------- Task mutations ----------
  const createTask = useCallback((input) => {
    const task = {
      id: newId('task'),
      title: input.title?.trim() || 'Untitled task',
      moduleCode: input.moduleCode?.trim().toUpperCase() || '',
      moduleName: input.moduleName?.trim() || '',
      taskType: input.taskType || 'Assignment',
      deadline: input.deadline || new Date(Date.now() + 86400000).toISOString(),
      hours: Number(input.hours) || 4,
      weightage: Number(input.weightage) || 10,
      isGroup: Boolean(input.isGroup),
      notes: input.notes?.trim() || '',
      progress: 0,
      status: 'Pending',
      subtasks: input.subtasks || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => [task, ...prev]);
    // Sync to real DynamoDB via API Gateway → Lambda
    if (APIGateway.isConfigured()) {
      APIGateway.createTask(task).then((res) => {
        if (res?.task?.id) {
          console.log('[DynamoDB] Task created:', res.task.id);
        }
      }).catch((err) => console.warn('[DynamoDB] Create failed:', err.message));
    }
    return task;
  }, []);

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)),
    );
    // Sync to real DynamoDB
    if (APIGateway.isConfigured()) {
      APIGateway.updateTask(id, patch).catch((err) =>
        console.warn('[DynamoDB] Update failed:', err.message)
      );
    }
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    // Sync to real DynamoDB
    if (APIGateway.isConfigured()) {
      APIGateway.deleteTask(id).catch((err) =>
        console.warn('[DynamoDB] Delete failed:', err.message)
      );
    }
  }, []);

  const completeTask = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              progress: 100,
              status: 'Completed',
              subtasks: (t.subtasks || []).map((s) => ({ ...s, done: true })),
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
    // Sync to real DynamoDB
    if (APIGateway.isConfigured()) {
      APIGateway.updateTask(id, { progress: 100, status: 'Completed' }).catch((err) =>
        console.warn('[DynamoDB] Complete failed:', err.message)
      );
    }
  }, []);

  const reopenTask = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: 'In Progress', progress: 50, updatedAt: new Date().toISOString() }
          : t,
      ),
    );
  }, []);

  /** Replace a task's milestone list (used by the AI decompose drawer). */
  const setSubtasks = useCallback((taskId, subtasks) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const done = subtasks.filter((s) => s.done).length;
        const progress = subtasks.length ? Math.round((done / subtasks.length) * 100) : t.progress;
        return {
          ...t,
          subtasks,
          progress,
          status: progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : t.status,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const toggleSubtask = useCallback((taskId, subtaskId, done) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = (t.subtasks || []).map((s) => (s.id === subtaskId ? { ...s, done } : s));
        const completed = subtasks.filter((s) => s.done).length;
        const progress = subtasks.length
          ? Math.round((completed / subtasks.length) * 100)
          : t.progress;
        return {
          ...t,
          subtasks,
          progress,
          status: progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending',
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const setProgress = useCallback((taskId, progress) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              progress,
              status: progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending',
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
  }, []);

  // ---------- Modules ----------
  const upsertModule = useCallback((mod) => {
    setModules((prev) => {
      const exists = prev.some((m) => m.code === mod.code);
      return exists
        ? prev.map((m) => (m.code === mod.code ? { ...m, ...mod } : m))
        : [...prev, mod];
    });
  }, []);

  const deleteModule = useCallback((code) => {
    setModules((prev) => prev.filter((m) => m.code !== code));
  }, []);

  // ---------- Profile / auth ----------
  const updateProfile = useCallback(
    async (patch) => {
      setUser((prev) => ({ ...prev, ...patch }));
      if (!isDemo) {
        try {
          await CognitoAuth.updateProfile(patch);
        } catch {
          /* demo/offline — local state already updated */
        }
      }
    },
    [isDemo],
  );

  const signOut = useCallback(() => {
    CognitoAuth.signOut();
    SNSNotifier.clearAll();
  }, []);

  const resetDemoData = useCallback(() => {
    setTasks([]);
    setModules([]);
    SNSNotifier.clearAll();
    setNotifications([]);
    pushToast({ tone: 'success', title: 'Sample data restored' });
  }, [pushToast]);

  // ---------- Derived ----------
  const dailyHours = user?.dailyHours || 4;

  const derived = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'Completed');
    const completed = tasks.filter((t) => t.status === 'Completed');
    const now = Date.now();

    const overdue = active.filter((t) => new Date(t.deadline).getTime() < now);
    const dueSoon = active.filter((t) => {
      const h = (new Date(t.deadline).getTime() - now) / 3600000;
      return h > 0 && h <= 72;
    });
    const dueThisWeek = active.filter((t) => {
      const h = (new Date(t.deadline).getTime() - now) / 3600000;
      return h > 0 && h <= 168;
    });

    const hoursThisWeek = dueThisWeek.reduce(
      (sum, t) => sum + (t.hours || 0) * (1 - (t.progress || 0) / 100),
      0,
    );

    const ranked = sortByPriority(active);
    const workload = detectOverloads(calculateDailyWorkload(tasks, 14), dailyHours);

    return {
      activeTasks: active,
      completedTasks: completed,
      overdueTasks: overdue,
      dueSoonTasks: dueSoon,
      rankedTasks: ranked,
      focusTask: ranked[0] || null,
      workload,
      overloadedDays: workload.filter((d) => d.isOverloaded),
      stats: {
        active: active.length,
        completed: completed.length,
        overdue: overdue.length,
        dueSoon: dueSoon.length,
        hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
        avgProgress: tasks.length
          ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length)
          : 0,
      },
    };
  }, [tasks, dailyHours]);

  const value = useMemo(
    () => ({
      // session
      user,
      isDemo,
      // data
      tasks,
      modules,
      dailyHours,
      // derived
      ...derived,
      priorityOf: calculatePriority,
      // notifications
      notifications,
      dismissNotification,
      clearNotifications,
      // toasts
      toasts,
      pushToast,
      dismissToast,
      // task actions
      createTask,
      updateTask,
      deleteTask,
      completeTask,
      reopenTask,
      setSubtasks,
      toggleSubtask,
      setProgress,
      // modules
      upsertModule,
      deleteModule,
      // account
      updateProfile,
      signOut,
      resetDemoData,
    }),
    [
      user,
      isDemo,
      tasks,
      modules,
      dailyHours,
      derived,
      notifications,
      dismissNotification,
      clearNotifications,
      toasts,
      pushToast,
      dismissToast,
      createTask,
      updateTask,
      deleteTask,
      completeTask,
      reopenTask,
      setSubtasks,
      toggleSubtask,
      setProgress,
      upsertModule,
      deleteModule,
      updateProfile,
      signOut,
      resetDemoData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export default AppContext;
