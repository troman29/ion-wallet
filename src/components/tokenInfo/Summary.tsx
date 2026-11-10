import React, { memo, useState } from '../../lib/teact/teact';

import type { UserToken } from '../../global/types';
import type { TokenPricePoint } from './sections/Chart';

import buildClassName from '../../util/buildClassName';

import TopActions from '../main/sections/Actions/TopActions';
import Balance from './sections/Balance';
import Chart from './sections/Chart';
import Info from './sections/Info';

import styles from './Summary.module.scss';

interface OwnProps {
  token: UserToken;
  isActive?: boolean;
  className?: string;
}

function Summary({ token, isActive, className }: OwnProps) {
  // Without a selected chart point, Balance uses the current token price feed.
  const [pricePoint, setPricePoint] = useState<TokenPricePoint>();

  return (
    <div className={buildClassName(styles.root, className)}>
      <Balance token={token} pricePoint={pricePoint} />

      <TopActions className={styles.actions} />

      <div className={styles.panels}>
        <Chart
          token={token}
          className={styles.panel}
          onPricePointChange={setPricePoint}
        />
        <Info tokenSlug={token.slug} isActive={isActive} className={styles.panel} />
      </div>
    </div>
  );
}

export default memo(Summary);
