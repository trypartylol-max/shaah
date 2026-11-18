package io.github.trypartylol_max.shaah;

import android.app.Activity;
import android.content.ComponentName;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.browser.customtabs.*;
import androidx.browser.trusted.Token;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import com.google.androidbrowserhelper.trusted.SharedPreferencesTokenStore;
import org.json.JSONObject;

/** DAL-validated, same-origin aggregate count channel. No credentials or habit names. */
public class LauncherActivity extends Activity {
    private static final Uri ORIGIN = Uri.parse("https://trypartylol-max.github.io");
    private static final Uri HOME = Uri.parse("https://trypartylol-max.github.io/shaah/");
    private CustomTabsSession session;
    private boolean validated, loaded, requested, ready, bound, launched;
    // HyperOS can delay or block binding to the browser service; never leave the translucent launcher stuck.
    private static final long CONNECT_TIMEOUT_MS = 3000L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable connectTimeout = () -> { if (!launched && !isFinishing()) fallback(); };
    private final CustomTabsCallback callback = new CustomTabsCallback() {
        @Override public void onRelationshipValidationResult(int relation, Uri origin, boolean result, Bundle extras) {
            if (relation != CustomTabsService.RELATION_USE_AS_ORIGIN || !ORIGIN.equals(origin)) return;
            validated = result;
            requestChannel();
        }
        @Override public void onNavigationEvent(int event, Bundle extras) {
            if (event == NAVIGATION_STARTED) { loaded = false; ready = false; requested = false; }
            if (event == NAVIGATION_FINISHED) { loaded = true; requestChannel(); }
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
            if (isFinishing() || launched) return;
            client.warmup(0L);
            session = client.newSession(callback);
            if (session == null) { fallback(); return; }
            new SharedPreferencesTokenStore(LauncherActivity.this).store(Token.create(name.getPackageName(), getPackageManager()));
            session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, ORIGIN, null);
            launched = true;
            handler.removeCallbacks(connectTimeout);
            new TrustedWebActivityIntentBuilder(launchUri()).build(session).launchTrustedWebActivity(LauncherActivity.this);
        }
        @Override public void onServiceDisconnected(ComponentName name) {
            ready = false; validated = false; session = null;
        }
    };
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        BadgeNotifier.clear(this);
        if (state != null) { finish(); return; }
        String provider = CustomTabsClient.getPackageName(this, null);
        if (provider == null) { fallback(); return; }
        bound = CustomTabsClient.bindCustomTabsService(this, provider, connection);
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
        handler.removeCallbacks(connectTimeout);
        new CustomTabsIntent.Builder().build().launchUrl(this, launchUri());
        finish();
    }
    @Override protected void onRestart() { super.onRestart(); finish(); }
    @Override protected void onDestroy() {
        ready = false;
        handler.removeCallbacks(connectTimeout);
        if (bound) unbindService(connection);
        super.onDestroy();
    }
}
