# 🎬 Jellyboxd

<div align="center">
  <img src="assets/images/icon.png" width="128" height="128" alt="Jellyboxd Logo" />
  <h3>A sleek, Letterboxd-inspired Jellyfin client for iOS</h3>
</div>

---

## ✨ Features

- 🖤 **Letterboxd Aesthetic**: Deep dark theme (`#14181c`) with signature accent (`#00e054`), poster-first grid browsing, and clean typography.
- 🔐 **Jellyfin Authentication**: Connect seamlessly to any Jellyfin server with secure token storage.
- 🍿 **Continue Watching**: Pick up right where you left off with accurate resume positions and visual progress indicators.
- 📚 **Library Exploration**: Browse Movies, Series, and Collections with community ratings and release metadata.
- 🎬 **Modern Video Player**: Fast native video playback powered by `expo-video` with automatic Jellyfin playback progress syncing (`/Sessions/Playing`, `/Progress`, `/Stopped`).
- 🍏 **One-Click iOS Build**: GitHub Actions workflow automatically produces an unsigned `.ipa` ready for sideloading (AltStore, Sideloadly, TrollStore).

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Bun](https://bun.sh/) (recommended) or npm
- [Expo CLI](https://docs.expo.dev/)

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:matthewhalf/jellyboxd.git
   cd jellyboxd
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun run start
   ```

---

## 🍏 Building the iOS IPA

A GitHub Actions workflow is included in [`.github/workflows/build-ios.yml`](.github/workflows/build-ios.yml).

- Every push to `main` builds an unsigned `.ipa`.
- The `.ipa` can be downloaded directly from the **Actions** tab artifacts.
- Install the `.ipa` using:
  - **AltStore** / **SideStore**
  - **Sideloadly**
  - **TrollStore** (if on supported iOS version)

---

## 🛠️ Tech Stack

- **Framework**: [Expo SDK 52+](https://expo.dev) + [React Native 0.86](https://reactnative.dev)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **SDK**: [`@jellyfin/sdk`](https://github.com/jellyfin/jellyfin-sdk-typescript)
- **Video Engine**: [`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/)
- **Icons**: `@expo/vector-icons` (Ionicons)
- **Storage**: `@react-native-async-storage/async-storage` & `expo-secure-store`

---

## 📄 License

MIT License.
