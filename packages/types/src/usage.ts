export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface UsageStats {
  sessionId: string;
  totalTokens: number;
  tokenUsage: TokenUsage;
  costEstimate: CostEstimate;
  messageCount: number;
  toolCallCount: number;
  streamingDuration: number;
  periodStart: string;
  periodEnd: string;
}
