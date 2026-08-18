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
import { DynamoClient } from '../services/aws/dynamoClient.js';
import { SNSNotifier } from '../services/aws/snsNotifier.js';
import { EventBridgeScheduler } from '../services/aws/eventBridgeScheduler.js';
import { isAWSConfigured } from '../services/aws/awsConfig.js';
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

  // Tasks and modules — loaded from localStorage initially, then synced from DynamoDB
  const [tasks, setTasks] = useState(() => load(tasksKey(storeEmail), []));
  const [modules, setModules] = useState(() => load(modulesKey(storeEmail), []));
  const [isLoading, setIsLoading] = useState(false);

  // ---------- Load from DynamoDB on mount ----------
  useEffect(() => {
    if (isAWSConfigured() && storeEmail && storeEmail !== 'guest') {
      setIsLoading(true);
      Promise.all([
        DynamoClient.getTasks(storeEmail),
        DynamoClient.getModules(storeEmail),
      ])
        .then(([dbTasks, dbModules]) => {
          if (dbTasks.length > 0) {
            setTasks(dbTasks);
            persist(tasksKey(storeEmail), dbTasks);
            console.log(`[AppContext] Loaded ${dbTasks.length} tasks from DynamoDB`);
          }
          if (dbModules.length > 0) {
            setModules(dbModules);
            persist(modulesKey(storeEmail), dbModules);
            console.log(`[AppContext] Loaded ${dbModules.length} modules from DynamoDB`);
          }
        })
        .catch((err) => {
          console.warn('[AppContext] DynamoDB load failed, using localStorage:', err.message);
        })
        .finally(() => setIsLoading(false));
    }
  }, [storeEmail]);

  // ---------- Notifications & toasts ----------
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Persist to localStorage on change (backup)
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
      const fresh = SNSNotifier.checkAndNotify(tasksRef.current, storeEmail);
      if (fresh && fresh.then) {
        // Async version (real AWS)
        fresh.then((results) => {
          if (results && results.length) {
            setNotifications(SNSNotifier.getNotifications());
            const top = results[0];
            pushToast({
              tone: top.type === 'overdue' || top.type === 'critical' ? 'error' : 'warning',
              title: top.title,
              message: top.message,
            });
          }
        });
      } else if (Array.isArray(fresh) && fresh.length) {
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

    // Initial sweep shortly after mount
    const t = setTimeout(() => {
      SNSNotifier.checkAndNotify(tasksRef.current, storeEmail).then?.((results) => {
        setNotifications(SNSNotifier.getNotifications());
      });
      setNotifications(SNSNotifier.getNotifications());
    }, 1200);

    return () => {
      clearTimeout(t);
      EventBridgeScheduler.unregisterJob('deadline-sweep');
      EventBridgeScheduler.stop();
    };
  }, [pushToast, storeEmail]);

  const dismissNotification = useCallback((id) => {
    SNSNotifier.dismiss(id);
    setNotifications(SNSNotifier.getNotifications());
  }, []);

  const clearNotifications = useCallback(() => {
    SNSNotifier.clearAll();
    setNotifications([]);
  }, []);

  // ---------- Task mutations (all sync to DynamoDB) ----------
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

    // Update local state immediately
    setTasks((prev) => [task, ...prev]);

    // Write to DynamoDB (PutCommand)
    if (isAWSConfigured()) {
      DynamoClient.putTask(storeEmail, task)
        .then(() => console.log(`[DynamoDB] PutCommand: TASK#${task.id} created`))
        .catch((err) => console.error('[DynamoDB] Create failed:', err.message));
    }

    return task;
  }, [storeEmail]);

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)),
    );

    // Write to DynamoDB (UpdateCommand)
    if (isAWSConfigured()) {
      DynamoClient.updateTask(storeEmail, id, patch)
        .then(() => console.log(`[DynamoDB] UpdateCommand: TASK#${id}`))
        .catch((err) => console.error('[DynamoDB] Update failed:', err.message));
    }
  }, [storeEmail]);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));

    // Delete from DynamoDB (DeleteCommand)
    if (isAWSConfigured()) {
      DynamoClient.deleteTask(storeEmail, id)
        .then(() => console.log(`[DynamoDB] DeleteCommand: TASK#${id}`))
        .catch((err) => console.error('[DynamoDB] Delete failed:', err.message));
    }
  }, [storeEmail]);

  const completeTask = useCallback((id) => {
    const patch = { progress: 100, status: 'Completed' };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              subtasks: (t.subtasks || []).map((s) => ({ ...s, done: true })),
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    );

    // Write to DynamoDB (UpdateCommand)
    if (isAWSConfigured()) {
      DynamoClient.updateTask(storeEmail, id, patch)
        .then(() => console.log(`[DynamoDB] UpdateCommand: TASK#${id} completed`))
        .catch((err) => console.error('[DynamoDB] Complete failed:', err.message));
    }
  }, [storeEmail]);

  const reopenTask = useCallback((id) => {
    const patch = { status: 'In Progress', progress: 50 };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, ...patch, updatedAt: new Date().toISOString() }
          : t,
      ),
    );

    if (isAWSConfigured()) {
      DynamoClient.updateTask(storeEmail, id, patch)
        .then(() => console.log(`[DynamoDB] UpdateCommand: TASK#${id} reopened`))
        .catch((err) => console.error('[DynamoDB] Reopen failed:', err.message));
    }
  }, [storeEmail]);

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

    // Write subtasks to DynamoDB (UpdateCommand)
    if (isAWSConfigured()) {
      const done = subtasks.filter((s) => s.done).length;
      const progress = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;
      DynamoClient.updateTask(storeEmail, taskId, { subtasks, progress })
        .then(() => console.log(`[DynamoDB] UpdateCommand: TASK#${taskId} subtasks updated`))
        .catch((err) => console.error('[DynamoDB] Subtasks update failed:', err.message));
    }
  }, [storeEmail]);

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

    // Sync to DynamoDB
    if (isAWSConfigured()) {
      // Get updated task to send correct subtasks
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (task) {
          DynamoClient.updateTask(storeEmail, taskId, {
            subtasks: task.subtasks,
            progress: task.progress,
            status: task.status,
          }).catch((err) => console.error('[DynamoDB] Toggle subtask failed:', err.message));
        }
        return prev;
      });
    }
  }, [storeEmail]);

  const setProgress = useCallback((taskId, progress) => {
    const patch = {
      progress,
      status: progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending',
    };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, ...patch, updatedAt: new Date().toISOString() }
          : t,
      ),
    );

    if (isAWSConfigured()) {
      DynamoClient.updateTask(storeEmail, taskId, patch)
        .then(() => console.log(`[DynamoDB] UpdateCommand: TASK#${taskId} progress=${progress}`))
        .catch((err) => console.error('[DynamoDB] Progress update failed:', err.message));
    }
  }, [storeEmail]);

  // ---------- Modules (all sync to DynamoDB) ----------
  const upsertModule = useCallback((mod) => {
    setModules((prev) => {
      const exists = prev.some((m) => m.code === mod.code);
      return exists
        ? prev.map((m) => (m.code === mod.code ? { ...m, ...mod } : m))
        : [...prev, mod];
    });

    // Write to DynamoDB (PutCommand)
    if (isAWSConfigured()) {
      DynamoClient.putModule(storeEmail, mod)
        .then(() => console.log(`[DynamoDB] PutCommand: MODULE#${mod.code}`))
        .catch((err) => console.error('[DynamoDB] Module save failed:', err.message));
    }
  }, [storeEmail]);

  const deleteModule = useCallback((code) => {
    setModules((prev) => prev.filter((m) => m.code !== code));

    // Delete from DynamoDB (DeleteCommand)
    if (isAWSConfigured()) {
      DynamoClient.deleteModule(storeEmail, code)
        .then(() => console.log(`[DynamoDB] DeleteCommand: MODULE#${code}`))
        .catch((err) => console.error('[DynamoDB] Module delete failed:', err.message));
    }
  }, [storeEmail]);

  // ---------- Profile / auth ----------
  const updateProfile = useCallback(
    async (patch) => {
      setUser((prev) => ({ ...prev, ...patch }));
      try {
        await CognitoAuth.updateProfile(patch);
        // CognitoAuth.updateProfile already writes to DynamoDB
      } catch {
        /* demo/offline — local state already updated */
      }
    },
    [],
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
    pushToast({ tone: 'success', title: 'Data cleared' });
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
      isLoading,
      isAWSConnected: isAWSConfigured(),
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
      isLoading,
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
