export type AttachmentType = 'image' | 'pdf' | 'office' | 'code' | 'other';

export type AttachmentStatus = 'uploading' | 'ready' | 'error';

export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  size: number;
  mimeType: string;
  url?: string;
  status: AttachmentStatus;
  preview?: string;
  createdAt: string;
}
