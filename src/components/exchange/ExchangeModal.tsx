import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import Modal from '../ui/Modal';
import ModalHeader from '../ui/ModalHeader';

import styles from './ExchangeModal.module.scss';

interface StateProps {
  isOpen?: boolean;
}

function ExchangeModal({ isOpen }: StateProps) {
  const { closeExchange } = getActions();
  const lang = useLang();
  const handleClose = useLastCallback(() => closeExchange());

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header={<ModalHeader title={lang('Exchange')} onClose={handleClose} />}
    >
      <div className={styles.content}>
        <div className={styles.asset}>
          <strong>ION</strong>
          <span>ION Network</span>
        </div>
        <i className="icon-arrow-down" aria-hidden />
        <div className={styles.asset}>
          <strong>ION</strong>
          <span>BNB Chain</span>
        </div>
        <p>{lang('Exchange will be available after the ION bridge is configured.')}</p>
      </div>
    </Modal>
  );
}

export default memo(withGlobal((global): StateProps => ({
  isOpen: global.isExchangeModalOpen,
}))(ExchangeModal));
