# Impostor Game (Mobile Layout)

This project is a React application configured with Vite, Tailwind CSS, and Capacitor to be built as an Android APK.

## Prerequisites

- Node.js installed.
- **Android Studio** installed (for building the APK).

## Setup & Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run in browser:
   ```bash
   npm run dev
   ```

## Build APK

To generate the APK, follow these steps:

1. **Build the web assets:**
   ```bash
   npm run build
   ```
   (This updates the `dist` folder)

2. **Sync with Android project:**
   ```bash
   npx cap sync
   ```

3. **Open Android Studio:**
   ```bash
   npx cap open android
   ```
   
4. **Generate APK in Android Studio:**
   - Wait for Gradle sync to finish.
   - Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Once finished, click "locate" in the notification to find your `.apk` file.

## Troubleshooting

- If you see synchronization errors, try running `Go to File > Sync Project with Gradle Files` in Android Studio.
