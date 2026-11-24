import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiBalanceBySlug } from '../../api/types';
import type { ApiBridgeSource } from '../../api/types/bridge';

import { selectCurrentAccountId, selectCurrentAccountState, selectIsBridgeAvailable } from '../../global/selectors';
import { getDoesUsePinPad } from '../../util/biometrics';
import buildClassName from '../../util/buildClassName';

import useLang from '../../hooks/useLang';
import useBridgeController from './hooks/useBridgeController';

import Modal from '../ui/Modal';
import ModalHeader from '../ui/ModalHeader';
import Transition from '../ui/Transition';
import BridgeAuthorization from './BridgeAuthorization';
import BridgeForm from './BridgeForm';
import BridgeReview from './BridgeReview';
import BridgeStatus from './BridgeStatus';

import modalStyles from '../ui/Modal.module.scss';
import styles from './ExchangeModal.module.scss';

interface StateProps {
  isOpen?: boolean;
  accountId?: string;
  isAvailable: boolean;
  source?: ApiBridgeSource;
  bridgeOperationId?: string;
  isTestnet?: boolean;
  balances?: ApiBalanceBySlug;
}

function ExchangeModal(props: StateProps) {
  const { closeExchange } = getActions();

  return (
    <Modal isOpen={props.isOpen} onClose={closeExchange} noBackdropClose dialogClassName={styles.modalDialog}>
      {props.isOpen && (
        <Transition
          activeKey={0}
          name="none"
          className={buildClassName(modalStyles.transition, modalStyles.transition_stableScroll, 'custom-scroll')}
          slideClassName={modalStyles.transitionSlide}
        >
          <BridgeContent key={props.accountId} {...props} />
        </Transition>
      )}
    </Modal>
  );
}

export function BridgeContent(props: StateProps) {
  const lang = useLang();
  const bridge = useBridgeController(props);
  const { screen, actions } = bridge;

  if (screen.name === 'status' && bridge.selected) {
    return (
      <BridgeStatus
        transfer={bridge.selected}
        isLoading={bridge.isLoading}
        isTestnet={props.isTestnet}
        error={bridge.error}
        onClaim={actions.claimTransfer}
        onRefresh={actions.refreshData}
        onClose={actions.closeModal}
        onNewTransfer={actions.startNewTransfer}
      />
    );
  }

  function renderScreen() {
    if (!props.isAvailable) {
      return (
        <div className={styles.content}>
          <p className={styles.note}>{lang('Bridge requires an ION and BNB wallet in the same account.')}</p>
        </div>
      );
    }

    switch (screen.name) {
      case 'form':
        return (
          <BridgeForm
            source={bridge.source}
            amount={bridge.amount}
            balanceQuote={bridge.balanceQuote}
            quote={bridge.quote}
            isQuoteValid={bridge.isQuoteValid}
            isQuoting={bridge.isQuoting}
            areTransfersLoaded={bridge.areTransfersLoaded}
            isTestnet={props.isTestnet}
            amountError={bridge.amountError}
            error={bridge.error}
            onAmountChange={actions.changeAmount}
            onMax={actions.setMaxAmount}
            onSwitch={actions.switchDirection}
            onReview={actions.reviewTransfer}
            onRefresh={actions.refreshData}
          />
        );
      case 'review':
        return (
          <BridgeReview
            operation={screen.operation}
            isExpired={bridge.isReviewExpired}
            error={bridge.error}
            onConfirm={actions.confirmTransfer}
          />
        );
      case 'password':
        return (
          <BridgeAuthorization
            operation={screen.operation}
            isLoading={bridge.isLoading}
            error={bridge.error}
            onAuthorize={actions.authorizeTransfer}
            onClose={actions.closeModal}
            onUpdate={actions.clearError}
          />
        );
      default:
        return undefined;
    }
  }

  return (
    <>
      {(screen.name !== 'password' || !getDoesUsePinPad()) && (
        <ModalHeader
          title={lang(screen.name === 'form' ? 'Bridge' : 'Confirm bridge')}
          onClose={actions.closeModal}
          onBackButtonClick={screen.name === 'review' ? actions.goBack : undefined}
        />
      )}
      {renderScreen()}
    </>
  );
}

export default memo(withGlobal((global): StateProps => ({
  isOpen: global.isExchangeModalOpen,
  accountId: selectCurrentAccountId(global),
  source: global.exchangeSource,
  bridgeOperationId: global.exchangeOperationId,
  isAvailable: selectIsBridgeAvailable(global),
  isTestnet: global.settings.isTestnet,
  balances: selectCurrentAccountState(global)?.balances?.bySlug,
}))(ExchangeModal));
