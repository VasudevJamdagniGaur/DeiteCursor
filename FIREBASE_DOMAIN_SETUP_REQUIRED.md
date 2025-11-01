# ⚠️ CRITICAL: Add Domain to Firebase Console

## The Error You're Seeing

**"The requested action is invalid"** means Firebase is rejecting the redirect because `capacitor://localhost` is NOT in Firebase Authorized Domains.

## REQUIRED FIX (Do This Now!)

### Step 1: Go to Firebase Console
1. Open: **https://console.firebase.google.com/**
2. Select project: **deitedatabase**
3. Go to: **Authentication → Settings → Authorized domains**

### Step 2: Add Domain
1. Click **"Add domain"** button
2. Enter: **`capacitor://localhost`**
3. Click **"Add"**
4. **SAVE** the changes

### Step 3: Verify
Your authorized domains should include:
- ✅ `localhost` (auto-added)
- ✅ `deitedatabase.firebaseapp.com` (auto-added)  
- ✅ **`capacitor://localhost`** (YOU JUST ADDED - THIS IS CRITICAL!)

### Step 4: Rebuild APK
After adding the domain:
```bash
cd android
./gradlew clean assembleDebug
```

## Why This Is Required

Firebase's `signInWithRedirect()` redirects back to your app's origin (`capacitor://localhost`). Firebase MUST have this domain in its authorized list, otherwise it rejects the redirect with "invalid action" error.

## Code Is Now Correct

✅ The code now uses Firebase's proper `signInWithRedirect()` method  
✅ No more manual URL construction  
✅ Firebase handles everything correctly  

**YOU JUST NEED TO ADD THE DOMAIN TO FIREBASE!**

## After Adding Domain

1. Add `capacitor://localhost` to Firebase
2. Wait 1-2 minutes for changes to propagate
3. Rebuild APK
4. Install and test

The error will be gone!

