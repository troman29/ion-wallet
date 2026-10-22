import React, { memo } from '../../../../lib/teact/teact';
import { withGlobal } from '../../../../global';

import { APP_NAME } from '../../../../config';
import { selectIsCurrentAccountViewMode, selectIsMultisigAccount } from '../../../../global/selectors';
import buildClassName from '../../../../util/buildClassName';

import { useDeviceScreen } from '../../../../hooks/useDeviceScreen';
import useLang from '../../../../hooks/useLang';

import Collapsible from '../../../ui/Collapsible';

import styles from './Warnings.module.scss';

type StateProps = {
  isMultisig: boolean;
  isViewMode: boolean;
};

function ScamWalletWarning({ isMultisig, isViewMode }: StateProps) {
  const { isLandscape } = useDeviceScreen();
  const lang = useLang();

  const isShown = isMultisig && !isViewMode;

  return (
    <Collapsible isShown={isShown}>
      <div className={buildClassName(styles.wrapper, isLandscape && styles.wrapper_landscape)}>
        {lang('Multisig Wallet Detected')}
        <p className={styles.text}>
          {lang('$multisig_warning_text', {
            app_name: APP_NAME,
          })}
        </p>
      </div>
    </Collapsible>
  );
}

export default memo(withGlobal((global): StateProps => {
  return {
    isMultisig: !!global.currentAccountId && selectIsMultisigAccount(global, global.currentAccountId),
    isViewMode: selectIsCurrentAccountViewMode(global),
  };
})(ScamWalletWarning));
