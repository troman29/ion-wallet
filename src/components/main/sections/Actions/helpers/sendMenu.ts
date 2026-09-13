import { getActions } from '../../../../../global';

import type { DropdownItem } from '../../../../ui/Dropdown';

import { vibrate } from '../../../../../util/haptics';

export type MenuHandler = 'send' | 'sell';

export const SEND_CONTEXT_MENU_ITEMS: DropdownItem<MenuHandler>[] = [{
  name: 'Send',
  fontIcon: 'menu-send',
  value: 'send',
}, {
  name: 'Sell',
  fontIcon: 'menu-sell',
  value: 'sell',
}];

export const SEND_CONTEXT_MENU_ITEMS_WITHOUT_SELL = SEND_CONTEXT_MENU_ITEMS
  .filter(({ value }) => value !== 'sell');

export function handleSendMenuItemClick(value: MenuHandler) {
  switch (value) {
    case 'send':
      void vibrate();
      getActions().startTransfer();
      break;

    case 'sell':
      void vibrate();
      getActions().openOffRampWidgetModal();
      break;
  }
}
