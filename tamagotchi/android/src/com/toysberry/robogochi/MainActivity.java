package com.toysberry.robogochi;

import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.os.Build;
import android.os.Bundle;
import android.view.DisplayCutout;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Робогочи on Android: one fullscreen portrait WebView. The game files live in assets/www and are served from
 * https://appassets.androidplatform.net/ (a real https origin, so ES modules, fetch and localStorage work).
 * Back = close a sheet or leave a mini-game, then exit; leaving the app saves and mutes.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private OnBackInvokedCallback backCallback;
    /** Camera cut-out insets in dp, read by the game through AndroidApp.safeInsets(): its HUD keeps clear of the hole. */
    private volatile String insetsJson = "{\"l\":0,\"r\":0,\"t\":0,\"b\":0}";

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        // the game draws under the camera cut-out and the hidden bars: the whole screen, no black stripes
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0D0A1E);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        web.setWebViewClient(new AssetClient());
        if (Build.VERSION.SDK_INT >= 28) {
            web.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
                @Override
                public WindowInsets onApplyWindowInsets(View v, WindowInsets wi) {
                    DisplayCutout dc = wi.getDisplayCutout();
                    float d = getResources().getDisplayMetrics().density;
                    int l = 0, r = 0, t = 0, b = 0;
                    if (dc != null) {
                        l = Math.round(dc.getSafeInsetLeft() / d);
                        r = Math.round(dc.getSafeInsetRight() / d);
                        t = Math.round(dc.getSafeInsetTop() / d);
                        b = Math.round(dc.getSafeInsetBottom() / d);
                    }
                    insetsJson = "{\"l\":" + l + ",\"r\":" + r + ",\"t\":" + t + ",\"b\":" + b + "}";
                    web.evaluateJavascript("window.dispatchEvent(new Event('resize'))", null);
                    return v.onApplyWindowInsets(wi);
                }
            });
        }
        setContentView(web);
        hideSystemUi();
        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = new OnBackInvokedCallback() {
                @Override
                public void onBackInvoked() {
                    handleBack();
                }
            };
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
        web.loadUrl("https://" + HOST + "/index.html");
    }

    private void handleBack() {
        web.evaluateJavascript("(window.__rgBack ? window.__rgBack() : 'exit')", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (value != null && value.contains("exit")) finish();
            }
        });
    }

    @Override
    public void onBackPressed() {
        handleBack();
    }

    private void hideSystemUi() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    protected void onPause() {
        web.evaluateJavascript("window.__rgAppPause && window.__rgAppPause()", null);
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        web.evaluateJavascript("window.__rgAppResume && window.__rgAppResume()", null);
        hideSystemUi();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        web.destroy();
        super.onDestroy();
    }

    /** Called from JS: window.AndroidApp.share(text). */
    public class Bridge {
        @JavascriptInterface
        public void share(String text) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(i, "Robogochi"));
        }

        @JavascriptInterface
        public String safeInsets() {
            return insetsJson;
        }

        @JavascriptInterface
        public void exit() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }
    }

    /** Serves assets/www over https://appassets.androidplatform.net/. */
    private class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            if (!HOST.equals(req.getUrl().getHost())) return null;
            String path = req.getUrl().getPath();
            if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
            String mime = mime(path);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-cache");
            try {
                InputStream in = getAssets().open("www" + path, AssetManager.ACCESS_STREAMING);
                String enc = mime.startsWith("text/") || mime.endsWith("json") ? "utf-8" : null;
                return new WebResourceResponse(mime, enc, 200, "OK", headers, in);
            } catch (IOException e) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers,
                    new ByteArrayInputStream(new byte[0]));
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            if (HOST.equals(req.getUrl().getHost())) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, req.getUrl()));
            } catch (Exception ignored) {
                // no browser: stay in the game
            }
            return true;
        }
    }

    private static String mime(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".ogg")) return "audio/ogg";
        if (p.endsWith(".m4a")) return "audio/mp4";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }
}
