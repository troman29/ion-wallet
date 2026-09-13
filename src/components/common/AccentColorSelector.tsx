import React, { memo, useMemo } from '../../lib/teact/teact';
import { getActions } from '../../global';

import type { Theme } from '../../global/types';

import { ACCENT_COLORS } from '../../util/accentColor/constants';
import buildClassName from '../../util/buildClassName';

import useAppTheme from '../../hooks/useAppTheme';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import styles from './AccentColorSelector.module.scss';

interface OwnProps {
  accentColorIndex?: number;
  theme: Theme;
}

function AccentColorSelector({ accentColorIndex, theme }: OwnProps) {
  const { setAccentColorIndex } = getActions();
  const lang = useLang();
  const appTheme = useAppTheme(theme);
  const colors = useMemo(() => ACCENT_COLORS[appTheme], [appTheme]);

  const handleAccentColorClick = useLastCallback((index?: number) => {
    setAccentColorIndex({ accentColorIndex: index });
  });

  return (
    <div className={styles.colors}>
      <button
        type="button"
        disabled={accentColorIndex === undefined}
        className={buildClassName(styles.colorButton, accentColorIndex === undefined && styles.colorButtonCurrent)}
        aria-label={lang('Change Palette')}
        onClick={() => handleAccentColorClick()}
      />
      {colors.map((color, index) => (
        <button
          key={color}
          type="button"
          disabled={accentColorIndex === index}
          style={`--current-accent-color: ${color}`}
          className={buildClassName(styles.colorButton, accentColorIndex === index && styles.colorButtonCurrent)}
          aria-label={lang('Change Palette')}
          onClick={() => handleAccentColorClick(index)}
        />
      ))}
    </div>
  );
}

export default memo(AccentColorSelector);
