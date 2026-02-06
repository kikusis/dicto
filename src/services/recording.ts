import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { RecordingChunk } from '../types';
import { CHUNK_DURATION_MS, RECORDING_OPTIONS } from '../utils/constants';

const RECORDINGS_DIR = `${FileSystem.documentDirectory}recordings/`;

async function ensureRecordingsDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
}

export class ChunkedRecorder {
  private currentRecording: Audio.Recording | null = null;
  private recordingId: string;
  private chunks: RecordingChunk[] = [];
  private chunkIndex = 0;
  private chunkTimer: ReturnType<typeof setTimeout> | null = null;
  private isRecording = false;
  private isPaused = false;
  private onChunkComplete?: (chunk: RecordingChunk) => void;
  private onStatusUpdate?: (status: { isRecording: boolean; durationMs: number }) => void;
  private startTime = 0;
  private totalDurationMs = 0;

  constructor(
    recordingId?: string,
    onChunkComplete?: (chunk: RecordingChunk) => void,
    onStatusUpdate?: (status: { isRecording: boolean; durationMs: number }) => void,
  ) {
    this.recordingId = recordingId || uuidv4();
    this.onChunkComplete = onChunkComplete;
    this.onStatusUpdate = onStatusUpdate;
  }

  async start(): Promise<string> {
    await ensureRecordingsDir();

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Microphone permission not granted');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();
    await this.startNewChunk();

    return this.recordingId;
  }

  private async startNewChunk(): Promise<void> {
    if (!this.isRecording || this.isPaused) return;

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(RECORDING_OPTIONS);
    await recording.startAsync();

    this.currentRecording = recording;

    // Set timer for chunk duration (3 minutes)
    this.chunkTimer = setTimeout(async () => {
      if (this.isRecording && !this.isPaused) {
        await this.finalizeCurrentChunk();
        await this.startNewChunk();
      }
    }, CHUNK_DURATION_MS);

    // Update status periodically
    recording.setOnRecordingStatusUpdate((status) => {
      if (status.isRecording && this.onStatusUpdate) {
        this.onStatusUpdate({
          isRecording: true,
          durationMs: this.totalDurationMs + (status.durationMillis || 0),
        });
      }
    });
  }

  private async finalizeCurrentChunk(): Promise<RecordingChunk | null> {
    if (!this.currentRecording) return null;

    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }

    const status = await this.currentRecording.getStatusAsync();
    await this.currentRecording.stopAndUnloadAsync();

    const sourceUri = this.currentRecording.getURI();
    if (!sourceUri) return null;

    const chunkId = uuidv4();
    const destUri = `${RECORDINGS_DIR}${this.recordingId}_chunk_${this.chunkIndex}.m4a`;

    await FileSystem.moveAsync({ from: sourceUri, to: destUri });

    const chunk: RecordingChunk = {
      id: chunkId,
      recordingId: this.recordingId,
      chunkIndex: this.chunkIndex,
      uri: destUri,
      durationMs: status.durationMillis || 0,
      createdAt: new Date().toISOString(),
    };

    this.totalDurationMs += chunk.durationMs;
    this.chunks.push(chunk);
    this.chunkIndex++;
    this.currentRecording = null;

    if (this.onChunkComplete) {
      this.onChunkComplete(chunk);
    }

    return chunk;
  }

  async pause(): Promise<void> {
    if (!this.isRecording || this.isPaused) return;
    this.isPaused = true;

    if (this.currentRecording) {
      await this.currentRecording.pauseAsync();
    }
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
  }

  async resume(): Promise<void> {
    if (!this.isRecording || !this.isPaused) return;
    this.isPaused = false;

    if (this.currentRecording) {
      await this.currentRecording.startAsync();
      // Restart chunk timer with remaining time
      this.chunkTimer = setTimeout(async () => {
        if (this.isRecording && !this.isPaused) {
          await this.finalizeCurrentChunk();
          await this.startNewChunk();
        }
      }, CHUNK_DURATION_MS);
    }
  }

  async stop(): Promise<RecordingChunk[]> {
    this.isRecording = false;
    this.isPaused = false;

    await this.finalizeCurrentChunk();

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    return this.chunks;
  }

  getChunks(): RecordingChunk[] {
    return [...this.chunks];
  }

  getRecordingId(): string {
    return this.recordingId;
  }

  getTotalDuration(): number {
    return this.totalDurationMs;
  }
}

export async function deleteRecordingFiles(recordingId: string): Promise<void> {
  await ensureRecordingsDir();
  const files = await FileSystem.readDirectoryAsync(RECORDINGS_DIR);
  const recordingFiles = files.filter((f) => f.startsWith(recordingId));
  await Promise.all(
    recordingFiles.map((f) => FileSystem.deleteAsync(`${RECORDINGS_DIR}${f}`, { idempotent: true })),
  );
}
