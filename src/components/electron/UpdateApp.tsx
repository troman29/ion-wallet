import React, {
  memo, useEffect, useState,
} from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import { ElectronEvent } from '../../electron/types';

import { APP_DOWNLOAD_URLS, APP_NAME } from '../../config';
import buildClassName from '../../util/buildClassName';

import useFlag from '../../hooks/useFlag';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useShowTransition from '../../hooks/useShowTransition';

import Button from '../ui/Button';
import Portal from '../ui/Portal';

import styles from './UpdateApp.module.scss';

type StateProps = {
  isAppUpdateAvailable?: boolean;
  isAppUpdateRequired?: boolean;
};

function UpdateApp({ isAppUpdateAvailable, isAppUpdateRequired }: StateProps) {
  const lang = useLang();

  const [isElectronUpdateDownloaded, setIsElectronUpdateDownloaded] = useState(false);
  const [isElectronAutoUpdateEnabled, setIsElectronAutoUpdateEnabled] = useState(false);
  const [isDisabled, disable] = useFlag(false);
  const [hasUpdateError, setHasUpdateError] = useState(false);
  const canInstall = isElectronAutoUpdateEnabled && isElectronUpdateDownloaded;
  const canReload = isElectronAutoUpdateEnabled && isAppUpdateAvailable;

  useEffect(() => {
    const removeUpdateErrorListener = window.electron?.on?.(ElectronEvent.UPDATE_ERROR, () => {
      setIsElectronUpdateDownloaded(false);
      setHasUpdateError(true);
    });
    const removeUpdateDownloadedListener = window.electron?.on?.(ElectronEvent.UPDATE_DOWNLOADED, () => {
      setIsElectronUpdateDownloaded(true);
      setHasUpdateError(false);
    });

    void window.electron?.getIsAutoUpdateEnabled?.().then(setIsElectronAutoUpdateEnabled);

    return () => {
      removeUpdateErrorListener?.();
      removeUpdateDownloadedListener?.();
    };
  }, []);

  const handleClick = useLastCallback(async () => {
    if (isDisabled) {
      return;
    }

    if (canInstall) {
      disable();
      await window.electron?.installUpdate?.();
      return;
    }

    if (canReload) {
      window.location.reload();
      return;
    }

    if (APP_DOWNLOAD_URLS.desktop) window.open(APP_DOWNLOAD_URLS.desktop, '_blank', 'noopener');
  });

  const { ref, shouldRender } = useShowTransition({
    isOpen: (isElectronAutoUpdateEnabled || Boolean(APP_DOWNLOAD_URLS.desktop))
      && (isElectronUpdateDownloaded || isAppUpdateAvailable),
    withShouldRender: true,
  });

  if (isAppUpdateRequired) {
    const hasChannel = canReload || Boolean(APP_DOWNLOAD_URLS.desktop)
      || (isElectronAutoUpdateEnabled && !hasUpdateError);
    const label = lang('Update %app_name%', { app_name: APP_NAME });

    return (
      <Portal>
        <section className={styles.required} role="alert" aria-labelledby="required-app-update-title">
          <h2 id="required-app-update-title">{label}</h2>
          <p>{lang(hasChannel ? '$update_required' : '$update_channel_unavailable')}</p>
          {(canInstall || canReload || APP_DOWNLOAD_URLS.desktop) && (
            <Button isDisabled={isDisabled} onClick={handleClick}>{label}</Button>
          )}
        </section>
      </Portal>
    );
  }

  if (!shouldRender) {
    return null; // eslint-disable-line no-null/no-null
  }

  return (
    <div
      ref={ref}
      className={buildClassName(
        styles.container,
        isDisabled && styles.disabled,
      )}
      onClick={handleClick}
    >
      <div className={styles.iconWrapper}>
        <i className={buildClassName('icon-update', styles.icon)} />
      </div>

      <div className={styles.text}>{lang('Update %app_name%', { app_name: APP_NAME })}</div>
    </div>
  );
}

export default memo(withGlobal((global): StateProps => {
  const { isAppUpdateAvailable, isAppUpdateRequired } = global;

  return { isAppUpdateAvailable, isAppUpdateRequired };
})(UpdateApp));
