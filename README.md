# WebToAPK - Website to Android APK Converter

Convert any website into a native Android APK with custom branding, splash screen, and Play Store ready configuration.

## Features

- 🌐 **Website to APK** - Convert any website to an Android app
- 🎨 **Custom Branding** - App name, background color, theme mode
- 📱 **Splash Screen** - Custom text and duration
- 🖼️ **App Icon** - Upload 512x512 px icon with auto-resizing
- 🔄 **Screen Orientation** - Auto, Portrait, or Landscape
- 🔧 **Permissions** - Camera, Location, Storage, Notifications, File Access
- 🔒 **Play Store Ready** - Proper signing, security config, best practices
- 📋 **Build History** - Download and manage previous builds
- 🔍 **Custom User Agent** - Set custom WebView user agent

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: SQLite
- **APK Engine**: Android SDK 34 + AAPT2 + D8 + APK Signer + JDK 21

## Deploy Options

### Railway.app (Recommended - Free tier available)

1. Fork this repo
2. Go to [Railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your forked repo
4. Railway will auto-detect the Dockerfile
5. Add environment variable: `DATABASE_URL=file:./db/custom.db`
6. Deploy!

### Render.com (Free tier available)

1. Fork this repo
2. Go to [Render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set Docker as environment
5. Add environment variable: `DATABASE_URL=file:./db/custom.db`
6. Deploy!

### Local Development

```bash
# Clone the repo
git clone https://github.com/merhedi4894/webtoapk.git
cd webtoapk

# Install dependencies
bun install

# Setup database
bun run db:push

# Start development server
bun run dev
```

## APK Build Process

1. User configures app settings via web UI
2. Server generates Android project files (Java + XML resources)
3. AAPT2 compiles and links resources
4. Java sources are compiled with JDK 21
5. D8 converts class files to DEX format
6. APK is packaged and aligned with Zipalign
7. APK is signed with apksigner
8. Signed APK is verified and made available for download

## Google Play Store Compliance

- ✅ Proper permission declarations
- ✅ Network Security Configuration
- ✅ APK signing with v2 scheme
- ✅ Zipalign optimization
- ✅ targetSdkVersion 34
- ✅ Cleartext traffic configuration
