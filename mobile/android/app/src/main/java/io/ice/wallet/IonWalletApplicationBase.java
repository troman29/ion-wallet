package io.ice.wallet;

import android.app.Application;

public abstract class IonWalletApplicationBase extends Application {

  private String currentStatusBar;

  // Mirrors Capacitor's StatusBar plugin into the host, so LegacyActivity can read
  // back what the web layer asked for. Set via the flavor subclass's
  // StatusBarPluginDelegate hook.
  public String getCurrentStatusBar() {
    return currentStatusBar;
  }

  protected void setCurrentStatusBar(String newStatusBar) {
    currentStatusBar = newStatusBar;
  }
}
