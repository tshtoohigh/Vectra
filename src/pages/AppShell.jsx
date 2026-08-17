import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import Topbar from '../components/layout/Topbar.jsx';
import { ToastViewport } from '../components/ui/index.js';
import OnboardingTour_F1 from '../components/OnboardingTour_F1.jsx';
import TaskFormModal from '../components/tasks/TaskFormModal.jsx';
import AiParseModal from '../components/tasks/AiParseModal.jsx';
import TextractUploadModal from '../components/tasks/TextractUploadModal.jsx';
import DecomposeDrawer from '../components/tasks/DecomposeDrawer.jsx';
import { AppProvider, useApp } from '../context/AppContext.jsx';

const SIDEBAR_KEY = 'vectra.sidebarCollapsed';

function ShellInner() {
  const { toasts, dismissToast, tasks } = useApp();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Modal state lives at the shell so both the topbar and any page can open them.
  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [aiParseOpen, setAiParseOpen] = useState(false);
  const [textractOpen, setTextractOpen] = useState(false);
  const [decomposeTask, setDecomposeTask] = useState(null);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Handlers shared with child routes through the Outlet context
  const openNewTask = useCallback(
    (preset = null) => setTaskModal({ open: true, task: preset }),
    [],
  );
  const openEditTask = useCallback((task) => setTaskModal({ open: true, task }), []);
  const closeTaskModal = useCallback(() => setTaskModal({ open: false, task: null }), []);
  const openAiParse = useCallback(() => setAiParseOpen(true), []);
  const openTextract = useCallback(() => setTextractOpen(true), []);
  const openDecompose = useCallback((task) => setDecomposeTask(task), []);

  const outletContext = {
    openNewTask,
    openEditTask,
    openAiParse,
    openTextract,
    openDecompose,
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMobileNav={() => setMobileOpen(true)}
          onNewTask={() => openNewTask()}
          onOpenAiParse={openAiParse}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet context={outletContext} />
          </div>
        </main>
      </div>

      {/* Task creation / editing surfaces */}
      <TaskFormModal open={taskModal.open} task={taskModal.task} onClose={closeTaskModal} />
      <AiParseModal open={aiParseOpen} onClose={() => setAiParseOpen(false)} />
      <TextractUploadModal open={textractOpen} onClose={() => setTextractOpen(false)} />
      <DecomposeDrawer task={decomposeTask} onClose={() => setDecomposeTask(null)} />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <OnboardingTour_F1 taskCount={tasks?.length || 0} isNewUser={tasks?.length === 0} />
    </div>
  );
}

export default function AppShell() {
  return (
    <AppProvider>
      <ShellInner />
    </AppProvider>
  );
}
