import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';
import type { LangFn } from '../../hooks/useLang';

import { dropEnclaveSessionHold, holdEnclaveSession } from '../../global/helpers/enclave';
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

  // Confirmation can take minutes, so the transfer finishes in the background. The hold keeps
  // the multichain upgrade, which `PasswordForm` runs on the same session, from releasing it midway
  const handleRecover = useLastCallback(async (enclaveToken: string) => {
    holdEnclaveSession(enclaveToken);
    close();
    showToast({ message: lang('Recovering legacy funds...') });
    try {
      const result = accountId ? await callApi('recoverLegacyIonFunds', accountId, enclaveToken) : undefined;
      showToast({ message: result?.error ?? getResultMessage(lang, result?.status) });
    } catch (error) {
      showToast({ message: lang('Unable to recover legacy funds') });
    } finally {
      if (dropEnclaveSessionHold(enclaveToken)) {
        releaseEnclaveSession({ enclaveToken });
      }
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

function getResultMessage(lang: LangFn, status?: 'pending' | 'done' | 'empty') {
  switch (status) {
    case 'pending':
      return lang('Transfer pending. Try again after confirmation.');
    case 'done':
      return lang('Legacy funds recovered');
    case 'empty':
      return lang('No funds on the legacy address');
    default:
      return lang('Unable to recover legacy funds');
  }
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
