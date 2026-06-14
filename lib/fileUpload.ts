import { ApiClient } from './api';

export interface UploadProgress {
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  progress: number; // 0–1
}

export async function uploadFile(
  file: File,
  sessionId: string,
  client: ApiClient,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const result = await client.uploadFile(sessionId, file);

  onProgress?.({
    fileName: file.name,
    bytesUploaded: file.size,
    totalBytes: file.size,
    progress: 1,
  });

  return result.file_path;
}
