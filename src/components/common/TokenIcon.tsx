import React, { memo, type TeactNode } from '../../lib/teact/teact';

import type { ApiToken } from '../../api/types';
import type { UserToken } from '../../global/types';

import buildClassName from '../../util/buildClassName';
import getTokenChainIcon from '../../util/getTokenChainIcon';
import getTokenImage from '../../util/getTokenImage';
import { getIsNativeStakedToken, getIsRwaStockToken } from '../../util/tokens';

import useFlag from '../../hooks/useFlag';

import styles from './TokenIcon.module.scss';

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
  const image = getTokenImage(token);
  const [isLoadingError, markLoadingError] = useFlag();
  const chainIcon = withChainIcon && !getIsNativeStakedToken(slug) ? getTokenChainIcon(token) : undefined;
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
      {chainIcon && chain && (
        <img
          src={chainIcon}
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
