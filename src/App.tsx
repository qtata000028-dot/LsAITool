/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useState } from 'react';
import Login from './components/Login';
import type { AuthSession } from './lib/backend-auth';
import { clearAuthSession, getStoredAuthSession } from './lib/auth-session';

const Dashboard = lazy(() => import('./components/Dashboard'));

function DashboardLoadingState() {
  return (
    <div className="main-gradient flex min-h-screen items-center justify-center p-6 text-slate-900">
      <div className="glass-card w-full max-w-sm rounded-3xl p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <h1 className="mb-2 text-lg font-bold text-slate-900">正在进入工作台</h1>
        <p className="text-sm text-slate-500">正在加载模块与配置能力，请稍候。</p>
      </div>
    </div>
  );
}

export default function App() {
  const [isDebugDashboard, setIsDebugDashboard] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'dashboard';
  });

  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession());

  const handleLogout = () => {
    clearAuthSession();
    setSession(null);
    setIsDebugDashboard(false);
  };

  if (!isDebugDashboard && !session) {
    return <Login onLogin={setSession} />;
  }

  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <Dashboard
        currentUserName={session?.employeeName || session?.username || '当前用户'}
        onLogout={handleLogout}
      />
    </Suspense>
  );
}
