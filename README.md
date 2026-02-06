# Dicto - Meeting Recorder

A cross-platform (iOS/Android) meeting recording app that records, transcribes, summarizes, and exports meeting notes.

## Features

- **Meeting Recording** - Record meetings with a clean, intuitive interface
- **3-Minute Chunked Recording** - Audio is automatically split into 3-minute segments for security. Each chunk is stored separately and can be individually managed/deleted
- **Transcription** - Converts speech to text using OpenAI Whisper API
- **AI Summarization** - Generates structured meeting summaries with key points, action items, and decisions using GPT
- **Cloud Export** - Save summaries and transcripts to:
  - Google Drive (as Markdown files)
  - Microsoft OneDrive (as Markdown files)
  - Obsidian Vault (via share sheet, with YAML frontmatter)

## Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Language**: TypeScript
- **State Management**: Zustand
- **Audio**: expo-av
- **Transcription**: OpenAI Whisper API
- **Summarization**: OpenAI GPT API
- **Storage**: expo-file-system (local), Google Drive API, Microsoft Graph API

## Project Structure

```
src/
├── screens/                  # UI Screens
│   ├── HomeScreen.tsx        # Main screen with recording list
│   ├── RecordingScreen.tsx   # Active recording interface
│   ├── RecordingDetailScreen.tsx  # View transcript/summary, export
│   └── SettingsScreen.tsx    # API keys, cloud accounts, preferences
├── services/                 # Business Logic
│   ├── recording.ts          # ChunkedRecorder (3-min audio segments)
│   ├── transcription.ts      # Whisper API integration
│   ├── summarization.ts      # GPT summarization
│   ├── formatter.ts          # Markdown formatting utilities
│   └── storage/
│       ├── google-drive.ts   # Google Drive upload
│       ├── onedrive.ts       # OneDrive upload
│       └── obsidian.ts       # Obsidian export with frontmatter
├── store/
│   └── index.ts              # Zustand store with persistence
├── types/
│   └── index.ts              # TypeScript type definitions
└── utils/
    └── constants.ts          # App constants, colors, recording config
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Add your OpenAI API key in `.env` or in the app Settings screen

4. Start the development server:
   ```bash
   npx expo start
   ```

5. Open on your device using:
   - Expo Go app (scan QR code)
   - iOS Simulator: press `i`
   - Android Emulator: press `a`

## Configuration

### API Keys
Enter your OpenAI API key in the Settings screen. The same key is used for both Whisper (transcription) and GPT (summarization).

### Cloud Storage
- **Google Drive / OneDrive**: Requires OAuth setup. Add your OAuth client credentials in `app.json` and build with EAS Build for production OAuth flows.
- **Obsidian**: Uses the native share sheet. When exporting, select "Open in Obsidian" to add notes directly to your vault. Notes include YAML frontmatter compatible with Obsidian's metadata system.

### Security Model
Audio recordings are split into 3-minute chunks. This means:
- No single file contains the entire meeting
- Individual chunks can be deleted independently
- Processing can happen incrementally per-chunk
- If interrupted, only the current chunk is at risk

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```
