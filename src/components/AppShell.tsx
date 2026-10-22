import type { TeactNode } from '../lib/teact/teact';
import React, { memo } from '../lib/teact/teact';

import { IS_ELECTRON } from '../util/windowEnvironment';

import ElectronHeader from './electron/ElectronHeader';
import UpdateAvailable from './ui/UpdateAvailable';

interface OwnProps {
  isUpdateRequired?: boolean;
  children: TeactNode;
}

function AppShell({ isUpdateRequired, children }: OwnProps) {
  return (
    <>
      {/* Keep the native updater subscribed and the window controls mounted while wallet screens are blocked. */}
      {IS_ELECTRON && <ElectronHeader withTitle />}
      {isUpdateRequired ? (!IS_ELECTRON && <UpdateAvailable />) : children}
    </>
  );
}

export default memo(AppShell);
