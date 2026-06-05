export type ToolCallStatus = 'pending' | 'running' | 'complete' | 'error' | 'cancelled';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: ToolCallStatus;
  result?: ToolCallResult;
  messageId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCallResult {
  content: string;
  isError: boolean;
  duration?: number;
}
