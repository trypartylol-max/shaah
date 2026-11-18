package io.github.trypartylol_max.shaah;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
final class BadgeNotifier {
    private static final String CHANNEL = "shaah_pending_habits_v1";
    private static final int ID = 4102;
    static void clear(Context context) { NotificationManagerCompat.from(context).cancel(ID); }
    static boolean update(Context context, boolean enabled, int count, long expiry, boolean spanish) {
        if (!enabled || count == 0) { clear(context); return true; }
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()
                || (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context,
                Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)) return false;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL,
                spanish ? "Hábitos pendientes" : "Pending habits", NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(true);
            manager.createNotificationChannel(channel); // Retains the user's existing channel choices.
            if (manager.getNotificationChannel(CHANNEL).getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        }
        Intent intent = new Intent(context, LauncherActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent open = PendingIntent.getActivity(context, ID, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification_icon)
            .setContentTitle(spanish ? count + " hábitos pendientes hoy" : count + " habits pending today")
            .setContentText(spanish ? "Abre SHAAH para actualizar. Refleja tu última visita." : "Open SHAAH to update. Reflects your last visit.")
            .setNumber(count).setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
            .setContentIntent(open).setOnlyAlertOnce(true).setSilent(true).setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setTimeoutAfter(Math.max(1, expiry - System.currentTimeMillis())).build();
        manager.notify(ID, notification);
        return true;
    }
}
