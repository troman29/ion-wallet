import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { IS_CAPACITOR } from '../config';
import { pause } from './schedulers';

const VIBRATE_SUCCESS_END_PAUSE_MS = 1300;

export async function vibrate() {
  if (IS_CAPACITOR) {
    await Haptics.impact({ style: ImpactStyle.Light });
  }
}

export async function vibrateOnError() {
  if (IS_CAPACITOR) {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await pause(100);
    await Haptics.impact({ style: ImpactStyle.Medium });
    await pause(75);
    await Haptics.impact({ style: ImpactStyle.Light });
  }
}

export async function vibrateOnSuccess(withPauseOnEnd = false) {
  if (!IS_CAPACITOR) return;

  await Haptics.impact({ style: ImpactStyle.Light });

  if (withPauseOnEnd) {
    await pause(VIBRATE_SUCCESS_END_PAUSE_MS);
  }
}
