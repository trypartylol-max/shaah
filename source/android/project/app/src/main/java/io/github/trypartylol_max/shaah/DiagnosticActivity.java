package io.github.trypartylol_max.shaah;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** Opened from the app icon's "Diagnóstico" shortcut: shows the launch log and shares it as text. */
public class DiagnosticActivity extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        String version;
        try { version = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { version = "?"; }
        String header = "SHAAH " + version + " · Android " + Build.VERSION.RELEASE
                + " · " + Build.MANUFACTURER + " " + Build.MODEL + "\n\n";
        String body = header + LaunchLog.read(this);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad * 2, pad, pad);

        LinearLayout buttons = new LinearLayout(this);
        Button share = new Button(this);
        share.setText("Compartir");
        share.setOnClickListener(v -> {
            Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, body);
            startActivity(Intent.createChooser(send, "Compartir diagnóstico"));
        });
        Button clear = new Button(this);
        clear.setText("Borrar");
        buttons.addView(share);
        buttons.addView(clear);
        root.addView(buttons);

        TextView text = new TextView(this);
        text.setTextIsSelectable(true);
        text.setTypeface(android.graphics.Typeface.MONOSPACE);
        text.setTextSize(11f);
        text.setText(body);
        clear.setOnClickListener(v -> { LaunchLog.clear(this); text.setText(header); });
        ScrollView scroll = new ScrollView(this);
        scroll.addView(text);
        root.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);
    }
}
