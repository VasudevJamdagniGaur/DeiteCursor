plugins {
    id("com.android.application")
}

android {
    namespace = "jamdagni.deite.app"
    compileSdk = rootProject.ext["compileSdkVersion"] as Int
    
    buildFeatures {
        buildConfig = true
    }
    
    defaultConfig {
        applicationId = "jamdagni.deite.app"
        minSdk = rootProject.ext["minSdkVersion"] as Int
        targetSdk = rootProject.ext["targetSdkVersion"] as Int
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        
        aaptOptions {
            // Files and dirs to omit from the packaged assets dir, modified to accommodate modern web apps.
            // Default: https://android.googlesource.com/platform/frameworks/base/+/282e181b58cf72b6ca770dc7ca5f91f135444502/tools/aapt/AaptAssets.cpp#61
            ignoreAssetsPattern = "!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~"
        }
    }
    
    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
        }
    }
}

repositories {
    flatDir {
        dirs("../capacitor-cordova-android-plugins/src/main/libs", "libs")
    }
}

dependencies {
    implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar"))))
    implementation("androidx.appcompat:appcompat:${rootProject.ext["androidxAppCompatVersion"]}")
    implementation("androidx.coordinatorlayout:coordinatorlayout:${rootProject.ext["androidxCoordinatorLayoutVersion"]}")
    implementation("androidx.core:core-splashscreen:${rootProject.ext["coreSplashScreenVersion"]}")
    implementation(project(":capacitor-android"))
    testImplementation("junit:junit:${rootProject.ext["junitVersion"]}")
    androidTestImplementation("androidx.test.ext:junit:${rootProject.ext["androidxJunitVersion"]}")
    androidTestImplementation("androidx.test.espresso:espresso-core:${rootProject.ext["androidxEspressoCoreVersion"]}")
    implementation(project(":capacitor-cordova-android-plugins"))
    
    // Import the Firebase BoM
    implementation(platform("com.google.firebase:firebase-bom:34.5.0"))
    
    // Firebase Authentication (required for Google Sign-In)
    implementation("com.google.firebase:firebase-auth")
    
    // Firebase Analytics (optional but recommended)
    implementation("com.google.firebase:firebase-analytics")
}

apply(from = "capacitor.build.gradle")

// Apply Google Services plugin AFTER all dependencies (Firebase best practice)
// This ensures google-services.json is processed after Firebase dependencies are resolved
apply(plugin = "com.google.gms.google-services")
