package io.ice.wallet;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.webkit.WebViewCompat;

/*
  Application entry point. Hands the launch intent, deeplink included, to the
  Capacitor-hosted LegacyActivity and finishes itself.
 */
public class MainActivity extends BaseActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    Log.i("IonWalletApplication", "Main Activity Created");
    super.onCreate(savedInstanceState);

    if (!isWebViewAvailable()) {
      showWebViewUnavailableDialog();
      return;
    }

    launchLegacyActivity();
  }

  @Override
  protected void onNewIntent(@NonNull Intent intent) {
    super.onNewIntent(intent);
  }

  private void launchLegacyActivity() {
    Intent sourceIntent = getIntent();
    Intent intent = new Intent(this, LegacyActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
    intent.setAction(sourceIntent.getAction());
    intent.setData(sourceIntent.getData());
    if (sourceIntent.getExtras() != null) {
      intent.putExtras(sourceIntent.getExtras());
    }
    startActivity(intent);
    overridePendingTransition(0, 0);
    finish();
  }

  private boolean isWebViewAvailable() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (WebViewCompat.getCurrentWebViewPackage(this) == null) {
        return false;
      }
    }
    try {
      new WebView(this).destroy();
      return true;
    } catch (Throwable t) {
      Log.e("IonWalletApplication", "WebView unavailable", t);
      return false;
    }
  }

  private void showWebViewUnavailableDialog() {
    new AlertDialog.Builder(this)
      .setTitle("WebView not available")
      .setMessage("This application needs Android System WebView to run. Please install or enable it from the Play Store, then reopen the app.")
      .setCancelable(false)
      .setPositiveButton("Open Play Store", (dialog, which) -> {
        openWebViewInStore();
        finish();
      })
      .setNegativeButton("Close", (dialog, which) -> finish())
      .show();
  }

  private void openWebViewInStore() {
    Intent intent = new Intent(Intent.ACTION_VIEW,
      Uri.parse("market://details?id=com.google.android.webview"));
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    try {
      startActivity(intent);
    } catch (ActivityNotFoundException e) {
      Intent web = new Intent(Intent.ACTION_VIEW,
        Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview"));
      web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      try {
        startActivity(web);
      } catch (ActivityNotFoundException ignored) {
      }
    }
  }
}
