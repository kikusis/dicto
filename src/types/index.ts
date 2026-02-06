export interface RecordingChunk {
  id: string;
  recordingId: string;
  chunkIndex: number;
  uri: string;
  durationMs: number;
  createdAt: string;
  transcription?: string;
}

export interface Recording {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  durationMs: number;
  chunks: RecordingChunk[];
  status: RecordingStatus;
  transcription?: string;
  summary?: string;
  exportedTo?: ExportDestination[];
}

export type RecordingStatus =
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'transcribing'
  | 'summarizing'
  | 'completed'
  | 'error';

export type ExportDestination = 'google-drive' | 'onedrive' | 'obsidian';

export interface TranscriptionConfig {
  apiKey: string;
  apiUrl?: string;
  model?: string;
  language?: string;
}

export interface SummarizationConfig {
  apiKey: string;
  apiUrl?: string;
  model?: string;
  promptTemplate?: string;
}

export interface GoogleDriveConfig {
  accessToken: string;
  refreshToken: string;
  folderId?: string;
}

export interface OneDriveConfig {
  accessToken: string;
  refreshToken: string;
  folderId?: string;
}

export interface ObsidianConfig {
  vaultPath: string;
  folderName: string;
  templateFormat?: string;
}

export interface AppSettings {
  chunkDurationSeconds: number;
  transcription: TranscriptionConfig;
  summarization: SummarizationConfig;
  googleDrive?: GoogleDriveConfig;
  oneDrive?: OneDriveConfig;
  obsidian?: ObsidianConfig;
  autoTranscribe: boolean;
  autoSummarize: boolean;
  defaultExportDestinations: ExportDestination[];
}
