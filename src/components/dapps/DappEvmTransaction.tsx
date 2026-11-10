import React, { memo } from '../../lib/teact/teact';

import type { ApiDappTransfer } from '../../api/types';

import buildClassName from '../../util/buildClassName';
import { getChainConfig } from '../../util/chain';
import { toDecimal } from '../../util/decimals';

import useLang from '../../hooks/useLang';

import styles from './Dapp.module.scss';

interface OwnProps {
  transaction: ApiDappTransfer;
}

function DappEvmTransaction({ transaction }: OwnProps) {
  const lang = useLang();
  const { evmPreview, displayedToAddress, amount, networkFee, chain } = transaction;
  const { symbol, decimals } = getChainConfig(chain).nativeToken;
  const fieldClassName = buildClassName(styles.payloadField, styles.payloadField_expanded);

  if (!evmPreview) {
    return <div className={styles.warning}>{lang('Unable to read transaction details.')}</div>;
  }

  const { data, maximumFee } = evmPreview;
  const hasData = data !== '0x';
  const isContractCall = hasData && Boolean(displayedToAddress);
  const methodId = isContractCall && data.length >= 10 ? data.slice(0, 10) : undefined;
  const fee = maximumFee ?? (networkFee > 0n ? networkFee : undefined);

  function formatAmount(value: bigint) {
    return `${toDecimal(value, decimals)} ${symbol}`;
  }

  return (
    <div>
      <p className={styles.label}>{lang(isContractCall ? 'Contract Address' : 'Recipient Address')}</p>
      <div className={fieldClassName}>
        {displayedToAddress || lang('Deploying Contract')}
      </div>

      <p className={styles.label}>{lang('Amount')}</p>
      <div className={fieldClassName}>{formatAmount(amount)}</div>

      {methodId && (
        <>
          <p className={styles.label}>{lang('Method ID')}</p>
          <div className={fieldClassName}>{methodId}</div>
        </>
      )}

      <p className={styles.label}>{lang('Call Data')}</p>
      <div className={buildClassName(fieldClassName, styles.evmCallData)}>{data}</div>

      <p className={styles.label}>{lang(maximumFee !== undefined ? 'Maximum Fee' : 'Estimated Fee')}</p>
      <div className={fieldClassName}>
        {fee !== undefined ? formatAmount(fee) : lang('Fee unavailable')}
      </div>
    </div>
  );
}

export default memo(DappEvmTransaction);
