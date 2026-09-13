import React, { memo, useMemo } from '../../lib/teact/teact';
import { getActions } from '../../global';

import buildClassName from '../../util/buildClassName';
import { SECOND } from '../../util/dateFormat';
import { openUrl } from '../../util/openUrl';

import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import Image from '../ui/Image';

import dappStyles from '../dapps/Dapp.module.scss';
import styles from './DappFeed.module.scss';

interface OwnProps {
  iconUrl: string;
  name: string;
  url: string;
  mode: 'pill' | 'tile';
  isExternal: boolean;
}

const RERENDER_DAPPS_FEED_DELAY_MS = SECOND;

function DappFeedItem({
  iconUrl,
  name,
  url,
  mode,
  isExternal,
}: OwnProps) {
  const { updateDappLastOpenedAt } = getActions();

  const lang = useLang();

  function renderIcon() {
    const iconClassName = mode === 'pill' ? styles.iconPill : styles.iconTile;

    const fallbackIcon = useMemo(() => (
      <div className={buildClassName(dappStyles.dappLogo, dappStyles.dappLogoIcon, iconClassName)}>
        <i className={buildClassName(styles.fallbackIcon, 'icon-laptop')} aria-hidden />
      </div>
    ), [iconClassName]);

    return (
      <Image
        url={iconUrl}
        className={iconClassName}
        imageClassName={styles.icon}
        alt={lang('Icon')}
        fallback={fallbackIcon}
      />
    );
  }

  const openDapp = useLastCallback(async () => {
    await openUrl(url, { isExternal });

    setTimeout(() => void updateDappLastOpenedAt({ url }), RERENDER_DAPPS_FEED_DELAY_MS);
  });

  return (
    <button
      type="button"
      className={buildClassName(styles.dapp, mode === 'pill' ? styles.dappPill : styles.dappTile)}
      onClick={openDapp}
    >
      {renderIcon()}
      <span className={styles.dappName}>{name}</span>
    </button>
  );
}

export default memo(DappFeedItem);
