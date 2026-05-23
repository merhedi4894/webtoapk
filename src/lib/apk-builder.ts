import { execSync } from 'child_process'
import { writeFile, mkdir, readFile, copyFile, unlink, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'

const ANDROID_HOME = '/home/z/my-project/android-sdk'
const BUILD_TOOLS = `${ANDROID_HOME}/build-tools/34.0.0`
const PLATFORM = `${ANDROID_HOME}/platforms/android-34`
const AAPT2 = `${BUILD_TOOLS}/aapt2`
const D8 = `${BUILD_TOOLS}/d8`
const APKSIGNER = `${BUILD_TOOLS}/apksigner`
const ZIPALIGN = `${BUILD_TOOLS}/zipalign`
const JAVAC = '/home/z/my-project/jdk/jdk-21.0.2/bin/javac'
const KEYTOOL = '/home/z/my-project/jdk/jdk-21.0.2/bin/keytool'
const JARSIGNER = '/home/z/my-project/jdk/jdk-21.0.2/bin/jarsigner'

interface BuildConfig {
  id: string
  appName: string
  packageName: string
  websiteUrl: string
  backgroundColor: string
  splashText: string
  splashDuration: number
  iconPath: string | null
  orientation: string
  themeMode: string
  enableNavbar: boolean
  enablePullRefresh: boolean
  enableFileAccess: boolean
  enableCamera: boolean
  enableLocation: boolean
  enableStorage: boolean
  enableNotifications: boolean
  customUserAgent: string
}

function exec(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { 
      cwd, 
      encoding: 'utf-8', 
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } catch (error: any) {
    const output = error.stdout || error.stderr || error.message
    throw new Error(`Command failed: ${cmd}\n${output}`)
  }
}

function hexToAndroidColor(hex: string): { r: string; g: string; b: string } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 'FF', g: 'FF', b: 'FF' }
  return {
    r: result[1].toUpperCase(),
    g: result[2].toUpperCase(),
    b: result[3].toUpperCase(),
  }
}

function getOrientationActivity(orientation: string): string {
  switch (orientation) {
    case 'portrait': return 'android:screenOrientation="portrait"'
    case 'landscape': return 'android:screenOrientation="landscape"'
    default: return 'android:screenOrientation="unspecified"'
  }
}

function getPermissions(config: BuildConfig): string[] {
  const permissions: string[] = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
  ]
  if (config.enableFileAccess) {
    permissions.push('android.permission.READ_EXTERNAL_STORAGE')
    permissions.push('android.permission.WRITE_EXTERNAL_STORAGE')
  }
  if (config.enableCamera) {
    permissions.push('android.permission.CAMERA')
  }
  if (config.enableLocation) {
    permissions.push('android.permission.ACCESS_FINE_LOCATION')
    permissions.push('android.permission.ACCESS_COARSE_LOCATION')
  }
  if (config.enableStorage) {
    permissions.push('android.permission.READ_EXTERNAL_STORAGE')
    permissions.push('android.permission.WRITE_EXTERNAL_STORAGE')
    permissions.push('android.permission.MANAGE_EXTERNAL_STORAGE')
  }
  if (config.enableNotifications) {
    permissions.push('android.permission.POST_NOTIFICATIONS')
  }
  return [...new Set(permissions)]
}

export async function buildApk(config: BuildConfig): Promise<{ apkPath: string; buildLog: string }> {
  const buildLog: string[] = []
  const log = (msg: string) => buildLog.push(`[${new Date().toISOString()}] ${msg}`)

  const workDir = path.join(process.cwd(), 'build-workspace', config.id)
  const outputDir = path.join(process.cwd(), 'download', 'apks')
  
  try {
    log('Starting APK build process')
    log(`App: ${config.appName} (${config.packageName})`)
    log(`URL: ${config.websiteUrl}`)

    // Clean and create workspace
    if (existsSync(workDir)) {
      await rm(workDir, { recursive: true, force: true })
    }
    await mkdir(workDir, { recursive: true })
    await mkdir(outputDir, { recursive: true })

    const pkgPath = config.packageName.replace(/\./g, '/')
    const javaDir = path.join(workDir, 'java', pkgPath)
    const resDir = path.join(workDir, 'res')
    const genDir = path.join(workDir, 'gen')
    const objDir = path.join(workDir, 'obj')
    const apkDir = path.join(workDir, 'apk')

    await mkdir(javaDir, { recursive: true })
    await mkdir(path.join(resDir, 'values'), { recursive: true })
    await mkdir(path.join(resDir, 'drawable'), { recursive: true })
    await mkdir(path.join(resDir, 'mipmap-hdpi'), { recursive: true })
    await mkdir(path.join(resDir, 'mipmap-mdpi'), { recursive: true })
    await mkdir(path.join(resDir, 'mipmap-xhdpi'), { recursive: true })
    await mkdir(path.join(resDir, 'mipmap-xxhdpi'), { recursive: true })
    await mkdir(path.join(resDir, 'mipmap-xxxhdpi'), { recursive: true })
    await mkdir(path.join(resDir, 'layout'), { recursive: true })
    await mkdir(path.join(resDir, 'xml'), { recursive: true })
    await mkdir(genDir, { recursive: true })
    await mkdir(objDir, { recursive: true })
    await mkdir(apkDir, { recursive: true })

    log('Workspace created')

    // Generate AndroidManifest.xml
    const permissions = getPermissions(config)
    const permXml = permissions.map(p => `    <uses-permission android:name="${p}" />`).join('\n')
    const orientationAttr = getOrientationActivity(config.orientation)
    
    const networkSecurityAttr = config.enableFileAccess || config.enableStorage
      ? `\n    android:networkSecurityConfig="@xml/network_security_config"\n    android:usesCleartextTraffic="true"`
      : '\n    android:usesCleartextTraffic="true"'

    const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageName}"
    android:versionCode="1"
    android:versionName="1.0.0">

${permXml}

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"${networkSecurityAttr}
        android:hardwareAccelerated="true"
        android:largeHeap="true">

        <activity
            android:name=".MainActivity"
            ${orientationAttr}
            android:configChanges="orientation|screenSize|keyboard|keyboardHidden|layoutDirection|locale"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".SplashActivity"
            android:theme="@style/SplashTheme"
            ${orientationAttr}
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <meta-data
            android:name="android.webkit.WebView.MetricsOptOut"
            android:value="true" />
    </application>
</manifest>`

    await writeFile(path.join(workDir, 'AndroidManifest.xml'), manifest)
    log('AndroidManifest.xml generated')

    // Generate resources
    const androidColor = hexToAndroidColor(config.backgroundColor)
    
    const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${escapeXml(config.appName)}</string>
    <string name="splash_text">${escapeXml(config.splashText || config.appName)}</string>
    <string name="website_url">${escapeXml(config.websiteUrl)}</string>
    <string name="package_name">${escapeXml(config.packageName)}</string>
</resources>`

    const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splash_background">#FF${androidColor.r}${androidColor.g}${androidColor.b}</color>
    <color name="status_bar_color">#FF${androidColor.r}${androidColor.g}${androidColor.b}</color>
    <color name="navbar_color">#FFFFFF</color>
    <color name="white">#FFFFFF</color>
    <color name="black">#000000</color>
</resources>`

    const stylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.DeviceDefault.Light.NoActionBar">
        <item name="android:windowBackground">@color/splash_background</item>
        <item name="android:statusBarColor">@color/status_bar_color</item>
        <item name="android:navigationBarColor">@color/navbar_color</item>
        <item name="android:windowLightStatusBar">true</item>
    </style>
    <style name="SplashTheme" parent="@android:style/Theme.DeviceDefault.Light.NoActionBar">
        <item name="android:windowBackground">@color/splash_background</item>
        <item name="android:statusBarColor">@color/status_bar_color</item>
        <item name="android:navigationBarColor">@color/splash_background</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">false</item>
        <item name="android:windowContentOverlay">@null</item>
    </style>
</resources>`

    const splashLayout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:background="@color/splash_background">

    <ImageView
        android:id="@+id/splash_icon"
        android:layout_width="96dp"
        android:layout_height="96dp"
        android:src="@mipmap/ic_launcher"
        android:contentDescription="@string/app_name" />

    <TextView
        android:id="@+id/splash_text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@string/splash_text"
        android:textColor="@color/white"
        android:textSize="22sp"
        android:textStyle="bold"
        android:layout_marginTop="24dp"
        android:letterSpacing="0.02" />

</LinearLayout>`

    const mainLayout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1" />

</LinearLayout>`

    // Network security config for Play Store compatibility
    const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">${new URL(config.websiteUrl).hostname}</domain>
    </domain-config>
</network-security-config>`

    await writeFile(path.join(resDir, 'values', 'strings.xml'), stringsXml)
    await writeFile(path.join(resDir, 'values', 'colors.xml'), colorsXml)
    await writeFile(path.join(resDir, 'values', 'styles.xml'), stylesXml)
    await writeFile(path.join(resDir, 'layout', 'activity_splash.xml'), splashLayout)
    await writeFile(path.join(resDir, 'layout', 'activity_main.xml'), mainLayout)
    await writeFile(path.join(resDir, 'xml', 'network_security_config.xml'), networkSecurityConfig)
    log('Resources generated')

    // Generate app icons
    await generateIcons(config.iconPath, resDir, config)
    log('Icons generated')

    // Generate Java source files
    const userAgentCode = config.customUserAgent 
      ? `        webSettings.setUserAgentString("${escapeJava(config.customUserAgent)}");` 
      : ''

    const pullRefreshCode = config.enablePullRefresh 
      ? `        webView.setOnTouchListener(new OnSwipeTouchListener(this));` 
      : ''

    const mainActivity = `package ${config.packageName};

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private WebView webView;
    private static final String URL = "${escapeJava(config.websiteUrl)}";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.activity_main);

        webView = (WebView) findViewById(R.id.webview);
        configureWebView();

        String url = getIntent().getStringExtra("url");
        if (url == null || url.isEmpty()) {
            url = URL;
        }
        webView.loadUrl(url);
    }

    private void configureWebView() {
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(${config.enableFileAccess || config.enableStorage ? 'true' : 'false'});
        webSettings.setAllowContentAccess(${config.enableFileAccess || config.enableStorage ? 'true' : 'false'});
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setSupportZoom(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webSettings.setDatabaseEnabled(true);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setSupportMultipleWindows(true);
        ${userAgentCode}

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new AppWebViewClient(this));
        webView.setWebChromeClient(new WebChromeClient());

        ${pullRefreshCode}
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}`

    const webViewClientClass = `package ${config.packageName};

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class AppWebViewClient extends WebViewClient {

    private Activity activity;

    public AppWebViewClient(Activity activity) {
        this.activity = activity;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        if (url.startsWith("http://") || url.startsWith("https://")) {
            view.loadUrl(url);
            return false;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            activity.startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        CookieManager.getInstance().flush();
    }
}`

    const splashActivity = `package ${config.packageName};

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Window;

public class SplashActivity extends Activity {

    private static final int SPLASH_DURATION = ${config.splashDuration};

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.activity_splash);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Intent intent = new Intent(SplashActivity.this, MainActivity.class);
            startActivity(intent);
            finish();
        }, SPLASH_DURATION);
    }

    @Override
    public void onBackPressed() {
        // Disable back on splash
    }
}`

    const swipeTouchListener = config.enablePullRefresh ? `
package ${config.packageName};

import android.content.Context;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;

public abstract class OnSwipeTouchListener implements View.OnTouchListener {

    private final GestureDetector gestureDetector;

    public OnSwipeTouchListener(Context context) {
        gestureDetector = new GestureDetector(context, new GestureListener());
    }

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        return gestureDetector.onTouchEvent(event);
    }

    public void onSwipeDown() {}
    public void onSwipeUp() {}

    private final class GestureListener extends GestureDetector.SimpleOnGestureListener {

        private static final int SWIPE_THRESHOLD = 100;
        private static final int SWIPE_VELOCITY_THRESHOLD = 100;

        @Override
        public boolean onDown(MotionEvent e) {
            return true;
        }

        @Override
        public boolean onFling(MotionEvent e1, MotionEvent e2, float velocityX, float velocityY) {
            if (e1 == null || e2 == null) return false;
            float diffY = e2.getY() - e1.getY();
            if (Math.abs(diffY) > SWIPE_THRESHOLD && Math.abs(velocityY) > SWIPE_VELOCITY_THRESHOLD) {
                if (diffY > 0) {
                    onSwipeDown();
                } else {
                    onSwipeUp();
                }
                return true;
            }
            return false;
        }
    }
}` : ''

    await writeFile(path.join(javaDir, 'MainActivity.java'), mainActivity)
    await writeFile(path.join(javaDir, 'SplashActivity.java'), splashActivity)
    await writeFile(path.join(javaDir, 'AppWebViewClient.java'), webViewClientClass)
    if (config.enablePullRefresh) {
      await writeFile(path.join(javaDir, 'OnSwipeTouchListener.java'), swipeTouchListener)
    }
    log('Java source files generated')

    // Step 1: Compile resources with AAPT2
    log('Compiling resources with AAPT2...')
    exec(`${AAPT2} compile --dir ${resDir} -o ${workDir}/compiled_resources.zip`)
    log('Resources compiled')

    // Step 2: Link resources
    log('Linking resources...')
    exec(`${AAPT2} link -o ${workDir}/base.apk_unaligned \
      -I ${PLATFORM}/android.jar \
      --manifest ${workDir}/AndroidManifest.xml \
      -R ${workDir}/compiled_resources.zip \
      --java ${genDir} \
      --auto-add-overlay`)
    log('Resources linked')

    // Step 3: Compile Java sources
    log('Compiling Java sources...')
    const javaFiles = [
      path.join(javaDir, 'MainActivity.java'),
      path.join(javaDir, 'SplashActivity.java'),
      path.join(javaDir, 'AppWebViewClient.java'),
      ...(config.enablePullRefresh ? [path.join(javaDir, 'OnSwipeTouchListener.java')] : []),
    ]
    
    // Find generated R.java
    const rJavaDir = path.join(genDir, pkgPath)
    const rJavaFile = path.join(rJavaDir, 'R.java')
    if (existsSync(rJavaFile)) {
      javaFiles.push(rJavaFile)
    }

    const classpath = `${PLATFORM}/android.jar`
    exec(`${JAVAC} -source 1.8 -target 1.8 -classpath ${classpath} -d ${objDir} ${javaFiles.join(' ')}`)
    log('Java sources compiled')

    // Step 4: Convert to DEX
    log('Converting to DEX format...')
    // Use d8 with the obj directory - it handles class files properly
    exec(`cd ${objDir} && ${D8} --min-api 21 --output ${workDir} --lib ${PLATFORM}/android.jar $(find . -name '*.class')`)
    log('DEX conversion completed')

    // Step 5: Package APK
    log('Packaging APK...')
    // Add DEX files to the base APK using zip (APK is essentially a ZIP)
    const dexFiles = findDexFiles(workDir)
    if (dexFiles.length === 0) {
      throw new Error('No DEX files generated')
    }

    // Add DEX files to the APK using zip command
    for (const dexFile of dexFiles) {
      const dexName = path.basename(dexFile)
      exec(`cd ${workDir} && zip -j base.apk_unaligned ${dexFile}`)
    }
    log('APK packaged')

    // Step 6: Zipalign
    log('Aligning APK...')
    const alignedApk = path.join(workDir, 'base.apk_aligned')
    exec(`${ZIPALIGN} -f 4 ${workDir}/base.apk_unaligned ${alignedApk}`)
    log('APK aligned')

    // Step 7: Generate keystore and sign
    log('Signing APK...')
    const keystorePath = path.join(workDir, 'release.keystore')
    const keystorePwd = 'webtoapk2024'
    const keyAlias = 'webtoapk'
    const keyPwd = 'webtoapk2024'

    if (!existsSync(keystorePath)) {
      exec(`${KEYTOOL} -genkeypair -v -keystore ${keystorePath} -alias ${keyAlias} -keyalg RSA -keysize 2048 -validity 10000 -storepass ${keystorePwd} -keypass ${keyPwd} -dname "CN=WebToAPK, OU=Development, O=WebToAPK, L=Dhaka, ST=Dhaka, C=BD"`)
    }

    const signedApk = path.join(workDir, 'base.apk_signed')
    exec(`${APKSIGNER} sign --ks ${keystorePath} --ks-key-alias ${keyAlias} --ks-pass pass:${keystorePwd} --key-pass pass:${keyPwd} --out ${signedApk} ${alignedApk}`)
    log('APK signed')

    // Step 8: Verify
    log('Verifying APK...')
    const verifyResult = exec(`${APKSIGNER} verify --verbose ${signedApk}`)
    log(`Verification: ${verifyResult.includes('Verifies') ? 'PASSED' : 'CHECK NEEDED'}`)

    // Step 9: Copy to output
    const finalApkPath = path.join(outputDir, `${config.packageName.replace(/\./g, '_')}_${Date.now()}.apk`)
    await copyFile(signedApk, finalApkPath)
    log(`APK saved to: ${finalApkPath}`)

    // Cleanup workspace
    try {
      await rm(workDir, { recursive: true, force: true })
    } catch {}

    return {
      apkPath: finalApkPath,
      buildLog: buildLog.join('\n'),
    }
  } catch (error: any) {
    log(`BUILD FAILED: ${error.message}`)
    // Cleanup on failure
    try {
      await rm(workDir, { recursive: true, force: true })
    } catch {}
    throw new Error(buildLog.join('\n') + '\n\n' + error.message)
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeJava(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

function findClassFiles(dir: string): string[] {
  const result: string[] = []
  try {
    const entries = exec(`find ${dir} -name "*.class"`).trim().split('\n').filter(Boolean)
    result.push(...entries)
  } catch {}
  return result
}

function findDexFiles(dir: string): string[] {
  const result: string[] = []
  try {
    const entries = exec(`find ${dir} -maxdepth 1 -name "*.dex"`).trim().split('\n').filter(Boolean)
    result.push(...entries)
  } catch {}
  return result
}

async function generateIcons(iconPath: string | null, resDir: string, config: BuildConfig): Promise<void> {
  const sizes = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ]

  if (iconPath && existsSync(iconPath)) {
    // Use the uploaded icon, resize for each density
    for (const { dir, size } of sizes) {
      const outPath = path.join(resDir, dir, 'ic_launcher.png')
      await sharp(iconPath)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(outPath)
      // Round icon
      const roundPath = path.join(resDir, dir, 'ic_launcher_round.png')
      await sharp(iconPath)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(roundPath)
    }
  } else {
    // Generate a default icon with the app initials and background color
    const initial = (config.appName || 'A')[0].toUpperCase()
    for (const { dir, size } of sizes) {
      const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <rect width="${size}" height="${size}" fill="${config.backgroundColor}" rx="${Math.round(size * 0.2)}"/>
        <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="${Math.round(size * 0.5)}" font-weight="bold" fill="white">
          ${initial}
        </text>
      </svg>`

      const outPath = path.join(resDir, dir, 'ic_launcher.png')
      await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toFile(outPath)
      
      const roundPath = path.join(resDir, dir, 'ic_launcher_round.png')
      await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toFile(roundPath)
    }
  }
}
