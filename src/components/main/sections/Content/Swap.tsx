import React, { memo } from '../../../../lib/teact/teact';

import type { ApiSwapActivity } from '../../../../api/types';

import { IONCOIN } from '../../../../config';
import buildClassName from '../../../../util/buildClassName';
import { getChainTitle } from '../../../../util/chain';
import { formatTime } from '../../../../util/dateFormat';
import { toDecimal } from '../../../../util/decimals';
import { formatCurrencyExtended } from '../../../../util/formatNumber';

import useLang from '../../../../hooks/useLang';

import Button from '../../../ui/Button';
import SensitiveData from '../../../ui/SensitiveData';

import styles from './Activity.module.scss';

export const BRIDGE_ACTIVITY_STATUS_LABELS = {
  pending: 'Submitting transfer',
  confirming: 'Confirming on BNB Chain',
  waiting: 'Waiting for bridge confirmations',
  claimable: 'ION is ready to receive',
  claiming: 'Receiving ION on BNB Chain',
  completed: 'Bridge transfer completed',
  failed: 'The bridge transaction failed.',
};

type OwnProps = {
  activity: ApiSwapActivity;
  isLast?: boolean;
  isActive?: boolean;
  isSensitiveDataHidden?: boolean;
  className?: string;
  onClick?: (id: string) => void;
};

function Swap({ activity, isLast, isActive, isSensitiveDataHidden, className, onClick }: OwnProps) {
  const lang = useLang();
  const { operation } = activity;
  const destination = operation.source === 'ton' ? 'bnb' : 'ton';

  return (
    <Button
      isSimple
      className={buildClassName(styles.item, isLast && styles.itemLast, isActive && styles.active,
        onClick && styles.interactive, className)}
      onClick={onClick && (() => onClick(activity.id))}
    >
      <i className={buildClassName(styles.icon, 'icon-swap', styles.colorOut)} aria-hidden />
      <div className={styles.header}>
        <div className={styles.operationName}>{lang('Exchange')}</div>
        <SensitiveData
          isActive={isSensitiveDataHidden}
          min={5}
          max={13}
          seed={activity.id}
          rows={1}
          cellSize={8}
          align="right"
          contentClassName={styles.amount}
        >
          {formatCurrencyExtended(toDecimal(-BigInt(operation.amount), IONCOIN.decimals), IONCOIN.symbol)}
          {' · '}{getChainTitle(operation.source)}
        </SensitiveData>
      </div>
      <div className={styles.subheader}>
        <div className={styles.date} title={lang(BRIDGE_ACTIVITY_STATUS_LABELS[activity.status])}>
          {lang(activity.status === 'completed' ? 'Bridge' : BRIDGE_ACTIVITY_STATUS_LABELS[activity.status])}
          {' · '}{formatTime(activity.timestamp)}
        </div>
        <SensitiveData
          isActive={isSensitiveDataHidden}
          min={5}
          max={13}
          seed={activity.id}
          rows={1}
          cellSize={8}
          align="right"
          contentClassName={buildClassName(styles.amount, styles.colorIn)}
        >
          {formatCurrencyExtended(toDecimal(BigInt(operation.receiveAmount), IONCOIN.decimals), IONCOIN.symbol)}
          {' · '}{getChainTitle(destination)}
        </SensitiveData>
      </div>
    </Button>
  );
}

export default memo(Swap);
