import React, { memo, type TeactNode } from '../../lib/teact/teact';
import { getActions } from '../../global';

import { getDoesUsePinPad } from '../../util/biometrics';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';

import ModalHeader from '../ui/ModalHeader';
import PasswordForm from '../ui/PasswordForm';

interface OwnProps {
  isActive: boolean;
  isLoading?: boolean;
  isBurning?: boolean;
  error?: string;
  children?: TeactNode;
  extraAuthUsages?: number;
  onAuthorize: (enclaveToken: string) => void;
  onCancel: NoneToVoidFunction;
}

function TransferPassword({
  isActive, isLoading, isBurning, error, children, extraAuthUsages, onAuthorize, onCancel,
}: OwnProps) {
  const {
    cancelTransfer,
    clearTransferError,
  } = getActions();

  const lang = useLang();

  useHistoryBack({
    isActive,
    onBack: onCancel,
  });

  const title = isBurning ? 'Confirm Burning' : 'Confirm Sending';
  const submitLabel = lang('Confirm');

  return (
    <>
      {!getDoesUsePinPad() && <ModalHeader title={lang(title)} onClose={cancelTransfer} />}
      <PasswordForm
        isActive={isActive}
        isLoading={isLoading}
        withCloseButton={Boolean(children)}
        operationType="transfer"
        error={error}
        submitLabel={submitLabel}
        cancelLabel={lang('Back')}
        noAutoConfirm
        extraAuthUsages={extraAuthUsages}
        onAuthorize={onAuthorize}
        onCancel={onCancel}
        onUpdate={clearTransferError}
      >
        {children}
      </PasswordForm>
    </>
  );
}

export default memo(TransferPassword);
