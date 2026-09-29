import React, {
  type ElementRef,
  memo, useLayoutEffect, useMemo, useRef, useState,
} from '../../../../lib/teact/teact';
import { withGlobal } from '../../../../global';

import type {
  ApiBaseCurrency, ApiCurrencyRates, ApiStakingState,
} from '../../../../api/types';
import type {
  IAnchorPosition,
  UserToken,
} from '../../../../global/types';

import {
  selectAccountStakingStates, selectCurrentAccount,
  selectCurrentAccountId,
  selectCurrentAccountTokens,
  selectIsCurrentAccountViewMode,
} from '../../../../global/selectors';
import buildClassName from '../../../../util/buildClassName';
import { calculateFullBalance } from '../../../../util/calculateFullBalance';
import { formatCurrency, formatCurrencyExtended, getShortCurrencySymbol } from '../../../../util/formatNumber';
import { toNativeDigits } from '../../../../util/nativeDigits';
import { IS_IOS, IS_SAFARI } from '../../../../util/windowEnvironment';

import { useDeviceScreen } from '../../../../hooks/useDeviceScreen';
import useFontScale from '../../../../hooks/useFontScale';
import useLastCallback from '../../../../hooks/useLastCallback';
import useSyncEffect from '../../../../hooks/useSyncEffect';
import useUpdateIndicator from '../../../../hooks/useUpdateIndicator';
import useWindowSize from '../../../../hooks/useWindowSize';

import AnimatedCounter from '../../../ui/AnimatedCounter';
import LoadingDots from '../../../ui/LoadingDots';
import SensitiveData from '../../../ui/SensitiveData';
import Spinner from '../../../ui/Spinner';
import Transition from '../../../ui/Transition';
import CardAddress from './CardAddress';
import CurrencySwitcherMenu from './CurrencySwitcherMenu';

import styles from './Card.module.scss';

interface OwnProps {
  ref?: ElementRef<HTMLDivElement>;
  onYieldClick: (stakingId?: string) => void;
}

interface StateProps {
  currentAccountId: string;
  isTemporaryAccount?: boolean;
  tokens?: UserToken[];
  baseCurrency: ApiBaseCurrency;
  currencyRates: ApiCurrencyRates;
  stakingStates?: ApiStakingState[];
  isSensitiveDataHidden?: true;
  isNftBuyingDisabled: boolean;
  isViewMode: boolean;
}

let mainKey = 0;

function Card({
  ref,
  currentAccountId,
  isTemporaryAccount,
  tokens,
  onYieldClick,
  baseCurrency,
  currencyRates,
  stakingStates,
  isSensitiveDataHidden,
  isNftBuyingDisabled,
  isViewMode,
}: OwnProps & StateProps) {
  const amountRef = useRef<HTMLDivElement>();
  const cardRef = useRef<HTMLDivElement>();
  const shortBaseSymbol = getShortCurrencySymbol(baseCurrency);

  const { isPortrait } = useDeviceScreen();
  const { width: screenWidth } = useWindowSize();
  const isUpdating = useUpdateIndicator('balanceUpdateStartedAt');
  const { updateFontScale } = useFontScale(amountRef);
  // Screen width affects font size only in portrait orientation
  const screenWidthDep = isPortrait ? screenWidth : 0;

  useSyncEffect(() => {
    if (currentAccountId) {
      mainKey += 1;
    }
  }, [currentAccountId, isTemporaryAccount]);

  const [currencyMenuAnchor, setCurrencyMenuAnchor] = useState<IAnchorPosition>();

  const openCurrencyMenu = () => {
    const { left, width, bottom: y } = amountRef.current!.getBoundingClientRect();
    setCurrencyMenuAnchor({ x: left + width / 2, y });
  };

  const closeCurrencyMenu = useLastCallback(() => {
    setCurrencyMenuAnchor(undefined);
  });

  const values = useMemo(() => {
    return tokens ? calculateFullBalance(tokens, stakingStates, currencyRates[baseCurrency]) : undefined;
  }, [tokens, stakingStates, currencyRates, baseCurrency]);

  const { primaryValue, primaryWholePart, primaryFractionPart } = values || {};

  const changeValue = values?.changeValue;
  const changePercent = values?.changePercent;
  const changePrefix = values?.changePrefix;
  const hasChangePercent = !!changePrefix && changePercent !== undefined;

  useLayoutEffect(() => {
    // Measure only after the balance-update animation (`Transition` fade + `AnimatedCounter`) settles,
    // otherwise the transient DOM yields a wrong scale that then sticks
    if (primaryValue !== undefined && !isUpdating) {
      updateFontScale();
    }
  }, [
    primaryFractionPart, primaryValue, primaryWholePart, shortBaseSymbol,
    updateFontScale, screenWidthDep, isUpdating,
  ]);

  function renderLoader() {
    return (
      <div className={buildClassName(styles.isLoading)}>
        <Spinner color="white" className={styles.center} />
      </div>
    );
  }

  function renderBalance() {
    const iconCaretClassNames = buildClassName(
      'icon',
      'icon-expand',
      primaryFractionPart || shortBaseSymbol.length > 1 ? styles.iconCaretFraction : styles.iconCaret,
    );
    const noAnimationCounter = !isUpdating || IS_SAFARI || IS_IOS || isSensitiveDataHidden;
    return (
      <>
        <Transition
          ref={amountRef}
          activeKey={isUpdating && !isSensitiveDataHidden ? 1 : 0}
          name="fade"
          shouldCleanup
          className={styles.balanceTransition}
          slideClassName={styles.balanceSlide}
        >
          <SensitiveData
            isActive={isSensitiveDataHidden}
            rows={4}
            cols={14}
            cellSize={13}
            align="center"
            className={styles.sensitiveData}
            contentClassName={styles.sensitiveDataContent}
            maskClassName={styles.blurred}
          >
            <div className={buildClassName(styles.primaryValue, 'rounded-font')}>
              <span
                className={buildClassName(
                  styles.currencySwitcher,
                  isUpdating && 'glare-text',
                )}
                role="button"
                tabIndex={0}
                onClick={!isSensitiveDataHidden ? openCurrencyMenu : undefined}
              >
                {shortBaseSymbol.length === 1 && <span className={styles.currencySymbol}>{shortBaseSymbol}</span>}
                <AnimatedCounter isDisabled={noAnimationCounter} text={primaryWholePart ?? ''} />
                {primaryFractionPart && (
                  <span className={styles.primaryFractionPart}>
                    <AnimatedCounter isDisabled={noAnimationCounter} text={`.${primaryFractionPart}`} />
                  </span>
                )}
                {shortBaseSymbol.length > 1 && (
                  <span className={styles.primaryFractionPart}>&nbsp;{shortBaseSymbol}</span>
                )}
                <i className={iconCaretClassNames} aria-hidden />
              </span>
            </div>
          </SensitiveData>
        </Transition>
        <CurrencySwitcherMenu
          isOpen={Boolean(currencyMenuAnchor)}
          triggerRef={amountRef}
          anchor={currencyMenuAnchor}
          className={styles.currencySwitcherMenu}
          bubbleClassName={styles.currencySwitcherMenuBubble}
          onClose={closeCurrencyMenu}
        />
        {primaryValue !== '0' && (
          <SensitiveData
            isActive={isSensitiveDataHidden}
            rows={2}
            cols={11}
            align="center"
            cellSize={14}
            className={styles.changeSpoiler}
            contentClassName={styles.sensitiveDataContent}
            maskClassName={styles.blurred}
          >
            <div
              className={buildClassName(
                styles.change,
                changePrefix === 'up' && styles.positive,
                'rounded-font',
              )}
            >
              <span className={styles.changeValue}>
                {hasChangePercent && (
                  <>
                    <i
                      className={buildClassName(
                        styles.changePrefix,
                        changePrefix === 'up' ? 'icon-arrow-up' : 'icon-arrow-down',
                      )}
                      aria-hidden
                    />
                    <AnimatedCounter text={toNativeDigits(`${Math.abs(changePercent)}%`)} className="custom-font" />
                    {' · '}
                  </>
                )}

                <AnimatedCounter text={hasChangePercent
                  ? formatCurrency(Math.abs(changeValue!), shortBaseSymbol)
                  : formatCurrencyExtended(changeValue!, shortBaseSymbol)}
                />
                <i className={buildClassName(styles.changeChevron, 'icon-chevron-right')} aria-hidden />
              </span>
            </div>
          </SensitiveData>
        )}
      </>
    );
  }

  return (
    <div
      ref={(el) => {
        cardRef.current = el || undefined;
        if (ref) {
          ref.current = el;
        }
      }}
      className={styles.containerWrapper}
    >
      <Transition activeKey={isUpdating ? 1 : 0} name="fade" shouldCleanup className={styles.loadingDotsContainer}>
        {isUpdating ? <LoadingDots isActive isDoubled /> : undefined}
      </Transition>

      <div
        className={
          buildClassName(
            styles.container,
          )
        }
      >
        <div className={styles.containerInner}>
          {values ? renderBalance() : renderLoader()}
          <Transition
            activeKey={mainKey}
            name="fade"
            className={styles.cardAddressContainer}
            slideClassName={styles.cardAddressSlide}
          >
            <CardAddress />
          </Transition>
        </div>
      </div>

    </div>
  );
}

export default memo(
  withGlobal<OwnProps>(
    (global): StateProps => {
      const currentAccountId = selectCurrentAccountId(global)!;
      const stakingStates = selectAccountStakingStates(global, currentAccountId);

      const { baseCurrency } = global.settings;

      return {
        currentAccountId,
        isTemporaryAccount: selectCurrentAccount(global)?.isTemporary,
        isViewMode: selectIsCurrentAccountViewMode(global),
        tokens: selectCurrentAccountTokens(global),
        baseCurrency,
        currencyRates: global.currencyRates,
        stakingStates,
        isSensitiveDataHidden: global.settings.isSensitiveDataHidden,
        isNftBuyingDisabled: global.restrictions.isNftBuyingDisabled,
      };
    },
    (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)),
  )(Card),
);
