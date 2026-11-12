import React, { memo } from '../../lib/teact/teact';

import type { BridgeOperation } from './types';

import { IONCOIN } from '../../config';
import { getDoesUsePinPad } from '../../util/biometrics';
import { toDecimal } from '../../util/decimals';
import { formatCurrency } from '../../util/formatNumber';
import { shortenAddress } from '../../util/shortenAddress';
import { getOperationDetails } from './helpers';

import useLang from '../../hooks/useLang';

import TransactionBanner from '../common/TransactionBanner';
import PasswordForm from '../ui/PasswordForm';

import transferStyles from '../transfer/Transfer.module.scss';

interface OwnProps {
  operation: BridgeOperation;
  isLoading: boolean;
  error?: string;
  onAuthorize: (token: string) => void;
  onClose: NoneToVoidFunction;
  onUpdate: NoneToVoidFunction;
}

function BridgeAuthorization({
  operation,
  isLoading,
  error,
  onAuthorize,
  onClose,
  onUpdate,
}: OwnProps) {
  const lang = useLang();
  const { quote, amount, token } = getOperationDetails(operation);

  return (
    <PasswordForm
      isActive
      isLoading={isLoading}
      noAutoConfirm
      withCloseButton
      operationType="transfer"
      submitLabel={lang('Confirm')}
      cancelLabel={lang('Back')}
      onAuthorize={onAuthorize}
      onCancel={onClose}
      onUpdate={onUpdate}
      error={error && lang(error)}
    >
      <TransactionBanner
        tokenIn={token}
        withChainIcon
        text={formatCurrency(toDecimal(BigInt(amount)), IONCOIN.symbol)}
        secondText={shortenAddress(quote.toAddress)}
        className={!getDoesUsePinPad() ? transferStyles.transactionBanner : undefined}
      />
    </PasswordForm>
  );
}

export default memo(BridgeAuthorization);
