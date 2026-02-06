export const CHUNK_DURATION_MS = 3 * 60 * 1000; // 3 minutes in milliseconds
export const CHUNK_DURATION_SECONDS = 180;

export const RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: 4, // MPEG_4
    audioEncoder: 3, // AAC
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: 'aac' as const,
    audioQuality: 127, // MAX
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

export const COLORS = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  secondary: '#FF6584',
  background: '#1a1a2e',
  surface: '#16213e',
  surfaceLight: '#0f3460',
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B80',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  recording: '#FF4444',
  border: '#2A2A4A',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};
