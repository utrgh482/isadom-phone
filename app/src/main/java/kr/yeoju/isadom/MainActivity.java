package kr.yeoju.isadom;

/* =====================================================================
 *  이사돔 핸드폰 앱 — 껍데기 (MainActivity)  v1 (2026-09-28)
 *  하는 일: GitHub Pages 에 올린 이사돔 핸드폰 페이지(HOME_URL)를 앱 안(WebView)에서 엽니다.
 *   - 사진·파일 고르기(<input type=file>) → 카메라로 찍기 / 갤러리·파일에서 고르기
 *   - 페이지가 만든 파일 내려받기(밴드로 보낼 JSON 등) → 핸드폰 '다운로드' 폴더에 저장 (IsadomApp.saveFile)
 *   - 인터넷이 안 될 때 안내 화면 + [다시 시도]
 *   - 뒤로 가기 단추는 페이지 안에서 뒤로, 더 없으면 앱 나가기
 *  자료는 이 앱 파일 안에 없습니다 — 페이지가 핸드폰 저장 공간(localStorage/IndexedDB)에 둡니다.
 *  본체(페이지)를 고치면 앱은 그대로 두고 저절로 새 페이지가 열립니다.
 * ===================================================================== */

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final String HOME_URL = BuildConfig.HOME_URL;
    private static final int REQ_FILE = 1001;

    private WebView web;
    private ProgressBar bar;
    private ValueCallback<Uri[]> fileCb;   // 페이지가 기다리는 "고른 파일" 회신
    private Uri cameraUri;                 // 카메라로 찍을 때 사진이 저장될 자리

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        FrameLayout root = new FrameLayout(this);
        web = new WebView(this);
        bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams barLp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3));
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(bar, barLp);
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " IsadomApp/" + BuildConfig.VERSION_NAME);
        CookieManager.getInstance().setAcceptCookie(true);

        web.addJavascriptInterface(new Bridge(), "IsadomApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String host = u.getHost() == null ? "" : u.getHost();
                String homeHost = Uri.parse(HOME_URL).getHost();
                if (homeHost != null && homeHost.equals(host)) return false;   // 우리 페이지 안은 앱에서
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }   // 바깥 링크는 브라우저로
                return true;
            }
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOffline("인터넷이 안 됩니다");
            }
            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse resp) {
                if (request.isForMainFrame() && resp.getStatusCode() >= 400) showOffline("페이지를 열지 못했습니다 (" + resp.getStatusCode() + ")");
            }
            @Override
            public void onPageFinished(WebView view, String url) { bar.setVisibility(View.GONE); }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int p) {
                bar.setVisibility(p >= 100 ? View.GONE : View.VISIBLE);
                bar.setProgress(p);
            }
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                openChooser(cb, params);
                return true;
            }
        });

        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String ua, String contentDisposition, String mime, long len) {
                String name = URLUtil.guessFileName(url, contentDisposition, mime);
                if (url.startsWith("blob:")) {
                    // 페이지 안에서 만든 파일(blob)은 자바스크립트로 읽어 IsadomApp.saveFile 로 넘깁니다
                    String js = "(function(){fetch(" + q(url) + ").then(function(r){return r.blob()}).then(function(b){var fr=new FileReader();fr.onload=function(){IsadomApp.saveFile(" + q(name) + ",fr.result.split(',')[1],b.type||" + q(mime == null ? "" : mime) + ")};fr.readAsDataURL(b)})})();";
                    web.evaluateJavascript(js, null);
                } else if (url.startsWith("http")) {
                    try {
                        DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                        r.setMimeType(mime);
                        r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                        ((DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(r);
                        toast("내려받는 중: " + name);
                    } catch (Exception e) { toast("내려받지 못했습니다"); }
                }
            }
        });

        if (saved != null) web.restoreState(saved); else web.loadUrl(HOME_URL);
    }

    /* ---------- 사진·파일 고르기: 카메라 + 갤러리·파일 ---------- */
    private void openChooser(ValueCallback<Uri[]> cb, WebChromeClient.FileChooserParams params) {
        if (fileCb != null) fileCb.onReceiveValue(null);
        fileCb = cb;
        cameraUri = null;

        Intent content = new Intent(Intent.ACTION_GET_CONTENT);
        content.addCategory(Intent.CATEGORY_OPENABLE);
        String[] types = params.getAcceptTypes();
        boolean wantsImage = types == null || types.length == 0;
        List<String> mimes = new ArrayList<>();
        if (types != null) for (String t : types) {
            if (t == null || t.trim().isEmpty()) continue;
            String m = t.trim();
            if (m.startsWith(".")) m = mimeOfExt(m.substring(1));
            if (m.startsWith("image/")) wantsImage = true;
            if (m.contains("/")) mimes.add(m);
        }
        content.setType(mimes.size() == 1 ? mimes.get(0) : "*/*");
        if (mimes.size() > 1) content.putExtra(Intent.EXTRA_MIME_TYPES, mimes.toArray(new String[0]));
        if (params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) content.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

        Intent chooser = Intent.createChooser(content, "사진·파일 고르기");
        if (wantsImage) {
            try {
                File dir = new File(getCacheDir(), "camera");
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, "isadom_" + System.currentTimeMillis() + ".jpg");
                cameraUri = FileProvider.getUriForFile(this, "kr.yeoju.isadom.files", f);
                Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                cam.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                cam.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cam});
            } catch (Exception e) { cameraUri = null; }
        }
        try { startActivityForResult(chooser, REQ_FILE); }
        catch (Exception e) { fileCb.onReceiveValue(null); fileCb = null; toast("파일을 고를 앱이 없습니다"); }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_FILE || fileCb == null) return;
        Uri[] out = null;
        if (res == RESULT_OK) {
            if (data != null && data.getClipData() != null) {
                ClipData cd = data.getClipData();
                out = new Uri[cd.getItemCount()];
                for (int i = 0; i < cd.getItemCount(); i++) out[i] = cd.getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) {
                out = new Uri[]{data.getData()};
            } else if (cameraUri != null) {
                out = new Uri[]{cameraUri};   // 카메라로 찍으면 data 가 비어 옵니다
            }
        }
        fileCb.onReceiveValue(out);
        fileCb = null;
        cameraUri = null;
    }

    /* ---------- 페이지에서 부르는 다리 (window.IsadomApp) ---------- */
    private class Bridge {
        /** 파일을 핸드폰 '다운로드' 폴더에 저장합니다. base64 = 파일 내용 */
        @JavascriptInterface
        public boolean saveFile(String name, String base64, String mime) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                String safe = (name == null || name.trim().isEmpty()) ? "isadom_" + System.currentTimeMillis() : name.replaceAll("[\\\\/:*?\"<>|]", "_");
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                v.put(MediaStore.Downloads.MIME_TYPE, (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime);
                v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) throw new Exception("insert 실패");
                try (OutputStream os = getContentResolver().openOutputStream(uri)) { os.write(bytes); }
                final String shown = safe;
                runOnUiThread(() -> toast("다운로드 폴더에 저장했습니다: " + shown));
                return true;
            } catch (Exception e) {
                runOnUiThread(() -> toast("저장하지 못했습니다: " + e.getMessage()));
                return false;
            }
        }
        /** 페이지를 처음부터 다시 엽니다 (인터넷 안내 화면의 [다시 시도]) */
        @JavascriptInterface
        public void reload() { runOnUiThread(() -> web.loadUrl(HOME_URL)); }
        /** 앱 판 번호 — 페이지가 "앱 안에서 열렸는지" 알아볼 때 */
        @JavascriptInterface
        public String version() { return BuildConfig.VERSION_NAME; }
    }

    /* ---------- 인터넷 안 될 때 ---------- */
    private void showOffline(String title) {
        String html = "<!doctype html><html lang=ko><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
            + "<style>body{font-family:sans-serif;margin:0;padding:48px 24px;color:#1b1f24;background:#f5f6f8}h1{font-size:22px;margin:0 0 10px}p{color:#6d7480;line-height:1.6}"
            + "button{font-size:16px;padding:12px 22px;border:0;border-radius:10px;background:#98CCE6;color:#16435A;font-weight:700;margin-top:18px}</style></head><body>"
            + "<h1>" + title + "</h1><p>핸드폰 인터넷(LTE·와이파이)이 켜져 있는지 보고 다시 시도해 주세요.<br>처음 한 번은 인터넷이 있어야 페이지를 받아 옵니다.</p>"
            + "<button onclick='IsadomApp.reload()'>다시 시도</button></body></html>";
        web.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
    }

    /* ---------- 잔손 ---------- */
    @Override
    public void onBackPressed() {
        String cur = web == null ? null : web.getUrl();
        if (web != null && web.canGoBack() && (cur == null || !cur.startsWith("data:"))) web.goBack();
        else super.onBackPressed();
    }
    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); if (web != null) web.saveState(out); }
    @Override
    protected void onDestroy() { if (web != null) web.destroy(); super.onDestroy(); }

    private void toast(String msg) { Toast.makeText(this, msg, Toast.LENGTH_SHORT).show(); }
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
    private static String q(String s) { return "'" + (s == null ? "" : s).replace("\\", "\\\\").replace("'", "\\'") + "'"; }
    private static String mimeOfExt(String ext) {
        switch (ext.toLowerCase()) {
            case "jpg": case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "pdf": return "application/pdf";
            case "json": return "application/json";
            case "txt": return "text/plain";
            default: return "*/*";
        }
    }
}
