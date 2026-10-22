import React, { memo } from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import { MediaType } from '../../global/types';

import { selectCurrentAccountState } from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { handleUrlClick } from '../../util/openUrl';
import { shortenAddress } from '../../util/shortenAddress';
import { getMarketplaceNftCollectionUrl } from '../../util/url';

import useLang from '../../hooks/useLang';

import styles from './MediaViewer.module.scss';

type OwnProps = {

  mediaId?: string;
};

type StateProps = {
  title?: string;
  description?: string;
  descriptionUrl?: string;
};

function MediaInfo({ title, description, descriptionUrl }: OwnProps & StateProps) {
  const lang = useLang();

  return (
    <div className={styles.mediaInfo}>
      <span className={styles.mediaInfoTitle}>{title}</span>
      {descriptionUrl ? (
        <a
          href={descriptionUrl}
          target="_blank"
          aria-label={lang('Open NFT Collection')}
          className={styles.mediaInfoDescription}
          rel="noreferrer"
          onClick={handleUrlClick}
        >
          <span className={styles.descriptionText}>{description}</span>
          <i className={buildClassName('icon-tooltip', styles.tooltip)} aria-hidden />
        </a>
      ) : <span className={styles.mediaInfoDescription}>{description}</span>}
    </div>
  );
}

export default memo(withGlobal<OwnProps>((global, { mediaId }): StateProps => {
  const { mediaType = MediaType.Nft } = global.mediaViewer || {};

  if (!mediaId || mediaType !== MediaType.Nft) return {};

  const isTestnet = global.settings.isTestnet;

  const { byAddress } = selectCurrentAccountState(global)?.nfts || {};
  const nft = byAddress?.[mediaId];
  if (!nft) return {};

  return {
    title: nft.name || shortenAddress(nft.address, 4),
    description: nft.collectionName,
    descriptionUrl: getMarketplaceNftCollectionUrl(nft.chain, nft.collectionAddress, isTestnet),
  };
})(MediaInfo));
