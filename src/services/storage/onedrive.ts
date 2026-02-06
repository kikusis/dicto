import { OneDriveConfig, Recording } from '../../types';
import { formatSummaryAsMarkdown } from '../formatter';

const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';

export async function uploadToOneDrive(
  recording: Recording,
  config: OneDriveConfig,
): Promise<string> {
  const content = formatSummaryAsMarkdown(recording);
  const fileName = `Dicto - ${recording.title} - ${new Date(recording.createdAt).toLocaleDateString()}.md`;

  let uploadPath: string;
  if (config.folderId) {
    uploadPath = `${GRAPH_API_URL}/me/drive/items/${config.folderId}:/${encodeURIComponent(fileName)}:/content`;
  } else {
    uploadPath = `${GRAPH_API_URL}/me/drive/root:/Dicto/${encodeURIComponent(fileName)}:/content`;
  }

  const response = await fetch(uploadPath, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'text/markdown',
    },
    body: content,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OneDrive upload failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.id;
}

export async function listOneDriveFolders(
  config: OneDriveConfig,
): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(
    `${GRAPH_API_URL}/me/drive/root/children?$filter=folder ne null&$select=id,name`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to list OneDrive folders: ${response.status}`);
  }

  const data = await response.json();
  return (data.value || []).map((item: { id: string; name: string }) => ({
    id: item.id,
    name: item.name,
  }));
}
