package io.ice.wallet;

import com.capacitorjs.plugins.statusbar.StatusBarPluginDelegate;

public class IonWalletApplication extends IonWalletApplicationBase implements StatusBarPluginDelegate {

  @Override
  public void didUpdateStatusBar(String newStatusBar) {
    setCurrentStatusBar(newStatusBar);
  }
}
