import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ObsidianConfig, Recording } from '../../types';
import { formatSummaryAsMarkdown } from '../formatter';

const OBSIDIAN_DIR = `${FileSystem.documentDirectory}obsidian-export/`;

async function ensureExportDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(OBSIDIAN_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(OBSIDIAN_DIR, { intermediates: true });
  }
}

export async function exportToObsidian(
  recording: Recording,
  config: ObsidianConfig,
): Promise<string> {
  await ensureExportDir();

  const content = formatForObsidian(recording, config);
  const safeTitle = recording.title.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
  const dateStr = new Date(recording.createdAt).toISOString().split('T')[0];
  const fileName = `${dateStr} ${safeTitle}.md`;
  const filePath = `${OBSIDIAN_DIR}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Use share sheet so user can "Open in Obsidian" or save to Files
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/markdown',
      dialogTitle: 'Export to Obsidian',
      UTI: 'net.daringfireball.markdown',
    });
  }

  return filePath;
}

function formatForObsidian(recording: Recording, config: ObsidianConfig): string {
  const dateStr = new Date(recording.createdAt).toISOString().split('T')[0];
  const timeStr = new Date(recording.createdAt).toLocaleTimeString();
  const durationMin = Math.round(recording.durationMs / 60000);

  // Obsidian-style frontmatter
  const frontmatter = [
    '---',
    `title: "${recording.title}"`,
    `date: ${dateStr}`,
    `time: "${timeStr}"`,
    `duration: ${durationMin} minutes`,
    `tags: [meeting, dicto]`,
    `type: meeting-note`,
    '---',
  ].join('\n');

  const templateFormat = config.templateFormat || 'default';

  if (templateFormat === 'minimal') {
    return [
      frontmatter,
      '',
      `# ${recording.title}`,
      '',
      recording.summary || '_No summary available_',
    ].join('\n');
  }

  // Default template with full details
  return [
    frontmatter,
    '',
    `# ${recording.title}`,
    '',
    `> **Date:** ${dateStr} at ${timeStr}`,
    `> **Duration:** ${durationMin} minutes`,
    `> **Chunks:** ${recording.chunks.length} segments (3-min intervals)`,
    '',
    '## Summary',
    '',
    recording.summary || '_No summary available_',
    '',
    '---',
    '',
    '## Full Transcript',
    '',
    recording.transcription || '_No transcript available_',
    '',
  ].join('\n');
}

export function formatSummaryForObsidian(recording: Recording): string {
  return formatForObsidian(recording, { vaultPath: '', folderName: 'Dicto' });
}
