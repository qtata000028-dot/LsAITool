/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

import { AppRouter } from './app/router/app-router';
import type { AuthSession } from './lib/backend-auth';
import { clearAuthSession, getStoredAuthSession } from './lib/auth-session';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession());

  const handleLogout = () => {
    clearAuthSession();
    setSession(null);
  };

  return <AppRouter session={session} onLogin={setSession} onLogout={handleLogout} />;
}
