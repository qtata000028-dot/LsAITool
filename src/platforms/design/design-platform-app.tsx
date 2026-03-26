import { lazy, Suspense } from 'react';

import type { DesignFixedRoute } from '../../app/contracts/platform-routing';
import type { PlatformDefinition } from '../../app/registry/platform-registry';
import { AppLoadingScreen } from '../../app/shells/app-loading-screen';
import { DesignBillPage } from './routes/design-bill-page';
import { DesignModulePage } from './routes/design-module-page';
import { DesignSettingsPage } from './routes/design-settings-page';

const Dashboard = lazy(() => import('../../components/Dashboard'));

type DesignPlatformAppProps = {
  currentPath: string;
  currentUserName: string;
  onLogout: () => void;
  platform: PlatformDefinition;
  route: DesignFixedRoute;
};

export function DesignPlatformApp({
  currentPath,
  currentUserName,
  onLogout,
  platform,
  route,
}: DesignPlatformAppProps) {
  switch (route.routeKey) {
    case 'workspace':
      return (
        <Suspense fallback={<AppLoadingScreen title="Loading Design Studio" description="Preparing the design workspace and dashboard bundle." />}>
          <Dashboard currentUserName={currentUserName} onLogout={onLogout} routeContext={route.context} />
        </Suspense>
      );
    case 'module':
      return <DesignModulePage currentPath={currentPath} platform={platform} route={route} />;
    case 'bill':
      return <DesignBillPage currentPath={currentPath} platform={platform} />;
    case 'settings':
      return <DesignSettingsPage currentPath={currentPath} platform={platform} />;
    default:
      return null;
  }
}
