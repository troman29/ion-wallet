import React, { memo } from '../../lib/teact/teact';

import buildClassName from '../../util/buildClassName';
import { ANIMATED_STICKERS_PATHS } from '../ui/helpers/animatedAssets';

import useLang from '../../hooks/useLang';

import AnimatedIconWithPreview from '../ui/AnimatedIconWithPreview';

import styles from './CustomizeWalletModal.module.scss';

function EmptyState() {
  const lang = useLang();

  return (
    <div className={styles.section}>
      <div className={styles.sectionSelectCard}>
        <div className={styles.icon}>
          <i className={buildClassName('icon-cards-empty', styles.iconImage)} aria-hidden />
        </div>
        <AnimatedIconWithPreview
          play
          tgsUrl={ANIMATED_STICKERS_PATHS.noData}
          previewUrl={ANIMATED_STICKERS_PATHS.noDataPreview}
          noLoop={false}
          nonInteractive
        />
        <h3 className={styles.emptyTitle}>
          {lang('You don\'t have any cards to customize yet')}
        </h3>
        <p className={styles.helperTextInside}>
          {lang(
            'My Wallet Cards can be installed for wallets and displayed on the home screen and in the wallet list.',
          )}
        </p>
      </div>
    </div>
  );
}

export default memo(EmptyState);
