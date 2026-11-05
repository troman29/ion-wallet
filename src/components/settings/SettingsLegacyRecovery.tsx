import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';

import { selectCurrentAccountId } from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { callApi } from '../../api';

import useFlag from '../../hooks/useFlag';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import Modal from '../ui/Modal';
import PasswordForm from '../ui/PasswordForm';

import styles from './Settings.module.scss';

type StateProps = {
  accountId?: string;
  oldAddress?: string;
  newAddress?: string;
  isEnabled: boolean;
};

function SettingsLegacyRecovery({ accountId, oldAddress, newAddress, isEnabled }: StateProps) {
  const { showToast, releaseEnclaveSession } = getActions();
  const lang = useLang();
  const [isOpen, open, close] = useFlag();
  const [isLoading, startLoading, stopLoading] = useFlag();

  const handleRecover = useLastCallback(async (enclaveToken: string) => {
    startLoading();
    try {
      const result = accountId ? await callApi('recoverLegacyIonFunds', accountId, enclaveToken) : undefined;
      const message = result?.error ?? (result?.status === 'pending'
        ? lang('Transfer pending. Try again after confirmation.')
        : result?.status === 'done' ? lang('Legacy funds recovered') : lang('Unable to recover legacy funds'));
      showToast({ message });
    } catch (error) {
      showToast({ message: lang('Unable to recover legacy funds') });
    } finally {
      releaseEnclaveSession({ enclaveToken });
      stopLoading();
      close();
    }
  });

  if (!isEnabled || !oldAddress || !newAddress) return undefined;

  return (
    <>
      <div className={buildClassName(styles.item, styles.item_small)} onClick={open}>
        <span className={styles.itemTitle}>
          {lang('Recover funds from %address%', {
            address: `${oldAddress.slice(0, 8)}…${oldAddress.slice(-8)}`,
          })}
        </span>
        <i className={buildClassName(styles.iconChevronRight, 'icon-chevron-right')} aria-hidden />
      </div>
      <Modal isOpen={isOpen} onClose={close} noBackdropClose isCompact title={lang('Recover LION and ION')}>
        <PasswordForm
          isActive={isOpen}
          isLoading={isLoading}
          operationType="passcode"
          noAutoConfirm
          extraAuthUsages={2}
          help={`${oldAddress} → ${newAddress}`}
          submitLabel={lang('Recover LION and ION')}
          onAuthorize={handleRecover}
          onCancel={close}
        />
      </Modal>
    </>
  );
}

export default memo(withGlobal((global: GlobalState): StateProps => {
  const accountId = selectCurrentAccountId(global);
  const chain = accountId ? global.accounts?.byId[accountId]?.byChain.ton : undefined;
  return {
    accountId,
    oldAddress: chain?.legacyIonAddress,
    newAddress: chain?.address,
    isEnabled: global.isLegacyIonRecoveryEnabled === true,
  };
})(SettingsLegacyRecovery));
