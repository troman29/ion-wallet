import React, { memo } from '../../lib/teact/teact';

import buildClassName from '../../util/buildClassName';
import { round } from '../../util/round';

import styles from './AvailabilityIndicator.module.scss';

interface OwnProps {
  label: string;
  className?: string;
  progress?: number;
}

function AvailabilityIndicator({ label, className, progress }: OwnProps) {
  return (
    <div className={buildClassName(styles.availability, className)}>
      {progress !== undefined ? (
        <div className={styles.progress} style={`--progress: ${round(progress, 2)};`}>
          <div className={styles.amount}>{label}</div>
        </div>
      ) : (
        <div className={styles.soldOut}>{label}</div>
      )}
    </div>
  );
}

export default memo(AvailabilityIndicator);
