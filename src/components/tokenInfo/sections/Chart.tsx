import React, { memo, useEffect, useMemo, useState } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiBaseCurrency, ApiHistoryList, ApiPriceHistoryPeriod } from '../../../api/types';
import type { LangCode, PriceHistoryPeriods, UserToken } from '../../../global/types';

import { DEFAULT_PRICE_CURRENCY } from '../../../config';
import { selectCurrentAccountState } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';
import { formatChartDate, formatShortDay, formatTime, SECOND } from '../../../util/dateFormat';
import { formatCurrency, formatPercent, getShortCurrencySymbol } from '../../../util/formatNumber';
import { vibrate } from '../../../util/haptics';
import { SWIPE_DISABLED_CLASS_NAME } from '../../../util/swipeController';
import { TIME_RANGES } from '../../../util/timeRange';
import { IS_IOS } from '../../../util/windowEnvironment';

import useInterval from '../../../hooks/useInterval';
import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';
import useSyncEffect from '../../../hooks/useSyncEffect';

import TimeRangeSelector from '../../common/TimeRangeSelector';
import Spinner from '../../ui/Spinner';
import Transition from '../../ui/Transition';
import Plot from './Plot';

import styles from './Chart.module.scss';

export interface TokenPricePoint {
  price: number;
  initialPrice: number;
}

interface OwnProps {
  token: UserToken;
  className?: string;
  onPricePointChange: (point?: TokenPricePoint) => void;
}

interface StateProps {
  period: ApiPriceHistoryPeriod;
  baseCurrency: ApiBaseCurrency;
  historyPeriods?: PriceHistoryPeriods;
}

const DEFAULT_PERIOD: ApiPriceHistoryPeriod = '1D';

// An open chart keeps polling the price, at the same cadence as the native apps
const REFRESH_INTERVAL = 15 * SECOND;

const NO_SELECTION = -1;
const LOADING_SLIDE_KEY = 0;
const AXIS_LABEL_COUNT = 4;
const PRICE_FRACTION_DIGITS = 2;
const SELECTED_PRICE_FRACTION_DIGITS = 4;

function Chart({
  token,
  className,
  period,
  baseCurrency,
  historyPeriods,
  onPricePointChange,
}: OwnProps & StateProps) {
  const { loadPriceHistory, setCurrentTokenPeriod } = getActions();

  const lang = useLang();
  const [selectedIndex, setSelectedIndex] = useState(NO_SELECTION);

  const { slug, symbol } = token;
  // If the base currency equals the token, the chart would be a flat line, so it falls back to USD.
  // A currency code and a token slug never match directly, so the symbols are compared.
  const chartCurrency = getShortCurrencySymbol(baseCurrency) === symbol ? DEFAULT_PRICE_CURRENCY : baseCurrency;
  const currencySymbol = getShortCurrencySymbol(chartCurrency);

  const history = historyPeriods?.[period];
  const isLoading = !history;

  const refreshHistory = useLastCallback(() => {
    loadPriceHistory({ slug, period, currency: chartCurrency });
  });

  useEffect(refreshHistory, [slug, period, chartCurrency, refreshHistory]);

  useInterval(refreshHistory, REFRESH_INTERVAL, true);

  // The selection points into the shown series, so switching the token or the period drops it.
  useEffect(() => {
    setSelectedIndex(NO_SELECTION);
  }, [slug, period]);

  useSyncEffect(([prevSelectedIndex]) => {
    if (IS_IOS && prevSelectedIndex !== undefined) void vibrate();
  }, [selectedIndex]);

  const lastPoint = history?.length ? history[history.length - 1] : undefined;
  const selectedPoint = selectedIndex >= 0 ? history?.[selectedIndex] : undefined;
  const shownPoint = selectedPoint ?? lastPoint;

  // A zero price gives no baseline for the change, so the period starts at the first traded point.
  // The caption on the left shows that same point.
  const initialPoint = useMemo(() => history?.find(([, value]) => Boolean(value)), [history]);
  const initialPrice = initialPoint?.[1];
  const changePercent = initialPrice && shownPoint ? (shownPoint[1] / initialPrice - 1) * 100 : undefined;

  // A price quoted in another currency would make the balance above jump between currencies
  const shownPrice = chartCurrency !== baseCurrency ? undefined : shownPoint?.[1];

  useEffect(() => {
    onPricePointChange(shownPrice !== undefined && initialPrice
      ? { price: shownPrice, initialPrice }
      : undefined);
  }, [shownPrice, initialPrice, onPricePointChange]);

  const axisLabels = useMemo(() => buildAxisLabels(lang.code!, period, history), [lang.code, period, history]);

  // The new period reaches the effect above through the global state, which loads the series
  const handlePeriodChange = useLastCallback((newPeriod: ApiPriceHistoryPeriod) => {
    setCurrentTokenPeriod({ period: newPeriod });
  });

  // Dragging over the plot shows the price at that point, so the card is excluded from the swipe
  // between content tabs and from the swipe back
  const fullClassName = buildClassName(styles.root, 'no-swipe', SWIPE_DISABLED_CLASS_NAME, className);

  // Every new series cross-fades.
  const contentKey = isLoading
    ? LOADING_SLIDE_KEY
    : TIME_RANGES.indexOf(period) + 1;

  return (
    <section className={fullClassName}>
      <Transition name="fade" activeKey={contentKey} shouldRestoreHeight shouldCleanup>
        <div className={styles.slide}>
          <div className={styles.summary}>
            <div className={styles.summarySide}>
              <span className={styles.summaryCaption}>
                {initialPoint && formatShortDay(lang.code!, initialPoint[0] * 1000)}
              </span>
              <span className={styles.summaryValue}>
                {initialPoint && formatCurrency(initialPoint[1], currencySymbol, PRICE_FRACTION_DIGITS, true)}
              </span>
            </div>

            <div className={buildClassName(styles.summarySide, styles.summarySideEnd)}>
              <span className={styles.summaryCaption}>
                {selectedPoint ? formatChartDate(lang.code!, selectedPoint[0] * 1000) : lang('Now')}
              </span>
              <span className={styles.summaryValue}>
                {shownPoint && (
                  <>
                    {formatCurrency(
                      shownPoint[1],
                      currencySymbol,
                      selectedPoint ? SELECTED_PRICE_FRACTION_DIGITS : PRICE_FRACTION_DIGITS,
                      true,
                    )}
                    {Boolean(changePercent) && (
                      <span
                        className={buildClassName(
                          styles.change,
                          changePercent > 0 ? styles.changePositive : styles.changeNegative,
                        )}
                      >
                        {changePercent > 0 ? '↑' : '↓'}&thinsp;{formatPercent(Math.abs(changePercent))}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          </div>

          {history?.length ? (
            <Plot
              prices={history}
              selectedIndex={selectedIndex}
              className={styles.plot}
              onSelectIndex={setSelectedIndex}
            />
          ) : isLoading ? (
            <div className={styles.plotLoading}>
              <Spinner className={styles.spinner} />
            </div>
          ) : (
            <div className={styles.plotEmpty}>{lang('No price data')}</div>
          )}

          <div className={styles.axis}>
            {axisLabels?.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        </div>
      </Transition>

      <TimeRangeSelector value={period} isPlain className={styles.timeRange} onChange={handlePeriodChange} />
    </section>
  );
}

function buildAxisLabels(langCode: LangCode, period: ApiPriceHistoryPeriod, history?: ApiHistoryList) {
  if (!history?.length) return undefined;

  const lastIndex = history.length - 1;

  return Array.from({ length: AXIS_LABEL_COUNT }, (_, index) => {
    const [timestamp] = history[Math.round((index / (AXIS_LABEL_COUNT - 1)) * lastIndex)];

    return period === '1D'
      ? formatTime(timestamp * 1000)
      : formatShortDay(langCode, timestamp * 1000, false, true);
  });
}

export default memo(
  withGlobal<OwnProps>((global, { token }): StateProps => {
    const accountState = selectCurrentAccountState(global);

    return {
      period: accountState?.currentTokenPeriod ?? DEFAULT_PERIOD,
      baseCurrency: global.settings.baseCurrency,
      historyPeriods: global.tokenPriceHistory.bySlug[token.slug],
    };
  })(Chart),
);
