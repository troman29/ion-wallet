import type { TeactNode } from '../../lib/teact/teact';
import React, { memo } from '../../lib/teact/teact';

import type { ApiDappurlTrustStatusStatus } from '../../api/types';

import useLang from '../../hooks/useLang';

import IconWithTooltip from '../ui/IconWithTooltip';

import styles from './Dapp.module.scss';

interface OwnProps {
  url?: string;
  iconClassName?: string;
  /** When omitted, treated as `unknown` (legacy). */
  urlTrustStatus?: ApiDappurlTrustStatusStatus;
}

function DappHostWarning({ url, iconClassName, urlTrustStatus = 'unknown' }: OwnProps) {
  const lang = useLang();

  if (urlTrustStatus === 'verified') {
    return;
  }

  let title: string;
  let body: TeactNode;

  if (urlTrustStatus === 'invalid') {
    title = lang('DappurlTrustStatusInvalidTitle');
    body = <p className={styles.dappHostWarningText}>{lang('$DappurlTrustStatusInvalidHelp')}</p>;
  } else if (urlTrustStatus === 'dangerous') {
    title = lang('DappurlTrustStatusDangerousTitle');
    body = <p className={styles.dappHostWarningText}>{lang('$DappurlTrustStatusDangerousHelp')}</p>;
  } else {
    title = lang('Unverified Source');
    body = <p className={styles.dappHostWarningText}>{lang('$unverified_source_warning')}</p>;
  }

  return (
    <IconWithTooltip
      direction="bottom"
      message={(
        <>
          <b>{title}</b>
          {body}
        </>
      )}
      type={urlTrustStatus === 'dangerous' ? 'danger' : 'warning'}
      size="small"
      iconClassName={iconClassName}
      canHoverOnTooltip
    />
  );
}

export default memo(DappHostWarning);
