import { type ElementRef, useMemo } from '../../../../../lib/teact/teact';
import { getActions } from '../../../../../global';

import type { ApiStakingState } from '../../../../../api/types';
import type { UserToken } from '../../../../../global/types';
import type { DropdownItem } from '../../../../ui/Dropdown';
import { SettingsState } from '../../../../../global/types';

import {
  STAKING_SLUG_PREFIX,
} from '../../../../../config';
import { vibrate } from '../../../../../util/haptics';
import { compact } from '../../../../../util/iteratees';
import { getIsNewStakeAllowed, getStakingStateStatus } from '../../../../../util/staking';
import { getIsServiceToken } from '../../../../../util/tokens';

import useContextMenuHandlers from '../../../../../hooks/useContextMenuHandlers';
import useLastCallback from '../../../../../hooks/useLastCallback';

export type MenuHandler = 'add' | 'send' | 'exchange' | 'stake' | 'pin' | 'settings'
  | 'unstake' | 'stakeMore' | 'claimRewards';

function useTokenContextMenu(ref: ElementRef<HTMLButtonElement>, options: {
  isPortrait?: boolean;
  withContextMenu?: boolean;
  token: UserToken;
  isStakingAvailable?: boolean;
  isViewMode?: boolean;
  stakingState?: ApiStakingState;
  isPinned?: boolean;
}) {
  const {
    openReceiveModal,
    startTransfer,
    startExchange,
    startStaking,
    openSettingsWithState,
    pinToken,
    unpinToken,
    startUnstaking,
    startStakingClaim,
  } = getActions();

  const {
    token,
    isPortrait,
    withContextMenu,
    isStakingAvailable,
    isViewMode,
    stakingState,
    isPinned,
  } = options;

  const {
    isContextMenuOpen, contextMenuAnchor,
    handleBeforeContextMenu, handleContextMenu,
    handleContextMenuClose, handleContextMenuHide,
  } = useContextMenuHandlers({
    elementRef: ref,
    isMenuDisabled: !withContextMenu,
  });
  const isServiceToken = getIsServiceToken(token);
  const stakingId = stakingState?.id;
  const baseSlug = token.isStaking ? token.slug.replace(STAKING_SLUG_PREFIX, '') : token.slug;
  const isStakeMoreAllowed = getIsNewStakeAllowed(baseSlug);
  const isContextMenuShown = contextMenuAnchor !== undefined;
  const canBeClaimed = stakingState ? getStakingStateStatus(stakingState) === 'readyToClaim' : undefined;
  const hasUnclaimedRewards = stakingState?.type === 'jetton'
    ? !!stakingState.unclaimedRewards
    : undefined;

  const items: DropdownItem<MenuHandler>[] = useMemo(() => {
    const mandatoryItems: (false | DropdownItem<MenuHandler>)[] = [
      {
        name: isPinned ? 'Unpin' : 'Pin',
        fontIcon: isPinned ? 'menu-unpin' : 'menu-pin',
        value: 'pin',
        withDelimiter: true,
      } satisfies DropdownItem<MenuHandler>, {
        name: 'Manage Tokens',
        fontIcon: 'menu-params',
        value: 'settings',
      } satisfies DropdownItem<MenuHandler>,
    ];

    if (isViewMode) {
      return compact(mandatoryItems);
    }

    const result: (false | undefined | DropdownItem<MenuHandler>)[] = stakingId
      ? [isStakeMoreAllowed && {
        name: 'Stake More',
        fontIcon: 'menu-send',
        value: 'stakeMore',
      } satisfies DropdownItem<MenuHandler>,
      {
        name: 'Unstake',
        fontIcon: 'menu-receive',
        value: 'unstake',
      } satisfies DropdownItem<MenuHandler>,
      (canBeClaimed || hasUnclaimedRewards) && {
        name: 'Claim Rewards',
        fontIcon: 'menu-gem',
        value: 'claimRewards',
      } satisfies DropdownItem<MenuHandler>]
      : [!isServiceToken && {
        name: 'Fund',
        fontIcon: 'menu-plus',
        value: 'add',
      } satisfies DropdownItem<MenuHandler>, {
        name: 'Send',
        fontIcon: 'menu-send',
        value: 'send',
      } satisfies DropdownItem<MenuHandler>,
      {
        name: 'Exchange',
        fontIcon: 'menu-send',
        value: 'exchange',
      } satisfies DropdownItem<MenuHandler>,
      isStakingAvailable && {
        name: 'Stake',
        fontIcon: 'menu-percent',
        value: 'stake',
      } satisfies DropdownItem<MenuHandler>];

    return compact(result.concat(mandatoryItems));
  }, [
    canBeClaimed, hasUnclaimedRewards, isStakingAvailable, isStakeMoreAllowed, isViewMode,
    stakingId, isServiceToken, isPinned,
  ]);

  const handleMenuItemSelect = useLastCallback((value: MenuHandler) => {
    void vibrate();

    switch (value) {
      case 'add':
        openReceiveModal({ chain: token.chain });
        break;

      case 'send':
        startTransfer({
          tokenSlug: token.slug,
        });
        break;

      case 'exchange':
        startExchange();
        break;

      case 'stake':
      case 'stakeMore': {
        const tokenSlug = token.isStaking
          ? token.slug.replace(STAKING_SLUG_PREFIX, '')
          : token.slug;
        startStaking({ tokenSlug });
        break;
      }

      case 'settings':
        openSettingsWithState({ state: SettingsState.Assets });
        break;

      case 'pin':
        if (isPinned) {
          unpinToken({ slug: token.slug });
        } else {
          pinToken({ slug: token.slug });
        }
        break;

      case 'unstake':
        startUnstaking({ stakingId: stakingId! });
        break;

      case 'claimRewards':
        startStakingClaim({ stakingId: stakingId! });
        break;
    }

    handleContextMenuClose();
  });

  return {
    isContextMenuOpen,
    isContextMenuShown,
    contextMenuAnchor,
    items,
    isBackdropRendered: isPortrait && isContextMenuOpen,
    handleBeforeContextMenu,
    handleContextMenu,
    handleContextMenuClose,
    handleContextMenuHide,
    handleMenuItemSelect,
  };
}

export default useTokenContextMenu;
