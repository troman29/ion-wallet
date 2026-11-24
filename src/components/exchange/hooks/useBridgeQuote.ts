import { useEffect, useState } from '../../../lib/teact/teact';

import type { ApiBalanceBySlug } from '../../../api/types';
import type { ApiBridgeQuote, ApiBridgeSource } from '../../../api/types/bridge';

import { fromDecimal } from '../../../util/decimals';
import { logDebugError } from '../../../util/logs';
import { callApiWithThrow as callApi } from '../../../api';
import { BRIDGE_MIN_AMOUNT } from '../../../api/bridge/config';
import { BRIDGE_LOAD_ERROR, getBridgeError, isQuoteError } from '../helpers';

interface Options {
  accountId?: string;
  source: ApiBridgeSource;
  amount: string;
  isActive: boolean;
  balances?: ApiBalanceBySlug;
  refreshKey: number;
  now: number;
  error?: string;
  onError: (error: string | undefined | ((current?: string) => string | undefined)) => void;
}

const BALANCE_REFRESH_INTERVAL_MS = 15000;
const QUOTE_DEBOUNCE_MS = 350;

export default function useBridgeQuote({
  accountId,
  source,
  amount,
  isActive,
  balances,
  refreshKey,
  now,
  error,
  onError,
}: Options) {
  const [balanceQuote, setBalanceQuote] = useState<ApiBridgeQuote>();
  const [quote, setQuote] = useState<ApiBridgeQuote>();
  const [isQuoting, setIsQuoting] = useState(false);

  const currentBalance = balanceQuote?.source === source ? balanceQuote : undefined;
  const amountNano = amount && /^\d*(\.\d{0,9})?$/.test(amount) && amount !== '.' ? fromDecimal(amount) : 0n;
  const isAboveBalance = Boolean(currentBalance && amountNano > BigInt(currentBalance.balance));
  const isAboveMax = Boolean(currentBalance && amountNano > BigInt(currentBalance.maxAmount));

  let amountError: string | undefined;
  if (isAboveBalance || error === 'Insufficient ION balance.') {
    amountError = 'Insufficient Balance';
  } else if (isAboveMax || error === 'Not enough BNB for the network fee.') {
    amountError = 'Insufficient Fee';
  }

  const isQuoteValid = Boolean(
    !amountError && quote?.source === source && quote.amount === amountNano.toString() && quote.expiresAt > now,
  );

  useEffect(() => {
    if (!accountId || !isActive) return undefined;

    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let isRefreshing = false;
    setBalanceQuote((current) => (current?.source === source ? current : undefined));

    async function refreshBalance() {
      if (isCancelled || isRefreshing) return;

      clearTimeout(timer);
      isRefreshing = true;

      try {
        const result = await callApi('getBridgeQuote', accountId!, source, '0');
        if (isCancelled) return;

        onError((current) => (current === BRIDGE_LOAD_ERROR ? undefined : current));
        setBalanceQuote((current) => (current && areQuoteBalancesEqual(current, result) ? current : result));
      } catch (err) {
        logDebugError('bridge.loadBalance', err);
        if (!isCancelled) onError(BRIDGE_LOAD_ERROR);
      } finally {
        isRefreshing = false;
        if (!isCancelled) timer = setTimeout(refreshBalance, BALANCE_REFRESH_INTERVAL_MS);
      }
    }

    void refreshBalance();
    window.addEventListener('focus', refreshBalance);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      window.removeEventListener('focus', refreshBalance);
    };
  }, [accountId, isActive, source, refreshKey, balances, onError]);

  useEffect(() => {
    setQuote(undefined);
    setIsQuoting(false);

    if (!accountId || !isActive || !currentBalance || isAboveMax || amountNano < BRIDGE_MIN_AMOUNT) {
      return undefined;
    }

    let isCancelled = false;
    setIsQuoting(true);

    const timer = setTimeout(async () => {
      try {
        const result = await callApi('getBridgeQuote', accountId, source, amountNano.toString());
        if (isCancelled) return;

        setQuote(result);
        onError((current) => (isQuoteError(current) ? current : undefined));
      } catch (err) {
        logDebugError('bridge.quoteAmount', err);
        if (!isCancelled) onError(getBridgeError(err));
      } finally {
        if (!isCancelled) setIsQuoting(false);
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [accountId, isActive, source, amountNano, currentBalance, isAboveMax, refreshKey, balances, onError]);

  return {
    balanceQuote: currentBalance,
    quote,
    isQuoting,
    isQuoteValid,
    amountError,
  };
}

function areQuoteBalancesEqual(current: ApiBridgeQuote, next: ApiBridgeQuote) {
  return current.source === next.source && current.balance === next.balance
    && current.nativeBalance === next.nativeBalance && current.maxAmount === next.maxAmount
    && current.networkFee === next.networkFee && current.fromAddress === next.fromAddress
    && current.toAddress === next.toAddress;
}
