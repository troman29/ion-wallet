import type { AutolockValueType } from '../global/types';

import { AUTOLOCK_OPTIONS_LIST } from '../config';

export function isAutolockDue(value: AutolockValueType, lastActivity: number, now = Date.now()) {
  if (value === 'never' || value === 'background') return false;
  return now - lastActivity >= AUTOLOCK_OPTIONS_LIST.find((option) => option.value === value)!.period;
}
