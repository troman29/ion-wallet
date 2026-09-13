import { getActions } from '../../../../../global';

import type { DropdownItem } from '../../../../ui/Dropdown';

import { vibrate } from '../../../../../util/haptics';

export type MenuHandler = 'rename' | 'remove';

export const WALLET_CONTEXT_MENU_ITEMS: DropdownItem<MenuHandler>[] = [{
  name: 'Rename',
  fontIcon: 'menu-rename',
  value: 'rename',
}, {
  name: 'Remove',
  fontIcon: 'menu-trash',
  value: 'remove',
  isDangerous: true,
}];

export function handleWalletMenuItemClick(
  value: MenuHandler,
  accountId: string,
  onRemove: (accountId: string) => void,
) {
  const { openWalletRenameModal } = getActions();

  void vibrate();

  switch (value) {
    case 'rename':
      openWalletRenameModal({ accountId });
      break;

    case 'remove':
      onRemove(accountId);
      break;
  }
}
