import React, { memo } from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import { APP_DOWNLOAD_URLS, APP_NAME, IS_ANDROID_DIRECT, IS_FIREFOX_EXTENSION } from '../../config';
import { openUrl } from '../../util/openUrl';
import { IS_ANDROID_APP, IS_CHROME_EXTENSION, IS_EDGE, IS_IOS_APP, IS_WEB } from '../../util/windowEnvironment';

import useLang from '../../hooks/useLang';

import Button from './Button';
import Modal from './Modal';

import styles from './UpdateAvailable.module.scss';

interface StateProps {
  isAppUpdateAvailable?: boolean;
  isAppUpdateRequired?: boolean;
}

function UpdateAvailable({ isAppUpdateAvailable, isAppUpdateRequired }: StateProps) {
  const lang = useLang();
  const url = IS_ANDROID_DIRECT ? APP_DOWNLOAD_URLS.android
    : IS_ANDROID_APP ? APP_DOWNLOAD_URLS.androidStore
      : IS_IOS_APP ? APP_DOWNLOAD_URLS.ios
        : IS_CHROME_EXTENSION ? APP_DOWNLOAD_URLS[IS_EDGE ? 'edge' : 'chrome']
          : IS_FIREFOX_EXTENSION ? APP_DOWNLOAD_URLS.firefox : APP_DOWNLOAD_URLS.desktop;
  const canUpdate = IS_WEB || Boolean(url);
  const handleClick = () => {
    if (IS_WEB) window.location.reload();
    else if (url) void openUrl(url, { isExternal: true });
  };
  const label = lang('Update %app_name%', { app_name: APP_NAME });

  if (isAppUpdateRequired) {
    return (
      <Modal isOpen noBackdropClose title={label} onClose={() => undefined}>
        <p>{lang(canUpdate ? '$update_required' : '$update_channel_unavailable')}</p>
        {canUpdate && <Button onClick={handleClick}>{label}</Button>}
      </Modal>
    );
  }

  return IS_ANDROID_DIRECT && isAppUpdateAvailable && url ? (
    <button type="button" className={styles.wrapper} onClick={handleClick}>{label}</button>
  ) : undefined;
}

export default memo(withGlobal((global): StateProps => ({
  isAppUpdateAvailable: global.isAppUpdateAvailable,
  isAppUpdateRequired: global.isAppUpdateRequired,
}))(UpdateAvailable));
