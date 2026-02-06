import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { Recording, RecordingChunk, RecordingStatus, AppSettings, ExportDestination } from '../types';

const STORE_FILE = `${FileSystem.documentDirectory}dicto-store.json`;

interface RecordingState {
  recordings: Recording[];
  currentRecordingId: string | null;
  isRecording: boolean;
  isPaused: boolean;
  currentDurationMs: number;
  settings: AppSettings;

  // Actions
  addRecording: (recording: Recording) => void;
  updateRecording: (id: string, updates: Partial<Recording>) => void;
  deleteRecording: (id: string) => void;
  addChunkToRecording: (recordingId: string, chunk: RecordingChunk) => void;
  setCurrentRecording: (id: string | null) => void;
  setRecordingState: (isRecording: boolean, isPaused: boolean) => void;
  setCurrentDuration: (ms: number) => void;
  updateRecordingStatus: (id: string, status: RecordingStatus) => void;
  setTranscription: (id: string, transcription: string) => void;
  setSummary: (id: string, summary: string) => void;
  addExportDestination: (id: string, destination: ExportDestination) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  loadFromDisk: () => Promise<void>;
  saveToDisk: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  chunkDurationSeconds: 180,
  transcription: {
    apiKey: '',
    model: 'whisper-1',
    language: 'en',
  },
  summarization: {
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  autoTranscribe: true,
  autoSummarize: true,
  defaultExportDestinations: [],
};

export const useStore = create<RecordingState>((set, get) => ({
  recordings: [],
  currentRecordingId: null,
  isRecording: false,
  isPaused: false,
  currentDurationMs: 0,
  settings: DEFAULT_SETTINGS,

  addRecording: (recording) => {
    set((state) => ({ recordings: [recording, ...state.recordings] }));
    get().saveToDisk();
  },

  updateRecording: (id, updates) => {
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r,
      ),
    }));
    get().saveToDisk();
  },

  deleteRecording: (id) => {
    set((state) => ({
      recordings: state.recordings.filter((r) => r.id !== id),
    }));
    get().saveToDisk();
  },

  addChunkToRecording: (recordingId, chunk) => {
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === recordingId
          ? { ...r, chunks: [...r.chunks, chunk], updatedAt: new Date().toISOString() }
          : r,
      ),
    }));
    get().saveToDisk();
  },

  setCurrentRecording: (id) => set({ currentRecordingId: id }),

  setRecordingState: (isRecording, isPaused) => set({ isRecording, isPaused }),

  setCurrentDuration: (ms) => set({ currentDurationMs: ms }),

  updateRecordingStatus: (id, status) => {
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r,
      ),
    }));
    get().saveToDisk();
  },

  setTranscription: (id, transcription) => {
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === id ? { ...r, transcription, updatedAt: new Date().toISOString() } : r,
      ),
    }));
    get().saveToDisk();
  },

  setSummary: (id, summary) => {
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === id ? { ...r, summary, updatedAt: new Date().toISOString() } : r,
      ),
    }));
    get().saveToDisk();
  },

  addExportDestination: (id, destination) => {
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === id
          ? {
              ...r,
              exportedTo: [...(r.exportedTo || []), destination],
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
    get().saveToDisk();
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    get().saveToDisk();
  },

  loadFromDisk: async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(STORE_FILE);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(STORE_FILE);
        const data = JSON.parse(content);
        set({
          recordings: data.recordings || [],
          settings: { ...DEFAULT_SETTINGS, ...data.settings },
        });
      }
    } catch {
      // Start with defaults if load fails
    }
  },

  saveToDisk: async () => {
    try {
      const { recordings, settings } = get();
      await FileSystem.writeAsStringAsync(
        STORE_FILE,
        JSON.stringify({ recordings, settings }),
        { encoding: FileSystem.EncodingType.UTF8 },
      );
    } catch {
      // Silently fail disk writes
    }
  },
}));
