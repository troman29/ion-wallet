import type { ApiActivity } from '../../../types';
import type { ParsedAction, ParsedTrace } from '../types';

export type TraceActivityRule = {
  shouldInspect: (activities: readonly ApiActivity[]) => boolean;
  isTechnicalChild: (primary: ParsedAction, child: ParsedAction) => boolean;
};

export function getHiddenActivityIdsFromTrace(
  parsedTrace: ParsedTrace,
  rules: readonly TraceActivityRule[],
): Set<string> {
  const hiddenIds = new Set<string>();
  const visibleIds = new Set<string>();

  for (const { walletActions } of parsedTrace.traceOutputs) {
    for (const child of walletActions) {
      const matchingPrimaries = walletActions.filter((primary) => {
        return primary !== child
          && primary.activities.some(({ shouldHide }) => shouldHide !== true)
          && rules.some(({ isTechnicalChild }) => isTechnicalChild(primary, child));
      });
      for (const { id } of child.activities) {
        if (matchingPrimaries.length === 1) hiddenIds.add(id);
        else visibleIds.add(id);
      }
    }
  }

  for (const id of visibleIds) hiddenIds.delete(id);
  return hiddenIds;
}
