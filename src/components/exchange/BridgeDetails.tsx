import React, { memo } from '../../lib/teact/teact';

import type { ApiBridgeQuote } from '../../api/types/bridge';

import buildClassName from '../../util/buildClassName';
import { toDecimal } from '../../util/decimals';

import useLang from '../../hooks/useLang';

import styles from './ExchangeModal.module.scss';

interface OwnProps {
  quote: ApiBridgeQuote;
  isReview?: boolean;
}

function BridgeDetails({ quote, isReview = false }: OwnProps) {
  const lang = useLang();
  const isBnb = quote.source === 'bnb';

  return (
    <dl className={buildClassName(styles.details, isReview && styles.reviewDetails)}>
      <div className={styles.detailRow}>
        <dt className={styles.detailLabel}>{lang('Bridge fee')}</dt>
        <dd className={styles.detailValue}>{toDecimal(BigInt(quote.bridgeFee))} ION</dd>
      </div>

      {!isReview && (
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>{lang('Maximum network fee')}</dt>
          <dd className={styles.detailValue}>
            {toDecimal(BigInt(quote.networkFee), isBnb ? 18 : 9)} {isBnb ? 'BNB' : 'ION'}
          </dd>
        </div>
      )}

      <div className={styles.detailRow}>
        <dt className={styles.detailLabel}>{lang('You receive')}</dt>
        <dd className={styles.detailValue}>≈ {toDecimal(BigInt(quote.receiveAmount))} ION</dd>
      </div>
    </dl>
  );
}

export default memo(BridgeDetails);
