# 🔍 Debugging Google Sign-In in Native App

## Current Issue
- Button works in browser (`npm start`) ✅
- Button does NOT work in native APK ❌
- Native Google account picker not opening ❌
- No redirect happening ❌

## What I've Added
1. **Extensive logging** - Every step now logs to console
2. **Better error handling** - Shows exactly where it fails
3. **Fallback mechanisms** - Native → Redirect → Error message

## How to Debug

### Step 1: Get Console Logs from Native App

**Method A: Using Chrome DevTools (Easiest)**
1. Connect phone to computer via USB
2. Enable USB debugging on phone
3. Open Chrome on computer
4. Go to: `chrome://inspect`
5. Find your app and click "inspect"
6. Click "Continue with Google" button
7. Check Console tab for logs

**Method B: Using ADB Logcat**
```bash
adb logcat | findstr "console\|Firebase\|Capacitor\|Google"
```

### Step 2: Look for These Logs When Clicking Button

```
========================================
🔄 BUTTON CLICKED - Starting Google Sign-In...
========================================
🔘 Button onClick triggered!
👆 Button touchStart (mobile)
📞 Calling signInWithGoogle() now...
🔍 Platform Detection: { isNativeApp: true, ... }
📱 Detected native platform - attempting native Google Sign-In...
✅ Capacitor Firebase Auth plugin loaded
🚀 Calling native Google Sign-In...
```

### Step 3: Identify Where It Fails

**If you see:**
- `🔘 Button onClick triggered!` → Button works ✅
- `📱 Detected native platform` → Platform detection works ✅
- `✅ Capacitor Firebase Auth plugin loaded` → Plugin loaded ✅
- `🚀 Calling native Google Sign-In...` → Function called ✅

**Then check for:**
- `❌ NATIVE GOOGLE SIGN-IN FAILED` → Native auth error
- `⚠️ Falling back to web redirect...` → Using redirect fallback
- `🚀 EXECUTING signInWithRedirect() NOW...` → Redirect attempt
- `✅ signInWithRedirect() completed` → Redirect succeeded

## Common Issues & Solutions

### Issue 1: No Logs Appear
**Problem:** Button click not registering
**Fix:** Check if button is actually clickable (might be covered by another element)

### Issue 2: Native Auth Error
**Problem:** `FirebaseAuthentication.signInWithGoogle()` throws error
**Possible causes:**
- google-services.json not properly processed during build
- SHA-1 fingerprint mismatch
- OAuth client not configured in Firebase Console
- Missing permissions

**Fix:**
1. Verify google-services.json is in `android/app/`
2. Rebuild: `./gradlew clean assembleDebug`
3. Check build logs for "google-services.json" message
4. Verify SHA-1 in Firebase Console matches debug keystore

### Issue 3: Redirect Not Working
**Problem:** `signInWithRedirect()` completes but page doesn't navigate
**Possible causes:**
- Capacitor WebView blocking redirects
- Origin not in Firebase Authorized Domains
- Storage/sessionStorage blocked

**Fix:**
1. Check `capacitor.config.ts` has `allowNavigation` configured ✅ (already done)
2. Add origin to Firebase Console Authorized Domains
3. Check if sessionStorage is available (code already checks this)

### Issue 4: Plugin Not Available
**Problem:** `FirebaseAuthentication` is null
**Possible causes:**
- Plugin not installed
- Plugin not synced to Android project

**Fix:**
```bash
npx cap sync android
cd android
./gradlew clean assembleDebug
```

## Next Steps

1. **Rebuild with new logging:**
   ```bash
   npm run build
   npx cap sync android
   cd android
   ./gradlew clean assembleDebug
   ```

2. **Install APK and test**

3. **Get console logs** using Chrome DevTools or ADB

4. **Share the logs** - especially:
   - Do you see button click?
   - Do you see platform detection?
   - Do you see native auth attempt?
   - What error messages appear?

The extensive logging I added will show exactly where the flow is breaking.

