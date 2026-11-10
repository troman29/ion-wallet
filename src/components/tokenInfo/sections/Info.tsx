import React, { memo, useEffect } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiBaseCurrency, ApiCurrencyRates, ApiTokenDetails, ApiTokenLink } from '../../../api/types';
import type { TokenDetailsState } from '../../../global/types';
import type { LangFn } from '../../../hooks/useLang';

import { selectTokenDetails } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';
import { calculateTokenPrice } from '../../../util/calculatePrice';
import { formatFullDay, SECOND } from '../../../util/dateFormat';
import {
  formatCompactCurrency,
  formatCompactNumber,
  getShortCurrencySymbol,
} from '../../../util/formatNumber';
import { handleUrlClick } from '../../../util/openUrl';
import { isValidUrl } from '../../../util/url';

import useInterval from '../../../hooks/useInterval';
import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';

import Button from '../../ui/Button';
import Skeleton from '../../ui/Skeleton';
import BuySellBar from './BuySellBar';
import InfoMetric from './InfoMetric';

import styles from './Info.module.scss';

interface OwnProps {
  tokenSlug: string;
  isActive?: boolean;
  className?: string;
}

interface StateProps {
  details?: TokenDetailsState;
  baseCurrency: ApiBaseCurrency;
  currencyRates: ApiCurrencyRates;
  isCovered: boolean;
}

const LINK_ICONS: Record<ApiTokenLink['kind'], string> = {
  x: 'icon-x',
  telegram: 'icon-telegram',
  website: 'icon-globe',
  facebook: 'icon-globe',
  instagram: 'icon-globe',
  linkedin: 'icon-globe',
  tiktok: 'icon-globe',
  youtube: 'icon-globe',
  reddit: 'icon-globe',
};

// Social network names are brands and are rendered without translation
const LINK_TITLES: Record<ApiTokenLink['kind'], string> = {
  x: 'X',
  telegram: 'Telegram',
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  reddit: 'Reddit',
};

const SKELETON_LINE_COUNT = 3;
// Market details are cached on the backend, so an open panel refreshes once a minute
const REFRESH_INTERVAL = 60 * SECOND;
const RETRY_INTERVAL = 15 * SECOND;

function Info({
  tokenSlug, isActive, className, details, baseCurrency, currencyRates, isCovered,
}: OwnProps & StateProps) {
  const { loadTokenDetails } = getActions();

  const lang = useLang();
  const shouldRefresh = Boolean(isActive && !isCovered);

  const refreshDetails = useLastCallback(() => {
    loadTokenDetails({ slugs: [tokenSlug] });
  });

  // As in the native apps, an opened token always refreshes its details, fresh or not. The description comes
  // localized, so a language change refreshes them too.
  useEffect(() => {
    if (shouldRefresh) refreshDetails();
  }, [shouldRefresh, refreshDetails, tokenSlug, lang.code]);

  // Retries while the last request failed or there are no details in the current language yet
  const refreshInterval = !details || details.hasError ? RETRY_INTERVAL : REFRESH_INTERVAL;
  useInterval(refreshDetails, shouldRefresh ? refreshInterval : undefined, true);

  function renderDetails(data: ApiTokenDetails) {
    const { description, marketCap, createdAt, volume24h } = data;
    const links = data.links?.filter(({ url }) => isValidUrl(url));
    const supply = getSupply(lang, data);
    const currencySymbol = getShortCurrencySymbol(baseCurrency);
    // The backend quotes the market metrics in USD, leaving the conversion to the client
    const toBaseCurrency = (value: number) => calculateTokenPrice(value, baseCurrency, currencyRates);
    const volumeChangePercent = volume24h?.change === undefined ? undefined : volume24h.change * 100;

    // A token the backend knows nothing public about gets a single line instead of the whole section
    if (!description && !links?.length && !supply && marketCap === undefined
      && createdAt === undefined && !volume24h) {
      return <p className={styles.description}>{lang('$token_info_fallback_description')}</p>;
    }

    return (
      <>
        <p className={styles.description}>{description || lang('$token_info_no_description')}</p>

        {Boolean(links?.length) && (
          <div className={styles.links}>
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className={styles.link}
                aria-label={lang('$token_info_open_in_browser_hint')}
                onClick={handleUrlClick}
              >
                <i className={buildClassName(styles.linkIcon, LINK_ICONS[link.kind])} aria-hidden />
                {lang(LINK_TITLES[link.kind])}
              </a>
            ))}
          </div>
        )}

        <div className={styles.metrics}>
          {marketCap !== undefined && (
            <InfoMetric
              label={lang('Market Cap')}
              hint={lang('$token_info_market_cap_hint')}
              value={formatCompactCurrency(toBaseCurrency(marketCap), currencySymbol)}
            />
          )}

          {supply && <InfoMetric label={supply.label} hint={supply.hint} value={supply.value} />}

          {createdAt !== undefined && (
            <InfoMetric label={lang('Created')} value={formatFullDay(lang.code!, createdAt * 1000)} />
          )}

          {volume24h && (
            <InfoMetric
              label={lang('Volume · 24h')}
              hint={lang('$token_info_volume_hint')}
              value={formatCompactCurrency(toBaseCurrency(volume24h.total), currencySymbol)}
              changePercent={volumeChangePercent}
            />
          )}
        </div>

        {volume24h?.buy !== undefined && volume24h.sell !== undefined && volume24h.total > 0 && (
          <BuySellBar
            buy={toBaseCurrency(volume24h.buy)}
            sell={toBaseCurrency(volume24h.sell)}
            currencySymbol={currencySymbol}
          />
        )}
      </>
    );
  }

  function renderContent() {
    // A failed refresh keeps the shown data while the retries run
    if (details?.data) {
      return <div className={styles.details}>{renderDetails(details.data)}</div>;
    }

    if (details?.hasError) {
      return (
        <div className={styles.placeholder} role="status">
          {lang('No Data')}
          <Button isText isSmall onClick={refreshDetails}>{lang('Try Again')}</Button>
        </div>
      );
    }

    if (!details) {
      return (
        <div className={styles.skeleton}>
          {Array.from({ length: SKELETON_LINE_COUNT }, (_, index) => (
            <Skeleton key={index} className={styles.skeletonLine} />
          ))}
        </div>
      );
    }

    return <div className={styles.placeholder}>{lang('No Data')}</div>;
  }

  return (
    <section className={buildClassName(styles.root, className)}>
      <h3 className={styles.title}>{lang('Info')}</h3>
      {renderContent()}
    </section>
  );
}

// Circulating and total read as a ratio only together, so a lone value gets its own label
function getSupply(lang: LangFn, { circulatingSupply, totalSupply }: ApiTokenDetails) {
  if (circulatingSupply !== undefined && totalSupply !== undefined) {
    return {
      label: lang('Circulating / Total Supply'),
      hint: lang('$token_info_supply_hint'),
      value: `${formatCompactNumber(circulatingSupply)} / ${formatCompactNumber(totalSupply)}`,
    };
  }

  if (circulatingSupply !== undefined) {
    return { label: lang('Circulating Supply'), value: formatCompactNumber(circulatingSupply) };
  }

  if (totalSupply !== undefined) {
    return { label: lang('Total Supply'), value: formatCompactNumber(totalSupply) };
  }

  return undefined;
}

export default memo(
  withGlobal<OwnProps>((global, { tokenSlug }): StateProps => {
    return {
      details: selectTokenDetails(global, tokenSlug),
      baseCurrency: global.settings.baseCurrency,
      currencyRates: global.currencyRates,
      isCovered: Boolean(global.areSettingsOpen || global.isExploreOpen),
    };
  })(Info),
);
