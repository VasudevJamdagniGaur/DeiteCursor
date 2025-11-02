package com.deite.app;

import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onResume() {
        super.onResume();
        
        // CRITICAL: Configure WebView to intercept localhost redirects
        // Firebase redirects to http://localhost after OAuth, but there's no server on mobile
        // We intercept this and redirect back to the app immediately
        
        Bridge bridge = getBridge();
        WebView webView = bridge != null ? bridge.getWebView() : null;
        
        if (webView != null) {
            // Get Capacitor's existing WebViewClient (important for bridge communication)
            WebViewClient existingClient = webView.getWebViewClient();
            
            // Create wrapper to intercept localhost redirects
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url == null) {
                        if (existingClient != null) {
                            return existingClient.shouldOverrideUrlLoading(view, url);
                        }
                        return false;
                    }
                    
                    // CRITICAL: Intercept localhost redirects (Firebase OAuth fallback)
                    // Redirect immediately to app's dashboard
                    boolean isLocalhost = url.startsWith("http://localhost") || 
                                         url.startsWith("https://localhost");
                    
                    if (isLocalhost) {
                        // Firebase has processed OAuth by now, redirect to app dashboard
                        String appUrl = "capacitor://localhost/dashboard";
                        view.loadUrl(appUrl);
                        return true; // We handled it
                    }
                    
                    // For OAuth URLs, keep in WebView (don't open external browser)
                    boolean isOAuthUrl = url.contains("accounts.google.com") ||
                                        url.contains("oauth") ||
                                        url.contains("firebaseapp.com/__/auth") ||
                                        url.contains("googleapis.com");
                    
                    if (isOAuthUrl) {
                        view.loadUrl(url);
                        return true; // We handled it, don't open external browser
                    }
                    
                    // Check if this is an app scheme
                    boolean isAppScheme = url.startsWith("capacitor://") || 
                                         url.startsWith("com.deite.app://");
                    
                    if (isAppScheme) {
                        view.loadUrl(url);
                        return true;
                    }
                    
                    // For all other URLs, let Capacitor handle it
                    if (existingClient != null) {
                        return existingClient.shouldOverrideUrlLoading(view, url);
                    }
                    
                    return false;
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
                    
                    // Same logic - intercept localhost redirects
                    boolean isLocalhost = url.startsWith("http://localhost") || 
                                         url.startsWith("https://localhost");
                    
                    if (isLocalhost) {
                        // Firebase has processed OAuth, redirect to app dashboard
                        String appUrl = "capacitor://localhost/dashboard";
                        view.loadUrl(appUrl);
                        return true; // We handled it
                    }
                    
                    // For OAuth URLs, keep in WebView
                    boolean isOAuthUrl = url.contains("accounts.google.com") ||
                                      url.contains("oauth") ||
                                      url.contains("firebaseapp.com/__/auth") ||
                                      url.contains("googleapis.com");
                    
                    boolean isAppScheme = url.startsWith("capacitor://") || 
                                        url.startsWith("com.deite.app://");
                    
                    if (isOAuthUrl || isAppScheme) {
                        view.loadUrl(url);
                        return true; // We handled it, don't open external browser
                    }
                    
                    // Let Capacitor handle other URLs
                    if (existingClient != null) {
                        return existingClient.shouldOverrideUrlLoading(view, request);
                    }
                    
                    return false;
                }
            });
        }
    }
}
