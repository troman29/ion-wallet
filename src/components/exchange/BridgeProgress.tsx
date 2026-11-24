import React, { memo } from '../../lib/teact/teact';

import type { ApiBridgeStatus, ApiBridgeTransfer } from '../../api/types/bridge';

import buildClassName from '../../util/buildClassName';
import { BRIDGE_CONFIRMATIONS } from '../../api/bridge/config';

import useLang from '../../hooks/useLang';

import styles from './BridgeProgress.module.scss';

interface OwnProps {
  transfer: ApiBridgeTransfer;
  statusText: string;
}

const BRIDGE_STEPS = ['Send ION', 'Bridge confirmations', 'Receive ION'];
const STEP_BY_STATUS = {
  pending: 0,
  confirming: 1,
  waiting: 1,
  claimable: 2,
  claiming: 2,
  completed: 3,
  failed: 0,
} satisfies Record<ApiBridgeStatus, number>;

function BridgeProgress({ transfer, statusText }: OwnProps) {
  const lang = useLang();

  const { status } = transfer;
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const currentStep = STEP_BY_STATUS[status];
  const confirmationCount = status === 'confirming'
    ? `${transfer.confirmations ?? 0}/${BRIDGE_CONFIRMATIONS}`
    : status === 'waiting' && transfer.requiredVotes
      ? `${transfer.votes ?? 0}/${transfer.requiredVotes}` : undefined;

  return (
    <div
      className={buildClassName(styles.textBlock, styles.textBlock_gap, isCompleted && styles.textBlock_success)}
      role="list"
      aria-label={lang('Bridge')}
      aria-live="polite"
    >
      {BRIDGE_STEPS.map((label, index) => {
        const isCurrent = index === currentStep;
        const isDone = index < currentStep;

        return (
          <div
            key={label}
            role="listitem"
            aria-current={isCurrent ? 'step' : undefined}
            className={buildClassName(
              styles.text,
              (isDone || (isCurrent && !isFailed)) && styles.text_connected,
              isCurrent && isFailed && styles.text_failed,
              isCompleted && styles.text_success,
            )}
          >
            <i className={buildClassName(styles.textIcon, isDone ? 'icon-accept' : 'icon-dot')} aria-hidden />
            <span>{isCurrent ? statusText : lang(label)}</span>
            {isCurrent && confirmationCount && <span className={styles.counter}>{confirmationCount}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default memo(BridgeProgress);
