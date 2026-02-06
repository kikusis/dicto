import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { COLORS } from '../utils/constants';

interface SettingsScreenProps {
  onBack: () => void;
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text style={styles.rowLabelText}>{label}</Text>
        {description && (
          <Text style={styles.rowDescription}>{description}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { settings, updateSettings } = useStore();
  const [transcriptionKey, setTranscriptionKey] = useState(
    settings.transcription.apiKey,
  );
  const [summarizationKey, setSummarizationKey] = useState(
    settings.summarization.apiKey,
  );
  const [whisperModel, setWhisperModel] = useState(
    settings.transcription.model || 'whisper-1',
  );
  const [summaryModel, setSummaryModel] = useState(
    settings.summarization.model || 'gpt-4o-mini',
  );
  const [language, setLanguage] = useState(
    settings.transcription.language || 'en',
  );
  const [obsidianFolder, setObsidianFolder] = useState(
    settings.obsidian?.folderName || 'Dicto',
  );

  const saveSettings = () => {
    updateSettings({
      transcription: {
        ...settings.transcription,
        apiKey: transcriptionKey,
        model: whisperModel,
        language,
      },
      summarization: {
        ...settings.summarization,
        apiKey: summarizationKey,
        model: summaryModel,
      },
      obsidian: {
        vaultPath: settings.obsidian?.vaultPath || '',
        folderName: obsidianFolder,
      },
    });
    Alert.alert('Saved', 'Settings updated successfully.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={saveSettings} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SettingsSection title="Transcription (Whisper API)">
          <SettingsRow label="API Key" description="Your OpenAI API key for Whisper">
            <TextInput
              style={styles.input}
              value={transcriptionKey}
              onChangeText={setTranscriptionKey}
              placeholder="sk-..."
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
          </SettingsRow>
          <SettingsRow label="Model">
            <TextInput
              style={styles.inputSmall}
              value={whisperModel}
              onChangeText={setWhisperModel}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
          </SettingsRow>
          <SettingsRow label="Language" description="ISO 639-1 code (e.g. en, es, fr)">
            <TextInput
              style={styles.inputSmall}
              value={language}
              onChangeText={setLanguage}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              maxLength={5}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Summarization">
          <SettingsRow label="API Key" description="Your OpenAI API key for GPT">
            <TextInput
              style={styles.input}
              value={summarizationKey}
              onChangeText={setSummarizationKey}
              placeholder="sk-..."
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
          </SettingsRow>
          <SettingsRow label="Model">
            <TextInput
              style={styles.inputSmall}
              value={summaryModel}
              onChangeText={setSummaryModel}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Automation">
          <SettingsRow
            label="Auto-Transcribe"
            description="Transcribe immediately after recording stops"
          >
            <Switch
              value={settings.autoTranscribe}
              onValueChange={(value) => updateSettings({ autoTranscribe: value })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </SettingsRow>
          <SettingsRow
            label="Auto-Summarize"
            description="Summarize right after transcription"
          >
            <Switch
              value={settings.autoSummarize}
              onValueChange={(value) => updateSettings({ autoSummarize: value })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Cloud Storage">
          <SettingsRow
            label="Google Drive"
            description="OAuth connection required"
          >
            <TouchableOpacity
              style={[
                styles.connectBtn,
                settings.googleDrive?.accessToken && styles.connectedBtn,
              ]}
              onPress={() =>
                Alert.alert(
                  'Google Drive',
                  'OAuth integration requires building with EAS. Add your Google OAuth client ID in app.json to enable.',
                )
              }
            >
              <Text style={styles.connectBtnText}>
                {settings.googleDrive?.accessToken ? 'Connected' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </SettingsRow>
          <SettingsRow
            label="OneDrive"
            description="Microsoft account required"
          >
            <TouchableOpacity
              style={[
                styles.connectBtn,
                settings.oneDrive?.accessToken && styles.connectedBtn,
              ]}
              onPress={() =>
                Alert.alert(
                  'OneDrive',
                  'OAuth integration requires building with EAS. Add your Microsoft OAuth client ID in app.json to enable.',
                )
              }
            >
              <Text style={styles.connectBtnText}>
                {settings.oneDrive?.accessToken ? 'Connected' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Obsidian">
          <SettingsRow
            label="Folder Name"
            description="Folder name for exported notes"
          >
            <TextInput
              style={styles.inputSmall}
              value={obsidianFolder}
              onChangeText={setObsidianFolder}
              placeholderTextColor={COLORS.textMuted}
            />
          </SettingsRow>
          <View style={styles.obsidianNote}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.obsidianNoteText}>
              Obsidian export uses the system share sheet. Tap "Open in Obsidian" when sharing to add notes directly to your vault.
            </Text>
          </View>
        </SettingsSection>

        <SettingsSection title="Recording">
          <SettingsRow
            label="Chunk Duration"
            description="Audio is split into segments for security"
          >
            <Text style={styles.fixedValue}>3 minutes</Text>
          </SettingsRow>
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.success} />
            <Text style={styles.securityNoteText}>
              Recordings are split into 3-minute chunks. Each chunk is stored separately and can be individually deleted for security.
            </Text>
          </View>
        </SettingsSection>

        <SettingsSection title="About">
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Dicto</Text>
            <Text style={styles.aboutValue}>v1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Platform</Text>
            <Text style={styles.aboutValue}>iOS & Android</Text>
          </View>
        </SettingsSection>
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
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    flex: 1,
    marginRight: 12,
  },
  rowLabelText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  rowDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    width: 160,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputSmall: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    width: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fixedValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  connectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  connectedBtn: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  connectBtnText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  obsidianNote: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  obsidianNoteText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  securityNote: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  securityNoteText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aboutLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  aboutValue: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
