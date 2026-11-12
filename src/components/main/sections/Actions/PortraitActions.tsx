import React, { memo } from '../../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../../global';

import type { StakingStateStatus } from '../../../../util/staking';

import { selectIsBridgeAvailable } from '../../../../global/selectors';
import buildClassName from '../../../../util/buildClassName';
import { vibrate } from '../../../../util/haptics';
import { STAKING_TAB_TEXT_VARIANTS } from './helpers/stakingLabels';

import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';

import Button from '../../../ui/Button';

import styles from './PortraitActions.module.scss';

interface OwnProps {
  stakingStatus: StakingStateStatus;
  isStakingDisabled?: boolean;
  onEarnClick: NoneToVoidFunction;
}

interface StateProps {
  isBridgeAvailable: boolean;
}

function PortraitActions({
  stakingStatus,
  isStakingDisabled,
  onEarnClick,
  isBridgeAvailable,
}: OwnProps & StateProps) {
  const {
    startTransfer, startExchange, openReceiveModal,
  } = getActions();

  const lang = useLang();

  const addBuyButtonName = lang('Receive');

  const handleStartExchange = useLastCallback(() => {
    void vibrate();

    startExchange();
  });

  const handleStartTransfer = useLastCallback(() => {
    void vibrate();

    startTransfer();
  });

  const handleAddBuyClick = useLastCallback(() => {
    void vibrate();

    openReceiveModal();
  });

  const handleEarnClick = useLastCallback(() => {
    void vibrate();

    onEarnClick();
  });

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <Button
          isSimple
          className={styles.button}
          onClick={handleAddBuyClick}
        >
          <i className={buildClassName(styles.buttonIcon, 'icon-action-add')} aria-hidden />
          {addBuyButtonName}
        </Button>
        <Button
          isSimple
          className={styles.button}
          onClick={handleStartTransfer}
        >
          <i className={buildClassName(styles.buttonIcon, 'icon-action-send')} aria-hidden />
          {lang('Send')}
        </Button>
        {isBridgeAvailable && (
          <Button
            isSimple
            className={styles.button}
            onClick={handleStartExchange}
          >
            <i className={buildClassName(styles.buttonIcon, 'icon-action-swap')} aria-hidden />
            {lang('Bridge')}
          </Button>
        )}
        {!isStakingDisabled && (
          <Button
            isSimple
            className={buildClassName(styles.button, stakingStatus !== 'inactive' && styles.button_purple)}
            onClick={handleEarnClick}
          >
            <i className={buildClassName(styles.buttonIcon, 'icon-action-earn')} aria-hidden />
            {lang(STAKING_TAB_TEXT_VARIANTS[stakingStatus])}
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(withGlobal<OwnProps>((global): StateProps => ({
  isBridgeAvailable: selectIsBridgeAvailable(global),
}))(PortraitActions));
