import React, { memo } from '../../../../lib/teact/teact';
import { withGlobal } from '../../../../global';

import { ContentTab } from '../../../../global/types';

import { selectCurrentAccountId } from '../../../../global/selectors';

import Explore from '../../../explore/Explore';
import Settings from '../../../settings/Settings';
import Transition from '../../../ui/Transition';
import LandscapeContent from '../Content/LandscapeContent';

import styles from './LandscapeLayout.module.scss';

interface OwnProps {
  onStakedTokenClick: NoneToVoidFunction;
}

interface StateProps {
  areSettingsOpen?: boolean;
  isExploreOpen?: boolean;
}

function LandscapeLayout({
  onStakedTokenClick, areSettingsOpen, isExploreOpen,
}: OwnProps & StateProps) {
  function renderSlide(isActive: boolean, _isFrom: boolean, currentKey: ContentTab) {
    switch (currentKey) {
      case ContentTab.Explore:
        return (
          <div className={styles.standaloneWrapper}>
            <Explore isActive={isActive} />
          </div>
        );
      case ContentTab.Settings:
        return (
          <div className={styles.settingsWrapper}>
            <Settings isActive={isActive} />
          </div>
        );
      default:
        return <LandscapeContent onStakedTokenClick={onStakedTokenClick} />;
    }
  }

  function getActiveKey() {
    if (areSettingsOpen) return ContentTab.Settings;
    if (isExploreOpen) return ContentTab.Explore;

    return ContentTab.Overview;
  }

  const activeKey = getActiveKey();

  return (
    <Transition
      name="semiFade"
      activeKey={activeKey}
      className={styles.transition}
      slideClassName={styles.slide}
    >
      {renderSlide}
    </Transition>
  );
}

export default memo(
  withGlobal<OwnProps>(
    (global): StateProps => {
      const {
        areSettingsOpen, isExploreOpen,
      } = global;

      return {
        areSettingsOpen, isExploreOpen,
      };
    },
    (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)),
  )(LandscapeLayout),
);
