export type DiffLineType = 'add' | 'remove' | 'context';

export type DiffStatus = 'pending' | 'accepted' | 'rejected' | 'partial';

export interface DiffLine {
  id: string;
  type: DiffLineType;
  lineNumber: number;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  id: string;
  header: string;
  lines: DiffLine[];
}

export interface Diff {
  id: string;
  sessionId: string;
  fileName: string;
  filePath: string;
  status: DiffStatus;
  hunks: DiffHunk[];
  createdAt: string;
}
