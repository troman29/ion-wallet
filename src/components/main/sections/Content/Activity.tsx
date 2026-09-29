import React from '../../../../lib/teact/teact';

import type {
  ApiActivity,
  ApiBaseCurrency,
  ApiCurrencyRates,
  ApiNft,
  ApiStakingState,
  ApiTokenWithPrice,
} from '../../../../api/types';
import type { Account, AppTheme, SavedAddress } from '../../../../global/types';

import Transaction, { getTransactionHeight } from './Transaction';

interface OwnProps {
  activity: ApiActivity;
  isLast?: boolean;
  isActive?: boolean;
  isSensitiveDataHidden?: boolean;
  isFuture?: boolean;
  withChainIcon?: boolean;
  className?: string;
  tokensBySlug: Record<string, ApiTokenWithPrice>;
  appTheme: AppTheme;
  nftsByAddress: Record<string, ApiNft> | undefined;
  currentAccountId: string;
  stakingStateBySlug: Record<string, ApiStakingState>;
  savedAddresses: SavedAddress[] | undefined;
  accounts: Record<string, Account> | undefined;
  baseCurrency: ApiBaseCurrency;
  currencyRates: ApiCurrencyRates;
  shouldHideStakingAnnualYield?: boolean;
  onClick?: (id: string) => void;
}

export default function Activity({
  activity,
  isLast,
  isActive,
  isSensitiveDataHidden,
  isFuture,
  withChainIcon,
  className,
  tokensBySlug,
  appTheme,
  nftsByAddress,
  currentAccountId,
  stakingStateBySlug,
  savedAddresses,
  accounts,
  baseCurrency,
  currencyRates,
  shouldHideStakingAnnualYield,
  onClick,
}: OwnProps) {
  const doesNftExist = Boolean(activity.nft && nftsByAddress?.[activity.nft.address]);
  const { annualYield, yieldType } = stakingStateBySlug[activity.slug] ?? {};

  return (
    <Transaction
      currentAccountId={currentAccountId}
      transaction={activity}
      tokensBySlug={tokensBySlug}
      isActive={isActive}
      className={className}
      annualYield={annualYield}
      yieldType={yieldType}
      isLast={isLast}
      savedAddresses={savedAddresses}
      withChainIcon={withChainIcon}
      appTheme={appTheme}
      doesNftExist={doesNftExist}
      isSensitiveDataHidden={isSensitiveDataHidden}
      isFuture={isFuture}
      accounts={accounts}
      baseCurrency={baseCurrency}
      currencyRates={currencyRates}
      shouldHideStakingAnnualYield={shouldHideStakingAnnualYield}
      onClick={onClick}
    />
  );
}

export function getActivityHeight(activity: ApiActivity, isFuture?: boolean) {
  return getTransactionHeight(activity, isFuture);
}
