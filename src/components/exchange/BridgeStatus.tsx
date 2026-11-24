import React, { memo } from '../../lib/teact/teact';

import type { ApiBridgeTransfer } from '../../api/types/bridge';

import { ANIMATED_STICKER_SMALL_SIZE_PX, IONCOIN } from '../../config';
import buildClassName from '../../util/buildClassName';
import { toDecimal } from '../../util/decimals';
import { openUrl } from '../../util/openUrl';
import { getViewTransactionUrl } from '../../util/url';
import { ANIMATED_STICKERS_PATHS } from '../ui/helpers/animatedAssets';
import { getBridgeDestination, NETWORK_NAMES } from './helpers';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';

import TransferResult from '../common/TransferResult';
import AmountWithFeeTextField from '../ui/AmountWithFeeTextField';
import AnimatedIconWithPreview from '../ui/AnimatedIconWithPreview';
import Button from '../ui/Button';
import InteractiveTextField from '../ui/InteractiveTextField';
import ModalHeader from '../ui/ModalHeader';
import BridgeProgress from './BridgeProgress';

import resultStyles from '../common/TransferResult.module.scss';
import transferStyles from '../transfer/Transfer.module.scss';
import modalStyles from '../ui/Modal.module.scss';

const BRIDGE_STATUS_LABELS = {
  pending: 'Submitting transfer',
  confirming: 'Confirming on BNB Chain',
  waiting: 'Waiting for bridge confirmations',
  claimable: 'ION is ready to receive',
  claiming: 'Receiving ION on BNB Chain',
  completed: 'Bridge transfer completed',
  failed: 'The bridge transaction failed.',
};

interface OwnProps {
  transfer: ApiBridgeTransfer;
  isLoading?: boolean;
  isTestnet?: boolean;
  error?: string;
  onClaim: NoneToVoidFunction;
  onRefresh: NoneToVoidFunction;
  onNewTransfer: NoneToVoidFunction;
  onClose: NoneToVoidFunction;
}

function BridgeStatus({
  transfer,
  isLoading = false,
  isTestnet = false,
  error,
  onClaim,
  onRefresh,
  onNewTransfer,
  onClose,
}: OwnProps) {
  const lang = useLang();

  const { status } = transfer;
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isClaimable = status === 'claimable';
  const isPending = !isCompleted && !isFailed && !isClaimable;
  const destination = getBridgeDestination(transfer.source);
  const txId = transfer.serverDestinationTxHash ?? transfer.claimTxId ?? transfer.serverSourceTxHash ?? transfer.txId;
  const txChain = transfer.serverDestinationTxHash ? destination : transfer.claimTxId ? 'bnb' : transfer.source;
  const statusText = lang(BRIDGE_STATUS_LABELS[status]);

  useHistoryBack({ isActive: true, onBack: onClose });

  function handleViewTransaction() {
    if (txId) {
      void openUrl(getViewTransactionUrl(txChain, txId, isTestnet), { isExternal: true });
    }
  }

  return (
    <>
      <ModalHeader
        title={lang(isCompleted ? 'Bridge transfer completed' : isFailed ? 'Failed' : 'Bridge')}
        onClose={onClose}
      />

      <div className={modalStyles.transitionContent}>
        {isCompleted ? (
          <>
            <TransferResult
              playAnimation
              amount={BigInt(transfer.receiveAmount)}
              tokenSymbol={IONCOIN.symbol}
              decimals={IONCOIN.decimals}
              noSign
              firstButtonText={txId ? lang('Details') : undefined}
              secondButtonText={lang('New bridge transfer')}
              onFirstButtonClick={handleViewTransaction}
              onSecondButtonClick={onNewTransfer}
            />

            <BridgeProgress transfer={transfer} statusText={statusText} />
          </>
        ) : (
          <>
            <AnimatedIconWithPreview
              size={ANIMATED_STICKER_SMALL_SIZE_PX}
              play
              noLoop={false}
              nonInteractive
              className={resultStyles.sticker}
              tgsUrl={isFailed ? ANIMATED_STICKERS_PATHS.noData : ANIMATED_STICKERS_PATHS.wait}
              previewUrl={isFailed ? ANIMATED_STICKERS_PATHS.noDataPreview : ANIMATED_STICKERS_PATHS.waitPreview}
            />
            <BridgeProgress transfer={transfer} statusText={statusText} />

            <AmountWithFeeTextField
              label={lang(isFailed ? 'Amount' : 'You receive')}
              amount={toDecimal(BigInt(isFailed ? transfer.amount : transfer.receiveAmount))}
              symbol={IONCOIN.symbol}
              fractionDigits={IONCOIN.decimals}
            />

            <div className={transferStyles.label}>{lang('Your receiving address')}</div>
            <InteractiveTextField
              chain={destination}
              address={transfer.toAddress}
              forceFullAddress
              className={transferStyles.addressWidget}
              copyNotification={lang('%chain% Address Copied', {
                chain: NETWORK_NAMES[destination],
              }) as string}
            />

            {isPending && (
              <div className={modalStyles.text}>
                {lang('You can close this window. Your bridge transfer is saved.')}
              </div>
            )}

            {transfer.error && (
              <div className={transferStyles.error} role="alert">{lang(transfer.error)}</div>
            )}

            <div className={resultStyles.buttons}>
              {txId && (
                <Button className={resultStyles.button} onClick={handleViewTransaction}>
                  {lang('Details')}
                </Button>
              )}

              <Button className={resultStyles.button} onClick={onRefresh}>
                {lang('Refresh status')}
              </Button>
            </div>
          </>
        )}

        {error && <div className={transferStyles.error} role="alert">{lang(error)}</div>}

        <div className={buildClassName(modalStyles.buttons, modalStyles.buttonsInsideContentWithScroll)}>
          <Button className={modalStyles.button} onClick={onClose} isPrimary={!isClaimable && !isFailed}>
            {lang('Close')}
          </Button>

          {isClaimable && (
            <Button className={modalStyles.button} isPrimary isLoading={isLoading} onClick={onClaim}>
              {lang('Receive ION')}
            </Button>
          )}

          {isFailed && (
            <Button className={modalStyles.button} isPrimary onClick={onNewTransfer}>
              {lang('New bridge transfer')}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export default memo(BridgeStatus);
