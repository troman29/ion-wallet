import { IS_CAPACITOR, IS_EXTENSION } from '../../../config';
import { getSafeAreaTop, getStatusBarHeight } from '../../../util/capacitor';
import { IS_ELECTRON, IS_OPERA, IS_WINDOWS, REM } from '../../../util/windowEnvironment';
import windowSize from '../../../util/windowSize';

import { ELECTRON_HEADER_HEIGHT_REM } from '../../electron/ElectronHeader';

const WINDOWS_OPERA_EXTENSION_EXTRA_HEIGHT = 30;

export function calcSafeAreaTop() {
  const { safeAreaTop } = windowSize.get();

  const electronExt = IS_ELECTRON ? ELECTRON_HEADER_HEIGHT_REM * REM : 0;
  const operaWinExt = IS_OPERA && IS_WINDOWS && IS_EXTENSION ? WINDOWS_OPERA_EXTENSION_EXTRA_HEIGHT : 0;
  // On some iPhones, the result of `getSafeAreaTop` is greater than the result of `getStatusBarHeight`.
  // In turn, some Android devices calculate `getSafeAreaTop` slightly less than `safeAreaTop` from CSS.
  // So we need to take the maximum value between `getSafeAreaTop` , `getStatusBarHeight` and `safeAreaTop` from CSS.
  return IS_CAPACITOR
    ? Math.max(getSafeAreaTop(), getStatusBarHeight(), safeAreaTop)
    : safeAreaTop + electronExt + operaWinExt;
}
