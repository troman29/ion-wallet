import type { ApiActivity, ApiChain } from '../../../api/types';
import type { GlobalState } from '../../types';

import { IONCOIN } from '../../../config';
import { parseAccountId } from '../../../util/account';
import { getIsHiddenNftActivity } from '../../../util/activities';
import { playIncomingTransactionSound } from '../../../util/notificationSound';
import { getIsTransactionWithPoisoning, updatePoisoningCacheFromActivities } from '../../../util/poisoningHash';
import { waitFor } from '../../../util/schedulers';
import { getChainBySlug } from '../../../util/tokens';
import { callApi } from '../../../api';
import { BRIDGE_CONFIG } from '../../../api/bridge/config';
import { SEC } from '../../../api/constants';
import { getIsTinyOrScamTransaction } from '../../helpers';
import { runActivityUpdateInOrder } from '../../helpers/activityUpdateQueue';
import { addActionHandler, getActions, getGlobal, setGlobal } from '../../index';
import {
  addInitialActivities,
  addNewActivities,
  applyActivitiesPatch,
  applyIncomingNftFromActivity,
  applyOutgoingNftFromActivity,
  replaceCurrentActivityId,
  replaceCurrentDomainLinkingId,
  replaceCurrentDomainRenewalId,
  replaceCurrentTransferId,
  replacePendingActivities,
  updateAccountState,
} from '../../reducers';
import {
  selectAccountState,
  selectAccountTokens,
  selectPendingActivitiesSlow,
  selectRecentNonLocalActivitiesSlow,
} from '../../selectors';

const TX_AGE_TO_PLAY_SOUND = 60000; // 1 min
const PRELOAD_ACTIVITY_TOKEN_COUNT = 10;

addActionHandler('apiUpdate', async (global, actions, update) => {
  switch (update.type) {
    case 'initialActivities': {
      const {
        accountId, mainActivities, mainHistoryHasMore, bySlug, chain,
      } = update;

      updatePoisoningCacheFromActivities(mainActivities);

      await runActivityUpdateInOrder(accountId, async () => {
        const previous = Object.values(selectAccountState(getGlobal(), accountId)?.activities?.byId ?? {});
        const reconciliation = await callApi(
          'reconcileActivityUpdate', accountId, previous, [mainActivities, ...Object.values(bySlug)].flat(),
        );
        let nextGlobal = addInitialActivities(
          getGlobal(), accountId, mainActivities, bySlug, chain, mainHistoryHasMore,
        );
        if (reconciliation) {
          nextGlobal = applyActivitiesPatch(nextGlobal, accountId, {
            ...reconciliation.patch,
            upsert: reconciliation.patch.upsert.filter(({ kind }) => kind === 'swap'),
          });
          nextGlobal = replaceActivityReferences(nextGlobal, accountId, reconciliation.patch.replacedIds);
          if (reconciliation.bridgeHasMore) nextGlobal = reopenBridgeHistory(nextGlobal, accountId);
        }
        setGlobal(nextGlobal);
      });

      void preloadTopTokenHistory(accountId, chain);
      break;
    }

    case 'newLocalActivities': {
      const { accountId, activities } = update;
      await runActivityUpdateInOrder(accountId, async () => {
        const confirmed = selectRecentNonLocalActivitiesSlow(getGlobal(), accountId, activities.length + 20);
        const cached = Object.values(selectAccountState(getGlobal(), accountId)?.activities?.byId ?? {});
        const reconciliation = await callApi(
          'reconcileActivityUpdate', accountId, [...cached, ...activities], confirmed,
        );
        let nextGlobal = addNewActivities(getGlobal(), accountId, activities);
        if (reconciliation) {
          const { removeIds, replacedIds } = reconciliation.patch;
          const localIds = new Set(activities.map(({ id }) => id));
          const matchedIds = new Set(Object.entries(replacedIds)
            .filter(([previousId]) => localIds.has(previousId)).map(([, nextId]) => nextId));
          nextGlobal = applyActivitiesPatch(nextGlobal, accountId, {
            upsert: [
              ...reconciliation.confirmedActivities.filter((activity) =>
                activity.kind === 'swap' || matchedIds.has(activity.id)),
            ],
            evidenceActivities: reconciliation.evidenceActivities,
            removeIds,
          });
          nextGlobal = replaceActivityReferences(nextGlobal, accountId, replacedIds);
          if (reconciliation.bridgeHasMore) nextGlobal = reopenBridgeHistory(nextGlobal, accountId);
        }
        setGlobal(nextGlobal);
      });
      break;
    }

    case 'newActivities': {
      const { accountId, activities: confirmedActivities, pendingActivities, chain } = update;
      await runActivityUpdateInOrder(accountId, async () => {
        const previous = [
          ...Object.values(selectAccountState(getGlobal(), accountId)?.activities?.byId ?? {}),
          ...(chain ? selectPendingActivitiesSlow(getGlobal(), accountId, chain) : []),
        ];
        const reconciliation = await callApi(
          'reconcileActivityUpdate', accountId, previous, confirmedActivities, pendingActivities,
        );
        let nextGlobal = getGlobal();
        if (chain && pendingActivities) {
          nextGlobal = replacePendingActivities(
            nextGlobal, accountId, chain, reconciliation?.pendingActivities ?? pendingActivities,
          );
        }
        nextGlobal = addNewActivities(
          nextGlobal, accountId, reconciliation?.confirmedActivities ?? confirmedActivities,
        );
        if (reconciliation) {
          nextGlobal = applyActivitiesPatch(nextGlobal, accountId, reconciliation.patch);
          nextGlobal = replaceActivityReferences(nextGlobal, accountId, reconciliation.patch.replacedIds);
          if (reconciliation.bridgeHasMore) nextGlobal = reopenBridgeHistory(nextGlobal, accountId);
        }
        notifyAboutNewActivities(
          nextGlobal, accountId, confirmedActivities.filter(({ shouldHide }) => shouldHide !== true),
        );
        updatePoisoningCacheFromActivities(confirmedActivities);
        for (const activity of confirmedActivities) {
          if (activity.kind !== 'transaction' || !activity.nft) continue;
          nextGlobal = activity.isIncoming
            ? applyIncomingNftFromActivity(nextGlobal, accountId, activity.nft)
            : applyOutgoingNftFromActivity(nextGlobal, accountId, activity.nft);
        }
        setGlobal(nextGlobal);
      });
      break;
    }
  }
});

function reopenBridgeHistory(global: GlobalState, accountId: string) {
  const activities = selectAccountState(global, accountId)?.activities;
  if (!activities) return global;

  return updateAccountState(global, accountId, {
    activities: {
      ...activities,
      isMainHistoryEndReached: false,
      isHistoryEndReachedBySlug: {
        ...activities.isHistoryEndReachedBySlug,
        [IONCOIN.slug]: false,
        [`bnb-${BRIDGE_CONFIG[parseAccountId(accountId).network].token}`]: false,
        bnb: false,
      },
    },
  });
}

function replaceActivityReferences(global: GlobalState, accountId: string, replacements: Record<string, string>) {
  if (!Object.keys(replacements).length) return global;
  global = replaceCurrentActivityId(global, accountId, replacements);
  const accountState = selectAccountState(global, accountId);
  const currentId = accountState?.currentActivityId;
  const operationId = currentId && accountState.activities?.byId[currentId]?.extra?.bridgeProjection?.operationId;
  if (currentId && operationId) {
    global = replaceCurrentActivityId(global, accountId, { [currentId]: operationId });
  }
  global = replaceCurrentTransferId(global, replacements);
  global = replaceCurrentDomainRenewalId(global, replacements);
  return replaceCurrentDomainLinkingId(global, replacements);
}

function notifyAboutNewActivities(global: GlobalState, accountId: string, newActivities: ApiActivity[]) {
  if (!global.settings.canPlaySounds) {
    return;
  }

  const { areTinyTransfersHidden, areUnverifiedNftsHidden } = global.settings;
  const { blacklistedNftAddresses, whitelistedNftAddresses } = selectAccountState(global, accountId) || {};

  const shouldPlaySound = newActivities.some((activity) => {
    return activity.kind === 'transaction'
      && activity.isIncoming
      && activity.status === 'completed'
      && (Date.now() - activity.timestamp < TX_AGE_TO_PLAY_SOUND)
      && !getIsHiddenNftActivity(activity, blacklistedNftAddresses, whitelistedNftAddresses, areUnverifiedNftsHidden)
      && !(areTinyTransfersHidden && getIsTinyOrScamTransaction(activity, global.tokenInfo?.bySlug[activity.slug]))
      && !getIsTransactionWithPoisoning(activity);
  });

  if (shouldPlaySound) {
    playIncomingTransactionSound();
  }
}

async function preloadTopTokenHistory(accountId: string, chain: ApiChain) {
  const { fetchPastActivities } = getActions();

  await waitFor(() => !!selectAccountTokens(getGlobal(), accountId), SEC, 10);
  const global = getGlobal();

  const tokens = (selectAccountTokens(global, accountId) ?? [])
    .slice(0, PRELOAD_ACTIVITY_TOKEN_COUNT)
    .filter((token) => getChainBySlug(token.slug) === chain);

  const { idsBySlug } = selectAccountState(global, accountId)?.activities || {};

  for (const { slug } of tokens) {
    if (idsBySlug?.[slug] === undefined) {
      fetchPastActivities({ accountId, slug });
    }
  }
}
