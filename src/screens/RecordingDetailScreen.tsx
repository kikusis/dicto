import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { COLORS } from '../utils/constants';
import { formatDuration, formatRelativeTime } from '../services/formatter';
import { transcribeAllChunks } from '../services/transcription';
import { summarizeTranscript } from '../services/summarization';
import { uploadToGoogleDrive } from '../services/storage/google-drive';
import { uploadToOneDrive } from '../services/storage/onedrive';
import { exportToObsidian } from '../services/storage/obsidian';
import { deleteRecordingFiles } from '../services/recording';
import { ExportDestination } from '../types';

interface RecordingDetailScreenProps {
  recordingId: string;
  onBack: () => void;
}

export default function RecordingDetailScreen({
  recordingId,
  onBack,
}: RecordingDetailScreenProps) {
  const store = useStore();
  const recording = store.recordings.find((r) => r.id === recordingId);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');

  if (!recording) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Recording not found</Text>
      </SafeAreaView>
    );
  }

  const handleTranscribe = async () => {
    if (!store.settings.transcription.apiKey) {
      Alert.alert('API Key Required', 'Please add your OpenAI API key in Settings.');
      return;
    }

    setIsProcessing(true);
    setProcessingLabel('Transcribing...');
    store.updateRecordingStatus(recordingId, 'transcribing');

    try {
      const transcription = await transcribeAllChunks(
        recording.chunks,
        store.settings.transcription,
        (done, total) => setProcessingLabel(`Transcribing chunk ${done}/${total}...`),
      );
      store.setTranscription(recordingId, transcription);
      store.updateRecordingStatus(recordingId, 'completed');
    } catch (error) {
      store.updateRecordingStatus(recordingId, 'error');
      Alert.alert('Error', `Transcription failed: ${error}`);
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const handleSummarize = async () => {
    if (!recording.transcription) {
      Alert.alert('No Transcript', 'Please transcribe the recording first.');
      return;
    }
    if (!store.settings.summarization.apiKey) {
      Alert.alert('API Key Required', 'Please add your OpenAI API key in Settings.');
      return;
    }

    setIsProcessing(true);
    setProcessingLabel('Summarizing...');
    store.updateRecordingStatus(recordingId, 'summarizing');

    try {
      const summary = await summarizeTranscript(
        recording.transcription,
        store.settings.summarization,
      );
      store.setSummary(recordingId, summary);
      store.updateRecordingStatus(recordingId, 'completed');
    } catch (error) {
      store.updateRecordingStatus(recordingId, 'error');
      Alert.alert('Error', `Summarization failed: ${error}`);
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const handleExport = (destination: ExportDestination) => {
    return async () => {
      setIsProcessing(true);
      setProcessingLabel(`Exporting to ${destination}...`);

      try {
        switch (destination) {
          case 'google-drive':
            if (!store.settings.googleDrive?.accessToken) {
              Alert.alert('Not Connected', 'Please connect Google Drive in Settings.');
              return;
            }
            await uploadToGoogleDrive(recording, store.settings.googleDrive);
            break;
          case 'onedrive':
            if (!store.settings.oneDrive?.accessToken) {
              Alert.alert('Not Connected', 'Please connect OneDrive in Settings.');
              return;
            }
            await uploadToOneDrive(recording, store.settings.oneDrive);
            break;
          case 'obsidian':
            await exportToObsidian(recording, {
              vaultPath: store.settings.obsidian?.vaultPath || '',
              folderName: store.settings.obsidian?.folderName || 'Dicto',
            });
            break;
        }
        store.addExportDestination(recordingId, destination);
        Alert.alert('Success', `Exported to ${destination} successfully!`);
      } catch (error) {
        Alert.alert('Export Error', `${error}`);
      } finally {
        setIsProcessing(false);
        setProcessingLabel('');
      }
    };
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Recording',
      'This will permanently delete this recording and all its data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecordingFiles(recordingId);
            store.deleteRecording(recordingId);
            onBack();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recording.title}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={22} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Meta Info */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{formatDuration(recording.durationMs)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{formatRelativeTime(recording.createdAt)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="layers-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{recording.chunks.length} chunks</Text>
        </View>
      </View>

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingBar}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.processingText}>{processingLabel}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!recording.transcription && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleTranscribe}
            disabled={isProcessing}
          >
            <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionText}>Transcribe</Text>
          </TouchableOpacity>
        )}
        {recording.transcription && !recording.summary && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleSummarize}
            disabled={isProcessing}
          >
            <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionText}>Summarize</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Export Buttons */}
      {(recording.summary || recording.transcription) && (
        <View style={styles.exportRow}>
          <Text style={styles.exportLabel}>Export to:</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExport('google-drive')}
              disabled={isProcessing}
            >
              <Ionicons name="logo-google" size={18} color={COLORS.text} />
              <Text style={styles.exportBtnText}>Drive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExport('onedrive')}
              disabled={isProcessing}
            >
              <Ionicons name="cloud-outline" size={18} color={COLORS.text} />
              <Text style={styles.exportBtnText}>OneDrive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExport('obsidian')}
              disabled={isProcessing}
            >
              <Ionicons name="diamond-outline" size={18} color={COLORS.text} />
              <Text style={styles.exportBtnText}>Obsidian</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
            Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transcript' && styles.activeTab]}
          onPress={() => setActiveTab('transcript')}
        >
          <Text style={[styles.tabText, activeTab === 'transcript' && styles.activeTabText]}>
            Transcript
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'summary' ? (
          <Text style={styles.contentText}>
            {recording.summary || 'No summary yet. Transcribe and summarize this recording to see the summary here.'}
          </Text>
        ) : (
          <Text style={styles.contentText}>
            {recording.transcription || 'No transcript yet. Tap "Transcribe" to convert the audio to text.'}
          </Text>
        )}
      </ScrollView>
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
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  deleteBtn: {
    padding: 8,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  processingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  processingText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  exportRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  exportLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
    textAlign: 'center',
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exportBtnText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.text,
  },
  contentScroll: {
    flex: 1,
    marginTop: 12,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textSecondary,
  },
});
