import React, {
  memo, useEffect, useRef, useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiImportAddressByChain } from '../../api/types';

import renderText from '../../global/helpers/renderText';
import buildClassName from '../../util/buildClassName';
import { getChainConfig, getSupportedChains } from '../../util/chain';
import { stopEvent } from '../../util/domEvents';
import isEmptyObject from '../../util/isEmptyObject';
import { isIonsiteAddress, isValidAddressOrDomain } from '../../util/isValidAddress';
import { getHostnameFromUrl } from '../../util/url';
import { ANIMATED_STICKERS_PATHS } from '../ui/helpers/animatedAssets';

import useFocusAfterAnimation from '../../hooks/useFocusAfterAnimation';
import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import AddressInput from '../ui/AddressInput';
import AnimatedIconWithPreview from '../ui/AnimatedIconWithPreview';
import Button from '../ui/Button';
import ModalHeader from '../ui/ModalHeader';

import modalStyles from '../ui/Modal.module.scss';
import styles from './Auth.module.scss';

type OwnProps = {
  isActive?: boolean;
  isLoading?: boolean;
  isInModal?: boolean;
  onCancel: NoneToVoidFunction;
  onClose?: NoneToVoidFunction;
};

type StateProps = {
  scannedAddress?: string;
};

function AuthImportViewAccount({
  isActive, isLoading, isInModal, scannedAddress, onCancel, onClose,
}: OwnProps & StateProps) {
  const { importViewAccount, requestOpenQrScanner, clearViewAccountQrAddress } = getActions();

  const lang = useLang();

  const inputRef = useRef<HTMLInputElement>();
  const [value, setValue] = useState<string>('');
  const [isInvalidAddress, setIsInvalidAddress] = useState<boolean>(false);

  useFocusAfterAnimation(inputRef, !isActive);

  useHistoryBack({
    isActive,
    onBack: onCancel,
  });

  useEffect(() => {
    if (!scannedAddress) {
      return;
    }

    setValue(scannedAddress);
    clearViewAccountQrAddress();
  }, [scannedAddress]);

  const handleQrScan = useLastCallback(() => {
    requestOpenQrScanner({ isViewAccount: true });
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    stopEvent(e);

    if (isInvalidAddress || isLoading) return;

    const addresses = value.trim().split(/\s+/);
    const addressByChain: ApiImportAddressByChain = {};

    for (let address of addresses) {
      for (const chain of getSupportedChains()) {
        if (getChainConfig(chain).isDnsSupported && isIonsiteAddress(address)) {
          address = getHostnameFromUrl(address);
        }
        if (isValidAddressOrDomain(address, chain)) {
          addressByChain[chain] = address;
          // Continuing the loop, because addresses can be valid in multiple chains, for example in Ethereum blockchain
          // forks. The user doesn't specify the intended blockchain, so we add all that this address can belong to.
        }
      }
    }

    if (!isEmptyObject(addressByChain)) {
      importViewAccount({ addressByChain });
      inputRef.current?.blur(); // To hide the virtual keyboard to show the loading indicator in the button
    } else {
      setIsInvalidAddress(true);
    }
  }

  return (
    <div className={modalStyles.transitionContentWrapper}>
      <ModalHeader
        title={lang('View Mode')}
        onBackButtonClick={onCancel}
        onClose={onClose}
      />
      <form
        action="#"
        className={buildClassName(modalStyles.transitionContent, isInModal && styles.viewModeForm, 'custom-scroll')}
        onSubmit={handleSubmit}
      >
        <AnimatedIconWithPreview
          play={isActive}
          tgsUrl={ANIMATED_STICKERS_PATHS.bill}
          previewUrl={ANIMATED_STICKERS_PATHS.billPreview}
          noLoop={false}
          nonInteractive
          className={styles.viewModeSticker}
        />

        <AddressInput
          ref={inputRef}
          value={value}
          address=""
          addressName=""
          withQrScan
          shouldHideAddressBook
          shouldValidateAllChains
          onInput={setValue}
          onError={setIsInvalidAddress}
          onQrScan={handleQrScan}
        />

        <p className={styles.info}>
          {renderText(lang('$import_view_account_note'))}
        </p>

        <div className={buildClassName(styles.buttons, isInModal && styles.buttonsInModal)}>
          <Button
            isPrimary
            isSubmit
            className={modalStyles.buttonFullWidth}
            isLoading={isLoading}
            isDisabled={isInvalidAddress}
          >
            {isInvalidAddress ? lang('Invalid Address') : lang('Continue')}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default memo(withGlobal<OwnProps>((global): StateProps => ({
  scannedAddress: global.viewAccountQrAddress,
}))(AuthImportViewAccount));
