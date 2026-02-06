import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { COLORS } from '../utils/constants';
import { formatDuration, formatRelativeTime } from '../services/formatter';
import { Recording, RecordingStatus } from '../types';

interface HomeScreenProps {
  onStartRecording: () => void;
  onViewRecording: (id: string) => void;
  onOpenSettings: () => void;
}

function getStatusColor(status: RecordingStatus): string {
  switch (status) {
    case 'recording':
      return COLORS.recording;
    case 'transcribing':
    case 'summarizing':
      return COLORS.warning;
    case 'completed':
      return COLORS.success;
    case 'error':
      return COLORS.error;
    default:
      return COLORS.textSecondary;
  }
}

function getStatusLabel(status: RecordingStatus): string {
  switch (status) {
    case 'recording':
      return 'Recording';
    case 'paused':
      return 'Paused';
    case 'stopped':
      return 'Processing...';
    case 'transcribing':
      return 'Transcribing...';
    case 'summarizing':
      return 'Summarizing...';
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}

function RecordingItem({
  item,
  onPress,
}: {
  item: Recording;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.recordingItem} onPress={onPress}>
      <View style={styles.recordingIcon}>
        <Ionicons
          name={item.status === 'completed' ? 'document-text' : 'mic'}
          size={24}
          color={COLORS.primary}
        />
      </View>
      <View style={styles.recordingInfo}>
        <Text style={styles.recordingTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.recordingMeta}>
          <Text style={styles.recordingDate}>
            {formatRelativeTime(item.createdAt)}
          </Text>
          <Text style={styles.recordingDot}> · </Text>
          <Text style={styles.recordingDuration}>
            {formatDuration(item.durationMs)}
          </Text>
          <Text style={styles.recordingDot}> · </Text>
          <Text style={styles.recordingChunks}>
            {item.chunks.length} chunks
          </Text>
        </View>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>
          {item.exportedTo && item.exportedTo.length > 0 && (
            <View style={styles.exportBadges}>
              {item.exportedTo.includes('google-drive') && (
                <Ionicons name="logo-google" size={14} color={COLORS.textSecondary} />
              )}
              {item.exportedTo.includes('onedrive') && (
                <Ionicons name="cloud" size={14} color={COLORS.textSecondary} />
              )}
              {item.exportedTo.includes('obsidian') && (
                <Ionicons name="diamond" size={14} color={COLORS.textSecondary} />
              )}
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function HomeScreen({
  onStartRecording,
  onViewRecording,
  onOpenSettings,
}: HomeScreenProps) {
  const { recordings, loadFromDisk } = useStore();

  useEffect(() => {
    loadFromDisk();
  }, [loadFromDisk]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Dicto</Text>
          <Text style={styles.subtitle}>Meeting Recorder</Text>
        </View>
        <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings}>
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {recordings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mic-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No recordings yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the button below to start recording your first meeting
          </Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecordingItem
              item={item}
              onPress={() => onViewRecording(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.recordButton} onPress={onStartRecording}>
        <View style={styles.recordButtonInner}>
          <Ionicons name="mic" size={32} color={COLORS.text} />
        </View>
        <Text style={styles.recordButtonLabel}>New Recording</Text>
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  recordingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  recordingDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recordingDot: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  recordingDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recordingChunks: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  exportBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  recordButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
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
  recordButtonLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
});
