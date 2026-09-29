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
  className?: string;
}

function Summary({ token, className }: OwnProps) {
  // The balance follows the point under the cursor, so the chart reports the point up to here
  const [pricePoint, setPricePoint] = useState<TokenPricePoint>();

  const { slug } = token;

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
        <Info tokenSlug={slug} className={styles.panel} />
      </div>
    </div>
  );
}

export default memo(Summary);
