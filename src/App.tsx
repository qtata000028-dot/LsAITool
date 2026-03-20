/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import type { AuthSession } from './lib/backend-auth';
import { clearAuthSession, getStoredAuthSession } from './lib/auth-session';

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

  return isDebugDashboard || session ? (
    <Dashboard
      currentUserName={session?.employeeName || session?.username || '当前用户'}
      onLogout={handleLogout}
    />
  ) : (
    <Login onLogin={setSession} />
  );
}
