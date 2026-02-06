import { GoogleDriveConfig, Recording } from '../../types';
import { formatSummaryAsMarkdown } from '../formatter';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

export async function uploadToGoogleDrive(
  recording: Recording,
  config: GoogleDriveConfig,
): Promise<string> {
  const content = formatSummaryAsMarkdown(recording);
  const fileName = `Dicto - ${recording.title} - ${new Date(recording.createdAt).toLocaleDateString()}.md`;

  // Create file metadata
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: 'text/markdown',
  };

  if (config.folderId) {
    metadata.parents = [config.folderId];
  }

  // Use multipart upload
  const boundary = '-------dicto_boundary';
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/markdown\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const response = await fetch(`${DRIVE_UPLOAD_URL}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Drive upload failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.id;
}

export async function listDriveFolders(
  config: GoogleDriveConfig,
): Promise<Array<{ id: string; name: string }>> {
  const query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
  const response = await fetch(
    `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to list Google Drive folders: ${response.status}`);
  }

  const data = await response.json();
  return data.files || [];
}

export async function createDriveFolder(
  name: string,
  config: GoogleDriveConfig,
): Promise<string> {
  const response = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Google Drive folder: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}
