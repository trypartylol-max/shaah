package io.github.trypartylol_max.shaah;

import android.content.Context;
import android.content.SharedPreferences;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Small on-device record of launcher steps, shown by DiagnosticActivity. No account or habit data. */
final class LaunchLog {
    private static final String PREFS = "shaah_launch_log", KEY = "lines";
    private static final int MAX_LINES = 120;
    private LaunchLog() {}

    static synchronized void log(Context context, String message) {
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String time = new SimpleDateFormat("MM-dd HH:mm:ss.SSS", Locale.US).format(new Date());
        String all = prefs.getString(KEY, "") + time + "  " + message + "\n";
        String[] lines = all.split("\n");
        if (lines.length > MAX_LINES) {
            StringBuilder kept = new StringBuilder();
            for (int i = lines.length - MAX_LINES; i < lines.length; i++) kept.append(lines[i]).append('\n');
            all = kept.toString();
        }
        prefs.edit().putString(KEY, all).apply();
    }

    static String read(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "");
    }

    static void clear(Context context) {
        context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply();
    }
}
