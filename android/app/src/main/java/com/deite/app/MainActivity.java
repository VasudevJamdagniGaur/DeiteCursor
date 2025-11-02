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
        
        // CRITICAL: Configure WebView to keep OAuth redirects in-app
        // This prevents external browser from opening, which causes storage-partitioned errors
        // We do this in onResume to ensure WebView is fully initialized by Capacitor first
        
        Bridge bridge = getBridge();
        WebView webView = bridge != null ? bridge.getWebView() : null;
        
        if (webView != null) {
            // Get Capacitor's existing WebViewClient (important for bridge communication)
            WebViewClient existingClient = webView.getWebViewClient();
            
            // Only override for OAuth URLs - let Capacitor handle everything else
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url == null) {
                        if (existingClient != null) {
                            return existingClient.shouldOverrideUrlLoading(view, url);
                        }
                        return false;
                    }
                    
                    // Only intercept OAuth/Firebase URLs to keep them in WebView
                    boolean isOAuthUrl = url.contains("accounts.google.com") ||
                                        url.contains("oauth") ||
                                        url.contains("firebaseapp.com/__/auth") ||
                                        url.contains("googleapis.com");
                    
                    // For OAuth URLs, load in WebView (don't open external browser)
                    if (isOAuthUrl) {
                        view.loadUrl(url);
                        return true; // We handled it, don't open external browser
                    }
                    
                    // For all other URLs, let Capacitor handle it
                    if (existingClient != null) {
                        return existingClient.shouldOverrideUrlLoading(view, url);
                    }
                    
                    return false;
                }
                
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    if (request == null || request.getUrl() == null) {
                        if (existingClient != null) {
                            return existingClient.shouldOverrideUrlLoading(view, request);
                        }
                        return false;
                    }
                    
                    String url = request.getUrl().toString();
                    
                    // Same logic - only intercept OAuth URLs
                    boolean isOAuthUrl = url.contains("accounts.google.com") ||
                                      url.contains("oauth") ||
                                      url.contains("firebaseapp.com/__/auth") ||
                                      url.contains("googleapis.com");
                    
                    if (isOAuthUrl) {
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
