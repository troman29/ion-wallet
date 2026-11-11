import { App } from '@capacitor/app';

import { createSignal } from '../signals';

// Unlike window blur, these events distinguish a real background transition from a native dialog.
const [getIsAppInBackgroundLocal, setIsAppInBackground] = createSignal(false);
export const getIsAppInBackground = getIsAppInBackgroundLocal;
let backgroundGeneration = 0;

export function getAppBackgroundGeneration() {
  return backgroundGeneration;
}

export async function initAppLifecycle(isIos: boolean) {
  const enterBackground = () => {
    if (getIsAppInBackground()) return;
    backgroundGeneration++;
    setIsAppInBackground(true);
  };

  // Android appStateChange(false) is onStop; pause is onPause and also fires for permissions.
  // iOS appStateChange(false) is willResignActive (also Face ID); pause is didEnterBackground.
  if (isIos) {
    await App.addListener('pause', enterBackground);
  }
  await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      setIsAppInBackground(false);
    } else if (!isIos) {
      enterBackground();
    }
  });
}
