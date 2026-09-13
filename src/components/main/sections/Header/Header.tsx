import React, { memo } from '../../../../lib/teact/teact';
import { withGlobal } from '../../../../global';

import {
  IS_EXTENSION,
  IS_TELEGRAM_APP,
} from '../../../../config';
import {
  selectCurrentAccountId,
  selectHasPassword,
  selectIsCurrentAccountViewMode,
} from '../../../../global/selectors';
import buildClassName from '../../../../util/buildClassName';
import { IS_ELECTRON } from '../../../../util/windowEnvironment';

import { useDeviceScreen } from '../../../../hooks/useDeviceScreen';
import useQrScannerSupport from '../../../../hooks/useQrScannerSupport';

import AccountSelector from './AccountSelector';
import AppLockButton from './actionButtons/AppLockButton';
import BackButton from './actionButtons/BackButton';
import QrScannerButton from './actionButtons/QrScannerButton';
import ToggleFullscreenButton from './actionButtons/ToggleFullscreenButton';
import ToggleLayoutButton from './actionButtons/ToggleLayoutButton';
import ToggleSensitiveDataButton from './actionButtons/ToggleSensitiveDataButton';

import styles from './Header.module.scss';

export const HEADER_HEIGHT_REM = 3;

interface OwnProps {
  isScrolled?: boolean;
  withBalance?: boolean;
  areTabsStuck?: boolean;
}

interface StateProps {
  isViewMode?: boolean;
  isAppLockEnabled?: boolean;
  isSensitiveDataHidden: boolean;
  isFullscreen: boolean;
  isTemporaryAccount: boolean;
}

function Header({
  isViewMode,
  withBalance,
  areTabsStuck,
  isScrolled,
  isAppLockEnabled,
  isSensitiveDataHidden,
  isFullscreen,
  isTemporaryAccount,
}: OwnProps & StateProps) {
  const { isPortrait } = useDeviceScreen();
  const canToggleAppLayout = IS_EXTENSION || IS_ELECTRON;
  const isQrScannerSupported = useQrScannerSupport() && !isViewMode;

  const showBackButton = isTemporaryAccount;
  const headerClassName = buildClassName(
    styles.header,
    areTabsStuck && styles.areTabsStuck,
    isScrolled && styles.isScrolled,
  );

  const buttonsAmount = Math.max(
    1 + (showBackButton ? 1 : 0) + (isAppLockEnabled ? 1 : 0),
    (isQrScannerSupported ? 1 : 0) + (canToggleAppLayout ? 1 : 0) + (IS_TELEGRAM_APP ? 1 : 0),
  );

  const actionsStartClassName = isPortrait
    ? styles.portraitActionsLeft
    : buildClassName(
      styles.landscapeActions,
      styles.landscapeActionsStart,
      styles[`landscapeActionsButtons${buttonsAmount}`],
    );
  const actionsEndClassName = isPortrait
    ? styles.portraitActionsRight
    : buildClassName(
      styles.landscapeActions,
      styles.landscapeActionsEnd,
      buttonsAmount > 1 && styles[`landscapeActionsButtons${buttonsAmount}`],
    );

  return (
    <div className={headerClassName}>
      <div className={styles.headerInner} style={`--icons-amount: ${buttonsAmount}`}>
        <div className={actionsStartClassName}>
          {showBackButton && <BackButton isIconOnly />}
          <ToggleSensitiveDataButton isSensitiveDataHidden={isSensitiveDataHidden} />
          {isAppLockEnabled && <AppLockButton />}
        </div>

        <AccountSelector withBalance={withBalance} withAccountSelector />

        <div className={actionsEndClassName}>
          <QrScannerButton isViewMode={isViewMode} />
          {IS_TELEGRAM_APP && <ToggleFullscreenButton isFullscreen={isFullscreen} />}
          {canToggleAppLayout && <ToggleLayoutButton />}
        </div>
      </div>
    </div>
  );
}

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const {
      isFullscreen,
      currentTemporaryViewAccountId,
      settings: {
        isAppLockEnabled,
        isSensitiveDataHidden,
      },
    } = global;

    const hasPassword = selectHasPassword(global);
    const isViewMode = selectIsCurrentAccountViewMode(global);

    return {
      isViewMode,
      isAppLockEnabled: isAppLockEnabled && hasPassword,
      isFullscreen: Boolean(isFullscreen),
      isSensitiveDataHidden: Boolean(isSensitiveDataHidden),
      isTemporaryAccount: Boolean(currentTemporaryViewAccountId),
    };
  },
  (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)),
)(Header));
