import React, { memo, type TeactNode } from '../../lib/teact/teact';

import type { ApiToken } from '../../api/types';
import type { UserToken } from '../../global/types';

import { BNB, ION_BNB_MAINNET, TONCOIN } from '../../config';
import buildClassName from '../../util/buildClassName';
import getChainNetworkIcon from '../../util/getChainNetworkIcon';
import { getIsNativeStakedToken, getIsNativeToken, getIsRwaStockToken } from '../../util/tokens';

import useFlag from '../../hooks/useFlag';

import styles from './TokenIcon.module.scss';

import bnbIcon from '../../assets/blockchain/chain_bnb.svg';
import ionIcon from '../../assets/blockchain/chain_ton.svg';

interface OwnProps {
  token: UserToken | ApiToken;
  withChainIcon?: boolean;
  size?: 'x-small' | 'small' | 'middle' | 'large' | 'x-large' | 'xx-large';
  className?: string;
  iconClassName?: string;
  children?: TeactNode;
}

function TokenIcon({
  token, size, withChainIcon, className, iconClassName, children,
}: OwnProps) {
  const { symbol, chain, slug } = token;
  const image = slug === TONCOIN.slug || slug === ION_BNB_MAINNET.slug
    ? ionIcon
    : slug === BNB.slug ? bnbIcon : token.image;
  const [isLoadingError, markLoadingError] = useFlag();
  const isNativeToken = getIsNativeToken(slug);
  const isNativeTokenStaking = getIsNativeStakedToken(slug);
  const shouldRenderImage = Boolean(image) && !isLoadingError;
  const shapeClassName = getIsRwaStockToken(token) ? styles.square : styles.circle;
  const iconFullClassName = buildClassName(styles.icon, size && styles[size], shapeClassName, iconClassName);

  function renderDefaultIcon() {
    return (
      <div className={buildClassName(iconFullClassName, styles.fallbackIcon)}>
        {symbol.slice(0, 1)}
      </div>
    );
  }

  return (
    <div className={buildClassName(styles.wrapper, className)}>
      {
        shouldRenderImage ? (
          <img
            key={image}
            src={image}
            alt={symbol}
            className={iconFullClassName}
            draggable={false}
            onError={markLoadingError}
          />
        ) : renderDefaultIcon()
      }
      {withChainIcon && !isNativeToken && !isNativeTokenStaking && chain && (
        <img
          src={getChainNetworkIcon(chain)}
          alt=""
          className={buildClassName(styles.blockchainIcon, size && styles[size])}
          draggable={false}
        />
      )}
      {children}
    </div>
  );
}

export default memo(TokenIcon);
