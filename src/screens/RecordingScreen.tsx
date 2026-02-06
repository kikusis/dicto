import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store';
import { ChunkedRecorder } from '../services/recording';
import { transcribeAllChunks } from '../services/transcription';
import { summarizeTranscript } from '../services/summarization';
import { COLORS, CHUNK_DURATION_SECONDS } from '../utils/constants';
import { formatDuration } from '../services/formatter';
import { RecordingChunk } from '../types';

interface RecordingScreenProps {
  onFinish: (recordingId: string) => void;
  onCancel: () => void;
}

export default function RecordingScreen({ onFinish, onCancel }: RecordingScreenProps) {
  const [title, setTitle] = useState(() => {
    const now = new Date();
    return `Meeting ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });
  const [durationMs, setDurationMs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);

  const recorderRef = useRef<ChunkedRecorder | null>(null);
  const store = useStore();

  const handleChunkComplete = useCallback(
    (chunk: RecordingChunk) => {
      setChunkCount((c) => c + 1);
      if (currentRecordingId) {
        store.addChunkToRecording(currentRecordingId, chunk);
      }
    },
    [currentRecordingId, store],
  );

  const handleStatusUpdate = useCallback(
    (status: { isRecording: boolean; durationMs: number }) => {
      setDurationMs(status.durationMs);
    },
    [],
  );

  const startRecording = async () => {
    try {
      const id = uuidv4();
      setCurrentRecordingId(id);

      store.addRecording({
        id,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        durationMs: 0,
        chunks: [],
        status: 'recording',
      });

      const recorder = new ChunkedRecorder(id, handleChunkComplete, handleStatusUpdate);
      recorderRef.current = recorder;
      await recorder.start();

      setIsRecording(true);
      setIsPaused(false);
      store.setRecordingState(true, false);
      store.setCurrentRecording(id);
    } catch (error) {
      Alert.alert('Error', `Failed to start recording: ${error}`);
    }
  };

  const pauseRecording = async () => {
    if (recorderRef.current) {
      await recorderRef.current.pause();
      setIsPaused(true);
      store.setRecordingState(true, true);
    }
  };

  const resumeRecording = async () => {
    if (recorderRef.current) {
      await recorderRef.current.resume();
      setIsPaused(false);
      store.setRecordingState(true, false);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current || !currentRecordingId) return;

    try {
      const chunks = await recorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      store.setRecordingState(false, false);

      const totalDuration = recorderRef.current.getTotalDuration();
      store.updateRecording(currentRecordingId, {
        title,
        durationMs: totalDuration,
        status: 'stopped',
      });

      // Auto-transcribe if configured
      if (store.settings.autoTranscribe && store.settings.transcription.apiKey) {
        setProcessingStatus('Transcribing...');
        store.updateRecordingStatus(currentRecordingId, 'transcribing');

        try {
          const transcription = await transcribeAllChunks(
            chunks,
            store.settings.transcription,
            (completed, total) => {
              setProcessingStatus(`Transcribing chunk ${completed}/${total}...`);
            },
          );
          store.setTranscription(currentRecordingId, transcription);

          // Auto-summarize if configured
          if (store.settings.autoSummarize && store.settings.summarization.apiKey) {
            setProcessingStatus('Summarizing...');
            store.updateRecordingStatus(currentRecordingId, 'summarizing');

            const summary = await summarizeTranscript(
              transcription,
              store.settings.summarization,
            );
            store.setSummary(currentRecordingId, summary);
          }

          store.updateRecordingStatus(currentRecordingId, 'completed');
        } catch (error) {
          store.updateRecordingStatus(currentRecordingId, 'error');
          Alert.alert('Processing Error', `${error}`);
        }
      } else {
        store.updateRecordingStatus(currentRecordingId, 'completed');
      }

      setProcessingStatus(null);
      onFinish(currentRecordingId);
    } catch (error) {
      Alert.alert('Error', `Failed to stop recording: ${error}`);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Recording', 'Are you sure you want to cancel this recording?', [
      { text: 'Continue Recording', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          if (recorderRef.current) {
            await recorderRef.current.stop();
          }
          if (currentRecordingId) {
            store.deleteRecording(currentRecordingId);
          }
          onCancel();
        },
      },
    ]);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const currentChunkProgress = durationMs > 0
    ? ((durationMs % (CHUNK_DURATION_SECONDS * 1000)) / (CHUNK_DURATION_SECONDS * 1000)) * 100
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isRecording ? 'Recording' : processingStatus ? 'Processing' : 'New Recording'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Meeting title..."
          placeholderTextColor={COLORS.textMuted}
          editable={!isRecording}
        />

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatDuration(durationMs)}</Text>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, isPaused && styles.pausedDot]} />
              <Text style={styles.recordingLabel}>
                {isPaused ? 'PAUSED' : 'REC'}
              </Text>
            </View>
          )}
        </View>

        {/* Chunk Progress */}
        <View style={styles.chunkInfo}>
          <Text style={styles.chunkLabel}>
            Chunk {chunkCount + (isRecording ? 1 : 0)} of recording
          </Text>
          <Text style={styles.chunkSublabel}>
            3-minute segments for security
          </Text>
          {isRecording && (
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${currentChunkProgress}%` }]}
              />
            </View>
          )}
          <Text style={styles.completedChunks}>
            {chunkCount} chunk{chunkCount !== 1 ? 's' : ''} completed
          </Text>
        </View>

        {/* Processing Status */}
        {processingStatus && (
          <View style={styles.processingContainer}>
            <Ionicons name="sync" size={20} color={COLORS.primary} />
            <Text style={styles.processingText}>{processingStatus}</Text>
          </View>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        {!isRecording && !processingStatus ? (
          <TouchableOpacity style={styles.startButton} onPress={startRecording}>
            <Ionicons name="mic" size={36} color={COLORS.text} />
            <Text style={styles.startButtonLabel}>Start Recording</Text>
          </TouchableOpacity>
        ) : isRecording ? (
          <View style={styles.activeControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={isPaused ? resumeRecording : pauseRecording}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={28}
                color={COLORS.text}
              />
              <Text style={styles.controlLabel}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopIcon} />
            </TouchableOpacity>

            <View style={styles.controlButton}>
              <Ionicons name="layers" size={28} color={COLORS.textMuted} />
              <Text style={styles.controlLabel}>{chunkCount} saved</Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    width: '90%',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  timer: {
    fontSize: 64,
    fontWeight: '200',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.recording,
    marginRight: 6,
  },
  pausedDot: {
    backgroundColor: COLORS.warning,
  },
  recordingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.recording,
    letterSpacing: 2,
  },
  chunkInfo: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 40,
  },
  chunkLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chunkSublabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  completedChunks: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 30,
    gap: 10,
  },
  processingText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  controls: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.recording,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: COLORS.recording,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  activeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  controlButton: {
    alignItems: 'center',
    width: 60,
  },
  controlLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.recording,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.recording,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: COLORS.text,
  },
});
