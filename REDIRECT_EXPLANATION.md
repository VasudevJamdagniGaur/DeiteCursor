# Why You're Seeing "localhost" in Mobile APK

## Explanation

You're right to be confused! Here's what's happening:

### The Problem:
Firebase's `signInWithRedirect()` redirects back to `window.location.origin`. In a Capacitor app:
- **App origin:** `capacitor://localhost` (this is your app!)
- **Firebase redirect:** Can only use `http://` or `https://` URLs
- **Result:** Firebase converts `capacitor://localhost` to `http://localhost` (which doesn't work!)

### Why Firebase Can't Use `capacitor://localhost`:
Firebase's OAuth redirect handler **only accepts http/https URLs** for security. It cannot redirect to custom schemes like `capacitor://localhost`.

### The Solution:
The code is already correct - it uses `signInWithRedirect()` which redirects within the WebView. The redirect should go back to the app automatically because:
1. Sign-in happens in WebView (not external browser)
2. After sign-in, Firebase redirects to `capacitor://localhost`
3. WebView recognizes this as its own origin
4. Redirect completes successfully

### If You're Still Stuck on localhost:
This means Firebase is NOT recognizing `capacitor://localhost` as a valid redirect. This happens when:
- `capacitor://localhost` is NOT in Firebase Authorized Domains
- Firebase defaults to `http://localhost` instead

### The Fix:
Add `capacitor://localhost` to Firebase Authorized Domains. Then Firebase will know it's allowed to redirect there.

