package com.deite.app;

import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onStart() {
        super.onStart();
        
        // CRITICAL FIX: Ensure OAuth redirects stay within WebView
        // This prevents external browser from opening, which causes storage-partitioned errors
        // Firebase OAuth requires sessionStorage to persist across redirects within the same WebView
        
        // Get Capacitor's Bridge and WebView
        Bridge bridge = getBridge();
        WebView webView = bridge != null ? bridge.getWebView() : null;
        
        if (webView != null) {
            // Get Capacitor's existing WebViewClient (important for bridge communication)
            WebViewClient existingClient = webView.getWebViewClient();
            
            // Create a wrapper that intercepts OAuth URLs but preserves Capacitor's functionality
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url == null) {
                        // Let Capacitor handle null URLs
                        if (existingClient != null) {
                            return existingClient.shouldOverrideUrlLoading(view, url);
                        }
                        return false;
                    }
                    
                    // Check if this is an OAuth/Firebase authentication URL
                    boolean isOAuthUrl = url.contains("accounts.google.com") ||
                                        url.contains("oauth") ||
                                        url.contains("firebaseapp.com/__/auth") ||
                                        url.contains("googleapis.com") ||
                                        url.contains("google.com/signin");
                    
                    // CRITICAL: Handle http://localhost redirects (Firebase OAuth redirect target)
                    // On mobile, there's NO localhost server, so we intercept and redirect to app immediately
                    // Firebase has already processed the OAuth by the time it redirects to localhost
                    boolean isLocalhostRedirect = url.startsWith("http://localhost") || 
                                                  url.startsWith("https://localhost");
                    
                    if (isLocalhostRedirect) {
                        // IMPORTANT: Firebase processes OAuth BEFORE redirecting to localhost
                        // By the time we reach here, user is already authenticated!
                        // Instead of loading localhost (which fails - no server), redirect to app immediately
                        String appUrl = "capacitor://localhost/dashboard";
                        view.loadUrl(appUrl);
                        return true; // We handled it, don't open external browser
                    }
                    
                    // Check if this is an app scheme (capacitor:// or deep link)
                    boolean isAppScheme = url.startsWith("capacitor://") || 
                                         url.startsWith("com.deite.app://");
                    
                    // For OAuth URLs and app schemes, load within WebView
                    // This prevents external browser from opening, which causes storage-partitioned errors
                    if (isOAuthUrl || isAppScheme) {
                        view.loadUrl(url);
                        return true; // We handled it, don't open external browser
                    }
                    
                    // For all other URLs, let Capacitor's WebViewClient handle it
                    // This preserves Capacitor's bridge communication and plugin functionality
                    if (existingClient != null) {
                        return existingClient.shouldOverrideUrlLoading(view, url);
                    }
                    
                    return false; // Default: let WebView handle it
                }
                
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    // API 24+ (Android 7.0+) version
                    if (request == null || request.getUrl() == null) {
                        if (existingClient != null) {
                            return existingClient.shouldOverrideUrlLoading(view, request);
                        }
                        return false;
                    }
                    
                    String url = request.getUrl().toString();
                    
                    // Same logic as above
                    boolean isOAuthUrl = url.contains("accounts.google.com") ||
                                      url.contains("oauth") ||
                                      url.contains("firebaseapp.com/__/auth") ||
                                      url.contains("googleapis.com") ||
                                      url.contains("google.com/signin");
                    
                    // CRITICAL: Handle http://localhost redirects (Firebase OAuth redirect target)
                    // On mobile, there's NO localhost server, so we intercept and redirect to app immediately
                    boolean isLocalhostRedirect = url.startsWith("http://localhost") || 
                                                 url.startsWith("https://localhost");
                    
                    if (isLocalhostRedirect) {
                        // IMPORTANT: Firebase processes OAuth BEFORE redirecting to localhost
                        // By the time we reach here, user is already authenticated!
                        // Instead of loading localhost (which fails - no server), redirect to app immediately
                        String appUrl = "capacitor://localhost/dashboard";
                        view.loadUrl(appUrl);
                        return true; // We handled it, don't open external browser
                    }
                    
                    boolean isAppScheme = url.startsWith("capacitor://") || 
                                        url.startsWith("com.deite.app://");
                    
                    // For OAuth URLs and app schemes, load within WebView
                    if (isOAuthUrl || isAppScheme) {
                        view.loadUrl(url);
                        return true; // We handled it, don't open external browser
                    }
                    
                    // Let Capacitor's WebViewClient handle other URLs
                    if (existingClient != null) {
                        return existingClient.shouldOverrideUrlLoading(view, request);
                    }
                    
                    return false; // Default: let WebView handle it
                }
            });
        }
    }
}

