import { useEffect, useRef, useState } from '../../../lib/teact/teact';
import { getActions, getGlobal } from '../../../global';

import type { ApiBalanceBySlug } from '../../../api/types';
import type { ApiBridgeSource, ApiBridgeTransfer } from '../../../api/types/bridge';
import type { BridgeScreen } from '../types';

import { dropEnclaveSessionHold, holdEnclaveSession } from '../../../global/helpers/enclave';
import { selectCurrentAccountId } from '../../../global/selectors';
import { toDecimal } from '../../../util/decimals';
import { logDebugError } from '../../../util/logs';
import { callApiWithThrow as callApi } from '../../../api';
import { getBridgeDestination, getBridgeError, QUOTE_EXPIRED_ERROR } from '../helpers';
import useBridgeQuote from './useBridgeQuote';
import useBridgeTransfers from './useBridgeTransfers';

import useInterval from '../../../hooks/useInterval';
import useLastCallback from '../../../hooks/useLastCallback';

interface Options {
  accountId?: string;
  isAvailable: boolean;
  source?: ApiBridgeSource;
  bridgeOperationId?: string;
  balances?: ApiBalanceBySlug;
}

export default function useBridgeController({
  accountId,
  isAvailable,
  source: initialSource = 'ton',
  balances,
  bridgeOperationId,
}: Options) {
  const { closeExchange, releaseEnclaveSession } = getActions();

  const [source, setSource] = useState(initialSource);
  const [amount, setAmount] = useState('');
  const [screen, setScreen] = useState<BridgeScreen>({ name: 'form' });
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(Date.now());
  const isBusyRef = useRef(false);
  const isMountedRef = useRef(true);

  useInterval(() => setNow(Date.now()), 1000, true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleRestore = useLastCallback((transfer: ApiBridgeTransfer) => {
    if (bridgeOperationId && transfer.serverOperationId !== bridgeOperationId
      && transfer.id !== bridgeOperationId) return;

    if (screen.name === 'form' && !isBusyRef.current) setScreen({ name: 'status', transferId: transfer.id });
  });

  const handleError = useLastCallback((message: string) => setError(message));

  const { transfers, isLoaded, updateTransfer } = useBridgeTransfers(
    accountId, isAvailable, refreshKey, handleRestore, handleError, bridgeOperationId,
  );
  const estimate = useBridgeQuote({
    accountId,
    source,
    amount,
    balances,
    refreshKey,
    now,
    error,
    onError: setError,
    isActive: isAvailable && screen.name === 'form',
  });

  const operation = screen.name === 'review' || screen.name === 'password' ? screen.operation : undefined;
  const isReviewExpired = operation?.type === 'send' && operation.quote.expiresAt <= now;

  const changeAmount = useLastCallback((value?: string) => {
    setAmount(value ?? '');
    setError(undefined);
  });

  const switchDirection = useLastCallback(() => {
    setSource(getBridgeDestination(source));
    changeAmount('');
  });

  const setMaxAmount = useLastCallback(() => {
    if (estimate.balanceQuote) changeAmount(toDecimal(BigInt(estimate.balanceQuote.maxAmount)));
  });

  const reviewTransfer = useLastCallback(() => {
    if (!estimate.isQuoteValid || !isLoaded) return;

    setScreen({ name: 'review', operation: { type: 'send', quote: estimate.quote! } });
    setError(undefined);
  });

  const goBack = useLastCallback(() => {
    if (isBusyRef.current) return;

    setScreen(operation?.type === 'claim'
      ? { name: 'status', transferId: operation.transfer.id } : { name: 'form' });
    setError(undefined);
  });

  const confirmTransfer = useLastCallback(() => {
    if (screen.name === 'review' && !isReviewExpired) setScreen({ ...screen, name: 'password' });
  });

  const claimTransfer = useLastCallback(async () => {
    if (!accountId || screen.name !== 'status' || isBusyRef.current) return;

    const transfer = transfers.find(({ id }) => id === screen.transferId);
    if (!transfer || transfer.status !== 'claimable') return;

    isBusyRef.current = true;
    setIsLoading(true);
    setError(undefined);

    try {
      const fee = await callApi('getBridgeClaimFee', accountId, transfer.id);

      if (isMountedRef.current) setScreen({ name: 'review', operation: { type: 'claim', transfer, fee } });
    } catch (err) {
      logDebugError('bridge.prepareClaim', err);
      if (isMountedRef.current) setError(getBridgeError(err));
    } finally {
      isBusyRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  });

  const authorizeTransfer = useLastCallback(async (enclaveToken: string) => {
    if (isBusyRef.current || !accountId || !operation || screen.name !== 'password') return;

    isBusyRef.current = true;
    setIsLoading(true);
    setError(undefined);
    holdEnclaveSession(enclaveToken);

    try {
      if (selectCurrentAccountId(getGlobal()) !== accountId) return;
      if (isReviewExpired) throw new Error(QUOTE_EXPIRED_ERROR);

      const result = operation.type === 'claim'
        ? await callApi('claimBridge', accountId, operation.transfer.id, operation.fee, enclaveToken)
        : await callApi('submitBridge', operation.quote, enclaveToken);

      if (isMountedRef.current) {
        updateTransfer(result);
        setScreen({ name: 'status', transferId: result.id });
      }
    } catch (err) {
      logDebugError('bridge.authorizeTransfer', err);
      if (isMountedRef.current) {
        setError(getBridgeError(err));
        setScreen(operation.type === 'claim'
          ? { name: 'status', transferId: operation.transfer.id } : { name: 'form' });
      }
    } finally {
      if (dropEnclaveSessionHold(enclaveToken)) releaseEnclaveSession({ enclaveToken });
      isBusyRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  });

  const closeModal = useLastCallback(() => {
    if (!isBusyRef.current) closeExchange();
  });

  const refreshData = useLastCallback(() => {
    setError(undefined);
    setRefreshKey((current) => current + 1);
  });

  const startNewTransfer = useLastCallback(() => {
    changeAmount('');
    setScreen({ name: 'form' });
  });

  const clearError = useLastCallback(() => setError(undefined));

  return {
    source,
    amount,
    screen,
    error,
    isLoading,
    isReviewExpired,
    areTransfersLoaded: isLoaded,
    ...estimate,
    selected: screen.name === 'status' ? transfers.find(({ id }) => id === screen.transferId) : undefined,
    actions: {
      changeAmount,
      switchDirection,
      setMaxAmount,
      reviewTransfer,
      goBack,
      confirmTransfer,
      claimTransfer,
      authorizeTransfer,
      closeModal,
      refreshData,
      startNewTransfer,
      clearError,
    },
  };
}
