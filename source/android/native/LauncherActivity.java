package io.github.trypartylol_max.shaah;

import android.app.Activity;
import android.content.ComponentName;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import androidx.browser.customtabs.*;
import androidx.browser.trusted.Token;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import com.google.androidbrowserhelper.trusted.SharedPreferencesTokenStore;
import org.json.JSONObject;

/**
 * Opens SHAAH as a Trusted Web Activity and keeps the DAL-validated, same-origin aggregate count channel.
 * HyperOS can delay the browser service or kill this process in the background, so the launcher never waits
 * on a translucent, empty screen: a connection timeout, a watchdog after each launch and a reopen when it comes
 * back on top without the tab. Every step goes to LaunchLog (icon shortcut "Diagnóstico").
 */
public class LauncherActivity extends Activity {
    private static final Uri ORIGIN = Uri.parse("https://trypartylol-max.github.io");
    private static final Uri HOME = Uri.parse("https://trypartylol-max.github.io/shaah/");
    private static final long CONNECT_TIMEOUT_MS = 1500L;
    private static final long WATCHDOG_MS = 2500L;
    // Leaving SHAAH with Back hides the tab and brings this launcher back within moments; coming back from the
    // home screen after HyperOS dropped the app does not. Only the first case should close the app.
    private static final long BACK_WINDOW_MS = 2000L;
    private static final String PREFS = "shaah_launcher", KEY_HIDDEN_AT = "tab_hidden_at";

    private CustomTabsSession session;
    private boolean validated, loaded, requested, ready, bound, launched, resumed;
    private int launches;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable connectTimeout = () -> {
        if (!launched && !isFinishing()) { log("timeout: browser service did not connect in " + CONNECT_TIMEOUT_MS + " ms"); fallback(); }
    };
    // Still in front after a launch means the tab never covered this translucent screen.
    private final Runnable watchdog = () -> {
        if (isFinishing() || !resumed) return;
        log("watchdog: SHAAH did not appear after launch #" + launches);
        if (launches < 2) { launched = false; fallback(); } else { log("watchdog: giving up, closing launcher"); finish(); }
    };

    private final CustomTabsCallback callback = new CustomTabsCallback() {
        @Override public void onRelationshipValidationResult(int relation, Uri origin, boolean result, Bundle extras) {
            if (relation != CustomTabsService.RELATION_USE_AS_ORIGIN || !ORIGIN.equals(origin)) return;
            log("origin validation: " + result);
            validated = result;
            requestChannel();
        }
        @Override public void onNavigationEvent(int event, Bundle extras) {
            if (event == NAVIGATION_STARTED) { loaded = false; ready = false; requested = false; }
            if (event == NAVIGATION_FINISHED) { loaded = true; requestChannel(); }
            if (event == NAVIGATION_FAILED) log("navigation failed");
            if (event == TAB_SHOWN) log("tab shown");
            if (event == TAB_HIDDEN) { log("tab hidden"); prefs().edit().putLong(KEY_HIDDEN_AT, SystemClock.elapsedRealtime()).apply(); }
        }
        @Override public void onMessageChannelReady(Bundle extras) {
            if (!validated || session == null) return;
            ready = true;
            session.postMessage("shaah.badge.ready.v1", null);
        }
        @Override public void onPostMessage(String message, Bundle extras) {
            if (!ready || !validated || message == null || message.length() > 512) return;
            try {
                JSONObject value = new JSONObject(message);
                if (!"shaah.badge.state.v1".equals(value.optString("type"))) return;
                Object enabled = value.get("enabled"), pending = value.get("pending"), expiry = value.get("expiresAt");
                if (!(enabled instanceof Boolean) || !(pending instanceof Number) || !(expiry instanceof Number)) return;
                double count = ((Number) pending).doubleValue(), end = ((Number) expiry).doubleValue();
                if (!BadgePolicy.valid(count, end, System.currentTimeMillis())) return;
                if (!BadgeNotifier.update(LauncherActivity.this, (Boolean) enabled, (int) count,
                        (long) end, "es".equals(value.optString("lang")))) {
                    session.postMessage("shaah.badge.permission-denied.v1", null);
                }
            } catch (Exception ignored) { /* Ignore malformed or unavailable count messages. */ }
        }
    };
    private void requestChannel() {
        if (validated && loaded && session != null && !requested)
            requested = session.requestPostMessageChannel(ORIGIN, ORIGIN, new Bundle());
    }

    private final CustomTabsServiceConnection connection = new CustomTabsServiceConnection() {
        @Override public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
            log("browser service connected: " + name.getPackageName());
            if (isFinishing() || launched) return;
            client.warmup(0L);
            session = client.newSession(callback);
            if (session == null) { log("newSession returned null"); fallback(); return; }
            new SharedPreferencesTokenStore(LauncherActivity.this).store(Token.create(name.getPackageName(), getPackageManager()));
            session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, ORIGIN, null);
            launchTwa();
        }
        @Override public void onServiceDisconnected(ComponentName name) {
            log("browser service disconnected");
            ready = false; validated = false; session = null;
        }
    };

    private void log(String message) { LaunchLog.log(this, message); }
    private SharedPreferences prefs() { return getSharedPreferences(PREFS, MODE_PRIVATE); }
    private boolean userJustLeft() {
        long at = prefs().getLong(KEY_HIDDEN_AT, -1L), now = SystemClock.elapsedRealtime();
        return at > 0 && now >= at && now - at < BACK_WINDOW_MS;
    }

    private void launchTwa() {
        launched = true;
        launches++;
        handler.removeCallbacks(connectTimeout);
        log("launch TWA #" + launches);
        try {
            new TrustedWebActivityIntentBuilder(launchUri()).build(session).launchTrustedWebActivity(LauncherActivity.this);
        } catch (RuntimeException e) {
            log("launch TWA failed: " + e.getClass().getSimpleName());
            launched = false;
            fallback();
            return;
        }
        handler.removeCallbacks(watchdog);
        handler.postDelayed(watchdog, WATCHDOG_MS);
    }

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        log("onCreate" + (state != null ? " (restored)" : ""));
        BadgeNotifier.clear(this);
        // Recreated after HyperOS killed the app: reopen SHAAH unless the person just backed out of it.
        if (state != null && userJustLeft()) { log("restored right after Back: closing"); finish(); return; }
        start();
    }

    private void start() {
        launched = false;
        String provider = CustomTabsClient.getPackageName(this, null);
        log("browser provider: " + provider);
        if (provider == null) { fallback(); return; }
        bound = CustomTabsClient.bindCustomTabsService(this, provider, connection);
        log("bind browser service: " + bound);
        if (!bound) { fallback(); return; }
        handler.postDelayed(connectTimeout, CONNECT_TIMEOUT_MS);
    }

    private Uri launchUri() {
        Uri input = getIntent().getData();
        if (input != null && "https".equals(input.getScheme())
                && "trypartylol-max.github.io".equals(input.getHost())
                && (input.getPort() == -1 || input.getPort() == 443)
                && input.getUserInfo() == null && input.getPath() != null
                && ("/shaah/".equals(input.getPath()) || "/shaah/index.html".equals(input.getPath()))) return input;
        return HOME; // Preserve valid OAuth query/fragment; refuse external launch URLs.
    }

    private void fallback() {
        if (launched) return;
        launched = true;
        launches++;
        handler.removeCallbacks(connectTimeout);
        handler.removeCallbacks(watchdog);
        log("fallback: opening in a browser tab");
        try {
            new CustomTabsIntent.Builder().build().launchUrl(this, launchUri());
        } catch (RuntimeException e) {
            log("fallback failed: " + e.getClass().getSimpleName());
        }
        finish();
    }

    // Chrome may report the hidden tab a moment after this launcher is back on top, so decide shortly after.
    private final Runnable afterRestart = () -> {
        if (isFinishing()) return;
        if (userJustLeft()) { log("back on top right after Back: closing"); finish(); return; }
        log("back on top without SHAAH: reopening (session " + (session != null ? "alive" : "gone") + ")");
        if (session != null) { launchTwa(); return; }
        if (bound) { try { unbindService(connection); } catch (IllegalArgumentException ignored) { } bound = false; }
        start();
    };

    @Override protected void onRestart() {
        super.onRestart();
        log("onRestart");
        handler.postDelayed(afterRestart, 500L);
    }
    @Override protected void onResume() { super.onResume(); resumed = true; }
    @Override protected void onPause() { resumed = false; handler.removeCallbacks(watchdog); super.onPause(); }
    @Override protected void onDestroy() {
        log("onDestroy");
        handler.removeCallbacks(afterRestart);
        ready = false;
        handler.removeCallbacks(connectTimeout);
        handler.removeCallbacks(watchdog);
        if (bound) { try { unbindService(connection); } catch (IllegalArgumentException ignored) { } }
        super.onDestroy();
    }
}
