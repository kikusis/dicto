import * as FileSystem from 'expo-file-system';
import { RecordingChunk, TranscriptionConfig } from '../types';

const DEFAULT_WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

export async function transcribeChunk(
  chunk: RecordingChunk,
  config: TranscriptionConfig,
): Promise<string> {
  const apiUrl = config.apiUrl || DEFAULT_WHISPER_URL;

  const fileInfo = await FileSystem.getInfoAsync(chunk.uri);
  if (!fileInfo.exists) {
    throw new Error(`Audio file not found: ${chunk.uri}`);
  }

  const uploadResult = await FileSystem.uploadAsync(apiUrl, chunk.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters: {
      model: config.model || 'whisper-1',
      response_format: 'text',
      language: config.language || 'en',
    },
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  if (uploadResult.status !== 200) {
    throw new Error(`Transcription failed (${uploadResult.status}): ${uploadResult.body}`);
  }

  return uploadResult.body.trim();
}

export async function transcribeAllChunks(
  chunks: RecordingChunk[],
  config: TranscriptionConfig,
  onProgress?: (completed: number, total: number) => void,
): Promise<string> {
  const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const transcriptions: string[] = [];

  for (let i = 0; i < sortedChunks.length; i++) {
    const text = await transcribeChunk(sortedChunks[i], config);
    transcriptions.push(text);
    onProgress?.(i + 1, sortedChunks.length);
  }

  return transcriptions.join('\n\n');
}
