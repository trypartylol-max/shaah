package io.github.trypartylol_max.shaah;

import android.app.Notification;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Chrome hands SHAAH's web notifications to this service. The pending-habits notification
 * (web tag "shaah-pending") gets its count as the notification number, which is what Android
 * launchers use for the number on the app icon. HyperOS/MIUI also read their own message count.
 * Only that notification is touched; everything else passes through unchanged.
 */
public class DelegationService extends
        com.google.androidbrowserhelper.trusted.DelegationService {
    static final String PENDING_TAG = "shaah-pending";
    private static final Pattern FIRST_NUMBER = Pattern.compile("(\\d{1,3})");

    @Override
    public boolean onNotifyNotificationWithChannel(String platformTag, int platformId,
            Notification notification, String channelName) {
        try {
            if (notification != null && platformTag != null && platformTag.contains(PENDING_TAG)) {
                int count = pendingCount(notification);
                if (count > 0) {
                    notification.number = count;
                    notification.flags |= Notification.FLAG_ONLY_ALERT_ONCE;
                    setMiuiMessageCount(notification, count);
                }
            }
        } catch (RuntimeException ignored) { /* Never block a notification over the badge. */ }
        return super.onNotifyNotificationWithChannel(platformTag, platformId, notification, channelName);
    }

    static int pendingCount(Notification notification) {
        CharSequence title = notification.extras == null ? null
                : notification.extras.getCharSequence(Notification.EXTRA_TITLE);
        if (title == null) return 0;
        Matcher m = FIRST_NUMBER.matcher(title);
        return m.find() ? Integer.parseInt(m.group(1)) : 1; // Singular phrasings carry no digit.
    }

    private static void setMiuiMessageCount(Notification notification, int count) {
        try {
            Field field = notification.getClass().getDeclaredField("extraNotification");
            Object extra = field.get(notification);
            if (extra == null) return;
            Method method = extra.getClass().getDeclaredMethod("setMessageCount", int.class);
            method.invoke(extra, count);
        } catch (Throwable ignored) { /* Not a Xiaomi build. */ }
    }
}
