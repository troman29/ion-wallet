import React, { memo, useRef } from '../../lib/teact/teact';

import {
  APP_ENV_MARKER,
  APP_NAME,
  APP_REPO_URL,
  APP_VERSION,
} from '../../config';
import renderText from '../../global/helpers/renderText';
import buildClassName from '../../util/buildClassName';

import { useDeviceScreen } from '../../hooks/useDeviceScreen';
import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';

import Header from '../auth/Header';
import SettingsHeader from './SettingsHeader';

import activityStyles from '../main/sections/Content/Activity.module.scss';
import styles from './Settings.module.scss';

import logoWebpPath from '../../assets/logo.webp';

const LOGO_PATH = logoWebpPath;

interface OwnProps {
  isActive?: boolean;
  slideClassName?: string;
  onBackClick: NoneToVoidFunction;
}

function SettingsAbout({
  isActive, slideClassName, onBackClick,
}: OwnProps) {
  const lang = useLang();

  const { isPortrait } = useDeviceScreen();
  const headerRef = useRef<HTMLHeadingElement>();

  useHistoryBack({
    isActive,
    onBack: onBackClick,
  });

  return (
    <div className={buildClassName(styles.slide, slideClassName)}>
      {isPortrait ? (
        <Header
          isActive={isActive}
          title={`${APP_NAME} ${APP_VERSION} ${APP_ENV_MARKER || ''}`}
          topTargetRef={headerRef}
          onBackClick={onBackClick}
        />
      ) : (
        <SettingsHeader onBackClick={onBackClick} />
      )}

      <div
        className={buildClassName(styles.content, styles.noTitle, 'custom-scroll')}
      >
        <img src={LOGO_PATH} alt={APP_NAME} className={styles.logo} />
        <h2 ref={headerRef} className={styles.title}>
          {APP_NAME} {APP_VERSION} {APP_ENV_MARKER}
          <a href="https://ice.io/" target="_blank" className={styles.titleLink} rel="noreferrer">
            ice.io
          </a>
        </h2>
        <div className={buildClassName(styles.settingsBlock, styles.settingsBlock_text)}>
          <p className={styles.text}>
            {renderText(lang('$about_description1'))}
          </p>
          <p className={styles.text}>
            {renderText(lang('$about_description2'))}
          </p>
        </div>

        <div className={buildClassName(styles.settingsBlock, styles.settingsBlock_text)}>
          <h3 className={buildClassName(activityStyles.comment, activityStyles.colorIn, styles.heading)}>
            <i className={buildClassName(styles.github, 'icon-github')} aria-hidden /> {lang('Is it open source?')}
          </h3>
          <p className={buildClassName(styles.text, styles.textInChat)}>
            {lang('$about_wallet_github', {
              github_link: (
                <a href={APP_REPO_URL} target="_blank" rel="noreferrer">
                  {renderText(lang('$about_github_link_text'))}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsAbout);
