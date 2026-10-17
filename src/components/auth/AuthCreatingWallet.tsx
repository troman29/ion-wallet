import React, { memo } from '../../lib/teact/teact';

import buildClassName from '../../util/buildClassName';
import { ANIMATED_STICKERS_PATHS } from '../ui/helpers/animatedAssets';

import useLang from '../../hooks/useLang';

import AnimatedIconWithPreview from '../ui/AnimatedIconWithPreview';

import styles from './Auth.module.scss';

interface OwnProps {
  isActive?: boolean;
}

const AuthCreatingWallet = ({ isActive }: OwnProps) => {
  const lang = useLang();

  return (
    <div className={buildClassName(styles.container, 'custom-scroll')}>
      <AnimatedIconWithPreview
        play={isActive}
        tgsUrl={ANIMATED_STICKERS_PATHS.hello}
        previewUrl={ANIMATED_STICKERS_PATHS.helloPreview}
        nonInteractive
        noLoop={false}
      />
      <div className={styles.title}>{lang('Creating Wallet...')}</div>
    </div>
  );
};

export default memo(AuthCreatingWallet);
