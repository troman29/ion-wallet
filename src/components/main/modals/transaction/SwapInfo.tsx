import React, { memo } from '../../../../lib/teact/teact';
import { getActions } from '../../../../global';

import type { ApiSwapActivity } from '../../../../api/types';

import { BNB, IONCOIN } from '../../../../config';
import { getChainTitle } from '../../../../util/chain';
import { toDecimal } from '../../../../util/decimals';
import { openUrl } from '../../../../util/openUrl';
import { getViewTransactionUrl } from '../../../../util/url';

import useLang from '../../../../hooks/useLang';

import AmountWithFeeTextField from '../../../ui/AmountWithFeeTextField';
import Button from '../../../ui/Button';
import InteractiveTextField from '../../../ui/InteractiveTextField';
import ModalHeader from '../../../ui/ModalHeader';
import { BRIDGE_ACTIVITY_STATUS_LABELS } from '../../sections/Content/Swap';

import transferStyles from '../../../transfer/Transfer.module.scss';
import modalStyles from '../../../ui/Modal.module.scss';

type OwnProps = {
  activity: ApiSwapActivity;
  isViewMode?: boolean;
  onClose: NoneToVoidFunction;
  onBack?: NoneToVoidFunction;
};

function SwapInfo({ activity, isViewMode, onClose, onBack }: OwnProps) {
  const lang = useLang();
  const { operation } = activity;
  const destination = operation.source === 'ton' ? 'bnb' : 'ton';
  const refunds = new Map(operation.components.filter((component) => component.role === 'ack'
    && component.chain === 'ton' && component.token === 'native' && /^\d+$/.test(component.amount ?? ''))
    .map((component) => [
      component.messageHash ?? `${component.hash}:${component.toAddress}:${component.amount}`, component,
    ]));
  const refundAmount = [...refunds.values()].reduce((sum, component) => sum + BigInt(component.amount!), 0n);

  function handleClaim() {
    onClose();
    getActions().startExchange({ source: operation.source, bridgeOperationId: operation.id });
  }

  return (
    <>
      <ModalHeader title={lang('Exchange')} onClose={onClose} onBackButtonClick={onBack} />
      <div className={modalStyles.transitionContent}>
        <div className={modalStyles.text}>{lang(BRIDGE_ACTIVITY_STATUS_LABELS[activity.status])}</div>
        <AmountWithFeeTextField
          label={`${lang('You send')} · ${getChainTitle(operation.source)}`}
          amount={toDecimal(BigInt(operation.amount), IONCOIN.decimals)}
          symbol={IONCOIN.symbol}
          fractionDigits={IONCOIN.decimals}
        />
        <InteractiveTextField
          chain={operation.source}
          address={operation.fromAddress}
          forceFullAddress
          className={transferStyles.addressWidget}
        />
        <AmountWithFeeTextField
          label={`${lang('You receive')} · ${getChainTitle(destination)}`}
          amount={toDecimal(BigInt(operation.receiveAmount), IONCOIN.decimals)}
          symbol={IONCOIN.symbol}
          fractionDigits={IONCOIN.decimals}
        />
        <InteractiveTextField
          chain={destination}
          address={operation.toAddress}
          forceFullAddress
          className={transferStyles.addressWidget}
        />
        {operation.bridgeFee !== undefined && (
          <AmountWithFeeTextField
            label={lang('Bridge fee')}
            amount={toDecimal(BigInt(operation.bridgeFee), IONCOIN.decimals)}
            symbol={IONCOIN.symbol}
            fractionDigits={IONCOIN.decimals}
          />
        )}
        {refundAmount > 0n && (
          <AmountWithFeeTextField
            label={lang('Refunded')}
            amount={toDecimal(refundAmount, IONCOIN.decimals)}
            symbol={IONCOIN.symbol}
            fractionDigits={IONCOIN.decimals}
          />
        )}
        {operation.fees.map((fee) => {
          const token = fee.chain === 'ton' ? IONCOIN : BNB;

          return (
            <AmountWithFeeTextField
              key={`${fee.chain}:${fee.transactionHash}`}
              label={`${lang('Fee')} · ${getChainTitle(fee.chain)}`}
              amount={toDecimal(BigInt(fee.amount), token.decimals)}
              symbol={token.symbol}
              fractionDigits={token.decimals}
            />
          );
        })}
        {[operation.sourceTransaction, operation.destinationTransaction].map((reference) => reference && (
          <Button
            key={`${reference.chain}:${reference.hash}`}
            isText
            onClick={() => void openUrl(getViewTransactionUrl(reference.chain, reference.hash,
              operation.network === 'testnet'), { isExternal: true })}
          >
            {lang('Details')} · {getChainTitle(reference.chain)}
          </Button>
        ))}
        {activity.status !== 'completed' && activity.status !== 'failed' && !isViewMode && (
          <Button isPrimary className={modalStyles.button} onClick={handleClaim}>
            {lang(activity.status === 'claimable' ? 'Receive ION' : 'Continue')}
          </Button>
        )}
      </div>
    </>
  );
}

export default memo(SwapInfo);
