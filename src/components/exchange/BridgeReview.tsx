import React, { memo } from '../../lib/teact/teact';

import type { BridgeOperation } from './types';

import buildClassName from '../../util/buildClassName';
import { toDecimal } from '../../util/decimals';
import { getBridgeDestination, getOperationDetails, NETWORK_NAMES, QUOTE_EXPIRED_ERROR } from './helpers';

import useLang from '../../hooks/useLang';

import AmountWithFeeTextField from '../ui/AmountWithFeeTextField';
import Button from '../ui/Button';
import Fee from '../ui/Fee';
import InteractiveTextField from '../ui/InteractiveTextField';
import BridgeDetails from './BridgeDetails';

import transferStyles from '../transfer/Transfer.module.scss';
import modalStyles from '../ui/Modal.module.scss';
import styles from './ExchangeModal.module.scss';

interface OwnProps {
  operation: BridgeOperation;
  isExpired?: boolean;
  error?: string;
  onConfirm: NoneToVoidFunction;
}

function BridgeReview({
  operation,
  isExpired = false,
  error,
  onConfirm,
}: OwnProps) {
  const lang = useLang();
  const {
    quote,
    amount,
    fee,
    token,
  } = getOperationDetails(operation);
  const destination = getBridgeDestination(quote.source);

  return (
    <div className={modalStyles.transitionContent}>
      <p className={styles.reviewRoute}>{NETWORK_NAMES[quote.source]} → {NETWORK_NAMES[destination]}</p>
      <div className={transferStyles.label}>{lang('Your receiving address')}</div>
      <InteractiveTextField
        chain={destination}
        address={quote.toAddress}
        copyNotification={lang('%chain% Address Copied', { chain: NETWORK_NAMES[destination] }) as string}
        className={transferStyles.addressWidget}
        forceFullAddress
      />

      <AmountWithFeeTextField
        label={lang('Amount')}
        amount={toDecimal(BigInt(amount))}
        symbol="ION"
        fractionDigits={9}
        feeText={(
          <Fee
            terms={{ native: BigInt(fee) }}
            precision="lessThan"
            token={token}
            symbolClassName={transferStyles.currencySymbol}
          />
        )}
      />

      <BridgeDetails quote={quote} isReview />
      {quote.source === 'ton' && (
        <p className={buildClassName(styles.note, styles.receivingNote)}>
          {lang('Receiving on BNB Chain may require a second confirmation and BNB for gas.')}
        </p>
      )}

      <div className={styles.footer}>
        {(isExpired || error) && <p className={styles.error}>{lang(isExpired ? QUOTE_EXPIRED_ERROR : error!)}</p>}

        <div className={buildClassName(modalStyles.buttons, modalStyles.buttonsNoExtraSpace)}>
          <Button isPrimary className={modalStyles.buttonFullWidth} isDisabled={isExpired} onClick={onConfirm}>
            {lang(operation.type === 'claim' ? 'Receive ION' : 'Continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(BridgeReview);
