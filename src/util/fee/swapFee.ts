import type { ApiSwapEstimateVariant, ApiToken } from '../../api/types';
import type { GlobalState } from '../../global/types';
import type { FeePrecision, FeeTerms } from './types';
import { SwapType } from '../swap/types';

import { Big } from '../../lib/big.js';
import { bigintMax } from '../bigint';
import { fromDecimal } from '../decimals';
import { findNativeToken, getChainBySlug, getIsNativeToken } from '../tokens';

type ExplainSwapFeeInput = Pick<GlobalState['currentSwap'],
'tokenInSlug' | 'networkFee' | 'realNetworkFee'
> & {
  swapType: SwapType;
  /** The balance of the "in" token blockchain's native token. Undefined means that it's unknown. */
  nativeTokenInBalance: bigint | undefined;
};

export type ExplainedSwapFee = {
  /**
   * The fee that will be sent with the swap. The wallet must have it on the balance to conduct the swap.
   * Show this in the swap form when the input amount is ≤ the balance, but the remaining balance can't cover the
   * full fee; show `realFee` otherwise. Undefined means that it's unknown.
   */
  fullFee?: {
    precision: FeePrecision;
    terms: FeeTerms<string>;
    /** Only the network fee terms (like `terms` but excluding our fee) */
    networkTerms: FeeTerms<string>;
  };
  /**
   * The real fee (the full fee minus the excess). Undefined means that it's unknown. There is no need to fall back to
   * `fullFee` when `realFee` is undefined (because it's undefined too in this case).
   */
  realFee?: {
    precision: FeePrecision;
    terms: FeeTerms<string>;
    /** Only the network fee terms (like `terms` but excluding our fee) */
    networkTerms: FeeTerms<string>;
  };
  /** The excess fee. Measured in the native token. It's always approximate. Undefined means that it's unknown. */
  excessFee?: string;
};

type MaxSwapAmountInput = {
  swapType: SwapType;
  /** The balance of the "in" token. Undefined means that it's unknown. */
  tokenInBalance: bigint | undefined;
  tokenIn: Pick<ApiToken, 'slug' | 'decimals'> | undefined;
  /** The full network fee terms calculated by `explainSwapFee`. Undefined means that they're unknown. */
  fullNetworkFee: FeeTerms<string> | undefined;
  /** The maximum amount available for swap, as calculated by the backend. Undefined means it's unknown. */
  maxAmountFromBackend: bigint | undefined;
};

type BalanceSufficientForSwapInput = MaxSwapAmountInput & {
  /** The wallet balance of the native token of the "in" token chain. Undefined means that it's unknown. */
  nativeTokenInBalance: bigint | undefined;
  /** The "in" amount to swap. Undefined means that it's unspecified. */
  amountIn: string | undefined;
  /** The maximum amount available for swap, as calculated by the backend. Undefined means it's unknown. */
  maxAmountFromBackend: bigint | undefined;
};

type CanAffordSwapVariant = {
  variant: ApiSwapEstimateVariant;
  tokenIn: Pick<ApiToken, 'slug' | 'decimals'> | undefined;
  /** The balance of the "in" token. Undefined means that it's unknown. */
  tokenInBalance: bigint | undefined;
  /** The wallet balance of the native token of the "in" token chain. Undefined means that it's unknown. */
  nativeTokenInBalance: bigint | undefined;
};

/**
 * Converts the swap fee data returned from API into data that is ready to be displayed in the swap form UI.
 */
export function explainSwapFee(input: ExplainSwapFeeInput): ExplainedSwapFee {
  return explainGasfullSwapFee(input);
}

/**
 * Calculates the maximum amount available for the swap.
 * Returns undefined when it can't be calculated because of insufficient input data.
 */
export function getMaxSwapAmount({
  swapType,
  tokenInBalance,
  tokenIn,
  fullNetworkFee,
  maxAmountFromBackend,
}: MaxSwapAmountInput): bigint | undefined {
  if (maxAmountFromBackend) {
    return maxAmountFromBackend;
  }

  if (swapType === SwapType.CrosschainToWallet || tokenInBalance === undefined) {
    return undefined;
  }

  let maxAmount = tokenInBalance;

  // For a better UX, assuming the fee is 0 when it's unknown
  if (fullNetworkFee) {
    if (!tokenIn) {
      return undefined;
    }

    if (swapType !== SwapType.OnChain) {
      maxAmount -= fromDecimal(fullNetworkFee.token ?? '0', tokenIn.decimals);
    }

    if (getIsNativeToken(tokenIn.slug)) {
      // When the "in" token is native, both `token` and `native` refer to the same currency, so we consider them both
      maxAmount -= fromDecimal(fullNetworkFee.native ?? '0', tokenIn.decimals);
    }
  }

  return bigintMax(maxAmount, 0n);
}

/**
 * Decides whether the balance is sufficient to swap the amount and pay the fees.
 * Returns undefined when it can't be calculated because of insufficient input data.
 */
export function isBalanceSufficientForSwap(input: BalanceSufficientForSwapInput) {
  const {
    swapType,
    amountIn,
    tokenInBalance,
    nativeTokenInBalance,
    tokenIn,
    fullNetworkFee,
  } = input;

  if (swapType === SwapType.CrosschainToWallet) {
    return true;
  }

  if (
    amountIn === undefined
    || !tokenIn
    || tokenInBalance === undefined
    || nativeTokenInBalance === undefined
    || !fullNetworkFee
  ) {
    return undefined;
  }

  const nativeTokenIn = findNativeToken(getChainBySlug(tokenIn.slug));
  if (!nativeTokenIn) {
    return undefined;
  }

  const maxAmount = getMaxSwapAmount(input);
  if (maxAmount === undefined) {
    return undefined;
  }

  const swapAmountInBigint = fromDecimal(amountIn, tokenIn.decimals);
  const networkNativeFeeBigint = fromDecimal(fullNetworkFee.native ?? '0', nativeTokenIn.decimals);

  return swapAmountInBigint <= maxAmount && networkNativeFeeBigint <= nativeTokenInBalance;
}

/**
 * Decides whether the balance is sufficient for the given swap estimate variant (DEX).
 * Returns undefined when it can't be calculated because of insufficient input data.
 */
export function canAffordSwapEstimateVariant(input: CanAffordSwapVariant) {
  if (!input.tokenIn || input.nativeTokenInBalance === undefined) {
    return undefined;
  }

  const nativeTokenIn = findNativeToken(getChainBySlug(input.tokenIn.slug));
  if (!nativeTokenIn) {
    return undefined;
  }

  // Try to pay with gas
  const networkFeeBigint = fromDecimal(input.variant.networkFee, nativeTokenIn.decimals);
  if (input.nativeTokenInBalance >= networkFeeBigint) {
    return true;
  }

  return false;
}

function explainGasfullSwapFee(input: ExplainSwapFeeInput) {
  const result: ExplainedSwapFee = {
    excessFee: getExcessFee(input),
  };

  const isExact = result.excessFee === '0';

  if (input.networkFee !== undefined) {
    const networkTerms = { native: input.networkFee };
    result.fullFee = {
      precision: isExact ? 'exact' : 'lessThan',
      terms: networkTerms,
      networkTerms,
    };
    result.realFee = result.fullFee;
  }

  if (input.realNetworkFee !== undefined) {
    const networkTerms = { native: input.realNetworkFee };
    result.realFee = {
      precision: isExact ? 'exact' : 'approximate',
      terms: networkTerms,
      networkTerms,
    };
  }

  return result;
}

function getExcessFee({ networkFee, realNetworkFee }: Pick<ExplainSwapFeeInput, 'networkFee' | 'realNetworkFee'>) {
  return networkFee !== undefined && realNetworkFee !== undefined
    ? Big(networkFee).sub(realNetworkFee).toString()
    : undefined;
}
