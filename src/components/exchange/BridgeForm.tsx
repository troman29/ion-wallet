import React, { memo } from '../../lib/teact/teact';

import type { ApiBridgeQuote, ApiBridgeSource } from '../../api/types/bridge';

import buildClassName from '../../util/buildClassName';
import { toDecimal } from '../../util/decimals';
import { shortenAddress } from '../../util/shortenAddress';
import { getBridgeDestination, getBridgeToken, isQuoteError, NETWORK_NAMES } from './helpers';

import useLang from '../../hooks/useLang';

import SelectTokenButton from '../common/SelectTokenButton';
import Button from '../ui/Button';
import RichNumberInput from '../ui/RichNumberInput';
import BridgeDetails from './BridgeDetails';

import modalStyles from '../ui/Modal.module.scss';
import styles from './ExchangeModal.module.scss';

interface OwnProps {
  source: ApiBridgeSource;
  amount: string;
  balanceQuote?: ApiBridgeQuote;
  quote?: ApiBridgeQuote;
  isQuoteValid: boolean;
  isQuoting: boolean;
  areTransfersLoaded: boolean;
  isTestnet?: boolean;
  amountError?: string;
  error?: string;
  onAmountChange: (value?: string) => void;
  onMax: NoneToVoidFunction;
  onSwitch: NoneToVoidFunction;
  onReview: NoneToVoidFunction;
  onRefresh: NoneToVoidFunction;
}

function BridgeForm({
  source,
  amount,
  balanceQuote,
  quote,
  isQuoteValid,
  isQuoting,
  areTransfersLoaded,
  isTestnet = false,
  amountError,
  error,
  onAmountChange,
  onMax,
  onSwitch,
  onReview,
  onRefresh,
}: OwnProps) {
  const lang = useLang();
  const destination = getBridgeDestination(source);

  return (
    <div className={buildClassName(styles.content, styles.form)}>
      <div className={styles.swapFields}>
        <div className={styles.inputContainer}>
          <Button isSimple isText className={styles.maxButton} isDisabled={!balanceQuote} onClick={onMax}>
            {lang('Max')}: {balanceQuote ? toDecimal(BigInt(balanceQuote.maxAmount)) : '—'} ION
          </Button>
          <RichNumberInput
            id="bridge-amount"
            value={amount}
            onChange={onAmountChange}
            hasError={Boolean(amountError)}
            decimals={9}
            labelText={lang('You send')}
            className={styles.amountInput}
            labelClassName={styles.inputLabel}
            cornerClassName={styles.swapCornerTop}
          >
            <SelectTokenButton token={getBridgeToken(source)} />
          </RichNumberInput>
        </div>

        <div className={styles.swapButtonWrapper}>
          <Button
            isSimple
            className={styles.switchButton}
            ariaLabel={lang('Switch bridge direction')}
            onClick={onSwitch}
          >
            <i className="icon-swap" aria-hidden />
          </Button>
        </div>

        <div className={styles.inputContainer}>
          <RichNumberInput
            id="bridge-receive"
            value={isQuoteValid ? toDecimal(BigInt(quote!.receiveAmount)) : undefined}
            labelText={lang('You receive')}
            className={styles.receiveInput}
            labelClassName={styles.inputLabel}
            cornerClassName={styles.swapCornerBottom}
            decimals={9}
            disabled
            isLoading={isQuoting}
          >
            <SelectTokenButton token={getBridgeToken(destination)} />
          </RichNumberInput>
        </div>
      </div>

      <div className={styles.route}>
        <span>{NETWORK_NAMES[source]} → {NETWORK_NAMES[destination]}{isTestnet ? ' · Testnet' : ''}</span>
        <span>{lang('Your wallet')} · {balanceQuote ? shortenAddress(balanceQuote.toAddress) : '—'}</span>
      </div>

      <div className={styles.footer}>
        {isQuoteValid ? <BridgeDetails quote={quote!} /> : (
          <p className={buildClassName(styles.note, styles.minimumAmount)}>
            {lang('Minimum bridge amount is 10 ION.')}
          </p>
        )}

        {error && !amountError && <p className={styles.error} role="alert">{lang(error)}</p>}

        <Button
          isPrimary
          className={modalStyles.buttonFullWidth}
          isLoading={isQuoting && !amountError}
          isDisabled={!isQuoteValid || !areTransfersLoaded}
          onClick={onReview}
        >
          {lang(amountError ?? 'Review transfer')}
        </Button>

        {error && !amountError && !isQuoteError(error) ? (
          <Button isText onClick={onRefresh}>{lang('Try Again')}</Button>
        ) : !isQuoting && quote && !isQuoteValid && (
          <Button isText onClick={onRefresh}>{lang('Refresh')}</Button>
        )}
      </div>
    </div>
  );
}

export default memo(BridgeForm);
