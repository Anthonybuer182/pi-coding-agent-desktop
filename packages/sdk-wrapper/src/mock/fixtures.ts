import type {
  Workspace,
  Session,
  SessionWithMessages,
  Message,
  AssistantMessage,
  UserMessage,
  ContentBlock,
  Diff,
  ModelInfo,
  Config,
  SlashCommand,
  Skill,
  UsageStats,
} from '@pi/types';

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 'ws-1',
    name: 'my-project',
    path: '/home/user/projects/my-project',
    type: 'local',
    sessionCount: 3,
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-06-04T08:30:00Z',
  },
  {
    id: 'ws-2',
    name: 'side-project',
    path: '/home/user/projects/side-project',
    type: 'local',
    sessionCount: 2,
    createdAt: '2026-05-15T14:00:00Z',
    updatedAt: '2026-06-03T16:45:00Z',
  },
  {
    id: 'ws-3',
    name: 'remote-api',
    path: 'https://github.com/org/remote-api',
    type: 'remote',
    sessionCount: 1,
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-06-02T11:00:00Z',
  },
];

export const MOCK_SESSIONS: Session[] = [
  // ws-1 sessions
  {
    id: 'sess-1',
    workspaceId: 'ws-1',
    title: 'Implement user authentication',
    status: 'active',
    messageCount: 12,
    lastMessageAt: '2026-06-04T08:30:00Z',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-04T08:30:00Z',
  },
  {
    id: 'sess-2',
    workspaceId: 'ws-1',
    title: 'Fix database connection pool',
    status: 'active',
    messageCount: 8,
    lastMessageAt: '2026-06-04T07:15:00Z',
    createdAt: '2026-06-02T14:00:00Z',
    updatedAt: '2026-06-04T07:15:00Z',
  },
  {
    id: 'sess-3',
    workspaceId: 'ws-1',
    title: 'Refactor API middleware',
    status: 'archived',
    messageCount: 20,
    lastMessageAt: '2026-06-03T12:00:00Z',
    createdAt: '2026-05-28T09:00:00Z',
    updatedAt: '2026-06-03T12:00:00Z',
  },
  // ws-2 sessions
  {
    id: 'sess-4',
    workspaceId: 'ws-2',
    title: 'Add dark mode support',
    status: 'active',
    messageCount: 5,
    lastMessageAt: '2026-06-03T16:45:00Z',
    createdAt: '2026-06-01T14:00:00Z',
    updatedAt: '2026-06-03T16:45:00Z',
  },
  {
    id: 'sess-5',
    workspaceId: 'ws-2',
    title: 'Optimize bundle size',
    status: 'active',
    messageCount: 3,
    lastMessageAt: '2026-06-03T10:00:00Z',
    createdAt: '2026-06-03T09:00:00Z',
    updatedAt: '2026-06-03T10:00:00Z',
  },
  // ws-3 sessions
  {
    id: 'sess-6',
    workspaceId: 'ws-3',
    title: 'API rate limiting discussion',
    status: 'active',
    messageCount: 6,
    lastMessageAt: '2026-06-02T11:00:00Z',
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-06-02T11:00:00Z',
  },
];

export function buildMockMessages(sessionId: string): Message[] {
  const baseTime = new Date('2026-06-04T08:00:00Z').getTime();
  const messages: Message[] = [
    createUserMessage('msg-1', sessionId, 'Can you help me implement a JWT authentication middleware in Express?', baseTime),
    createAssistantMessage('msg-2', sessionId, [
      createTextBlock('b1', "I'll help you implement JWT authentication middleware. Here's the implementation:"),
      createTextBlock('b2', "```typescript\nimport jwt from 'jsonwebtoken';\n\ninterface AuthRequest extends Request {\n  user?: { id: string; email: string };\n}\n\nexport function authMiddleware(\n  req: AuthRequest,\n  res: Response,\n  next: NextFunction\n) {\n  const token = req.headers.authorization?.split(' ')[1];\n  if (!token) {\n    return res.status(401).json({ error: 'No token provided' });\n  }\n  try {\n    const decoded = jwt.verify(token, process.env.JWT_SECRET!);\n    req.user = decoded as { id: string; email: string };\n    next();\n  } catch (err) {\n    return res.status(401).json({ error: 'Invalid token' });\n  }\n}\n```"),
      createThinkingBlock('tb-1', 'The user needs JWT auth middleware. I should provide a TypeScript-friendly implementation with proper error handling. I need to make sure to extend the Request type for type safety.'),
    ] as ContentBlock[], baseTime + 2000),
    createUserMessage('msg-3', sessionId, 'Can you add support for refresh tokens too?', baseTime + 5000),
    createAssistantMessage('msg-4', sessionId, [
      createTextBlock('b3', "Here's an updated version with refresh token support:"),
      createTextBlock('b4', "```typescript\nimport jwt from 'jsonwebtoken';\n\ninterface TokenPair {\n  accessToken: string;\n  refreshToken: string;\n}\n\nfunction generateTokens(userId: string): TokenPair {\n  const accessToken = jwt.sign(\n    { id: userId },\n    process.env.JWT_SECRET!,\n    { expiresIn: '15m' }\n  );\n  const refreshToken = jwt.sign(\n    { id: userId },\n    process.env.REFRESH_SECRET!,\n    { expiresIn: '7d' }\n  );\n  return { accessToken, refreshToken };\n}\n\nasync function refreshAccessToken(\n  refreshToken: string\n): Promise<TokenPair> {\n  try {\n    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET!);\n    const { id } = decoded as { id: string };\n    // Invalidate old tokens...\n    return generateTokens(id);\n  } catch {\n    throw new Error('Invalid refresh token');\n  }\n}\n```"),
      createToolCallBlock('tc-1', 'read_file', { path: 'src/auth/middleware.ts' }),
      createToolResultBlock('tr-1', 'tc-1', '// File: src/auth/middleware.ts\n// 24 lines - existing auth middleware found'),
      createThinkingBlock('tb-2', 'The user wants refresh token support. I need to show how to generate and validate refresh tokens. The existing file has basic auth middleware that can be extended.'),
    ] as ContentBlock[], baseTime + 7000),
    createUserMessage('msg-5', sessionId, 'This looks great, thanks!', baseTime + 10000),
    createAssistantMessage('msg-6', sessionId, [
      createTextBlock('b5', "You're welcome! To summarize what we've implemented:\n\n1. **JWT Authentication Middleware** - Validates access tokens on protected routes\n2. **Refresh Token Support** - Allows generating new access tokens without re-login\n3. **Token Pair Generation** - Access tokens (15min) + Refresh tokens (7 days)\n\nLet me know if you need help with anything else! 🎉"),
    ] as ContentBlock[], baseTime + 12000),
  ];

  return messages;
}

export const MOCK_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    supportsThinking: true,
    thinkLevels: ['off', 'low', 'medium', 'high'],
    maxTokens: 200000,
    isAvailable: true,
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    supportsThinking: true,
    thinkLevels: ['off', 'low', 'medium', 'high'],
    maxTokens: 200000,
    isAvailable: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    supportsThinking: false,
    thinkLevels: ['off'],
    maxTokens: 128000,
    isAvailable: true,
  },
];

export const MOCK_CONFIG: Config = {
  theme: 'system',
  compactMode: false,
  defaultModelId: 'claude-sonnet-4',
  defaultThinkLevel: 'medium',
  autoSave: true,
  fontSize: 14,
  codeFontSize: 13,
  enableStreaming: true,
};

export const MOCK_SLASH_COMMANDS: SlashCommand[] = [
  { id: 'sc-1', name: '/help', description: 'Show help information', category: 'chat' },
  { id: 'sc-2', name: '/clear', description: 'Clear the current conversation', category: 'chat' },
  { id: 'sc-3', name: '/compact', description: 'Compact conversation context', category: 'chat' },
  { id: 'sc-4', name: '/workspace', description: 'Switch to a workspace', category: 'workspace', args: [{ name: 'name', description: 'Workspace name', required: true, type: 'string' }] },
  { id: 'sc-5', name: '/file', description: 'Open a file', category: 'file', args: [{ name: 'path', description: 'File path', required: true, type: 'string' }] },
  { id: 'sc-6', name: '/config', description: 'Show or update config', category: 'config' },
  { id: 'sc-7', name: '/diff', description: 'Show diff for current session', category: 'chat' },
];

export const MOCK_SKILLS: Skill[] = [
  { id: 'skill-officecli', name: 'officecli', description: 'Create and edit Office documents (.docx, .xlsx, .pptx)', category: 'document', enabled: true },
  { id: 'skill-pdfcli', name: 'pdfcli', description: 'Work with PDF documents', category: 'document', enabled: true },
  { id: 'skill-filesystem', name: 'filesystem', description: 'Access and manage local files', category: 'filesystem', enabled: true },
  { id: 'skill-graphify', name: 'graphify', description: 'Build knowledge graphs from code', category: 'code', enabled: false },
  { id: 'skill-ui-ux-pro-max', name: 'ui-ux-pro-max', description: 'UI/UX design intelligence', category: 'code', enabled: true },
];

export const MOCK_DIFFS: Diff[] = [
  {
    id: 'diff-1',
    sessionId: 'sess-1',
    fileName: 'src/auth/middleware.ts',
    filePath: 'src/auth/middleware.ts',
    status: 'pending',
    hunks: [
      {
        id: 'hunk-1',
        header: '@@ -1,5 +1,25 @@',
        lines: [
          { id: 'dl-1', type: 'context', lineNumber: 1, content: "import { Request, Response, NextFunction } from 'express';", oldLineNumber: 1, newLineNumber: 1 },
          { id: 'dl-2', type: 'context', lineNumber: 2, content: '', oldLineNumber: 2, newLineNumber: 2 },
          { id: 'dl-3', type: 'add', lineNumber: 3, content: "import jwt from 'jsonwebtoken';", newLineNumber: 3 },
          { id: 'dl-4', type: 'add', lineNumber: 4, content: '', newLineNumber: 4 },
          { id: 'dl-5', type: 'add', lineNumber: 5, content: "interface AuthRequest extends Request {", newLineNumber: 5 },
          { id: 'dl-6', type: 'add', lineNumber: 6, content: "  user?: { id: string; email: string };", newLineNumber: 6 },
          { id: 'dl-7', type: 'add', lineNumber: 7, content: '}', newLineNumber: 7 },
          { id: 'dl-8', type: 'add', lineNumber: 8, content: '', newLineNumber: 8 },
          { id: 'dl-9', type: 'add', lineNumber: 9, content: 'export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {', newLineNumber: 9 },
          { id: 'dl-10', type: 'add', lineNumber: 10, content: "  const token = req.headers.authorization?.split(' ')[1];", newLineNumber: 10 },
          { id: 'dl-11', type: 'add', lineNumber: 11, content: '  if (!token) return res.status(401).json({ error: "No token" });', newLineNumber: 11 },
          { id: 'dl-12', type: 'add', lineNumber: 12, content: '  try {', newLineNumber: 12 },
          { id: 'dl-13', type: 'add', lineNumber: 13, content: "    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };", newLineNumber: 13 },
          { id: 'dl-14', type: 'add', lineNumber: 14, content: '    req.user = decoded;', newLineNumber: 14 },
          { id: 'dl-15', type: 'add', lineNumber: 15, content: '    next();', newLineNumber: 15 },
          { id: 'dl-16', type: 'add', lineNumber: 16, content: '  } catch {', newLineNumber: 16 },
          { id: 'dl-17', type: 'add', lineNumber: 17, content: '    return res.status(401).json({ error: "Invalid token" });', newLineNumber: 17 },
          { id: 'dl-18', type: 'add', lineNumber: 18, content: '  }', newLineNumber: 18 },
          { id: 'dl-19', type: 'add', lineNumber: 19, content: '}', newLineNumber: 19 },
        ],
      },
    ],
    createdAt: '2026-06-04T08:15:00Z',
  },
  {
    id: 'diff-2',
    sessionId: 'sess-1',
    fileName: 'src/auth/refresh-token.ts',
    filePath: 'src/auth/refresh-token.ts',
    status: 'pending',
    hunks: [
      {
        id: 'hunk-2',
        header: '@@ -0,0 +1,35 @@',
        lines: [
          { id: 'dl-20', type: 'add', lineNumber: 1, content: "import jwt from 'jsonwebtoken';", newLineNumber: 1 },
          { id: 'dl-21', type: 'add', lineNumber: 2, content: '', newLineNumber: 2 },
          { id: 'dl-22', type: 'add', lineNumber: 3, content: 'interface TokenPair {', newLineNumber: 3 },
          { id: 'dl-23', type: 'add', lineNumber: 4, content: '  accessToken: string;', newLineNumber: 4 },
          { id: 'dl-24', type: 'add', lineNumber: 5, content: '  refreshToken: string;', newLineNumber: 5 },
          { id: 'dl-25', type: 'add', lineNumber: 6, content: '}', newLineNumber: 6 },
        ],
      },
    ],
    createdAt: '2026-06-04T08:20:00Z',
  },
];

export const MOCK_USAGE_SESS_1: UsageStats = {
  sessionId: 'sess-1',
  totalTokens: 4520,
  tokenUsage: {
    inputTokens: 2150,
    outputTokens: 2370,
    totalTokens: 4520,
    cacheReadTokens: 800,
    cacheWriteTokens: 200,
  },
  costEstimate: {
    inputCost: 0.00645,
    outputCost: 0.03555,
    totalCost: 0.042,
    currency: 'USD',
  },
  messageCount: 12,
  toolCallCount: 3,
  streamingDuration: 2800,
  periodStart: '2026-06-04T08:00:00Z',
  periodEnd: '2026-06-04T08:30:00Z',
};

export const SAMPLE_MARKDOWN = `# Authentication Module

This module provides JWT-based authentication for the Express API.

## Overview

The auth module includes:
- JWT token generation and validation
- Refresh token support
- Middleware for protected routes
- Role-based access control

## Usage

\`\`\`typescript
import { authMiddleware } from './auth/middleware';
import { generateTokens } from './auth/refresh-token';

app.post('/api/login', async (req, res) => {
  const { id, email } = req.user;
  const tokens = generateTokens(id);
  res.json(tokens);
});

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
\`\`\`

## Configuration

Required environment variables:
- \`JWT_SECRET\` - Secret for signing access tokens
- \`REFRESH_SECRET\` - Secret for signing refresh tokens
- \`TOKEN_EXPIRY\` - Access token expiry (default: 15m)
- \`REFRESH_EXPIRY\` - Refresh token expiry (default: 7d)`;

export const SAMPLE_CODE = `import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}`;

// Helper functions for building mock data

function createUserMessage(id: string, sessionId: string, content: string, timestamp: number): UserMessage {
  return {
    id,
    sessionId,
    role: 'user',
    status: 'complete',
    content,
    blocks: [{ id: `b-${id}`, type: 'text', content }],
    createdAt: new Date(timestamp).toISOString(),
    updatedAt: new Date(timestamp).toISOString(),
  };
}

function createAssistantMessage(
  id: string,
  sessionId: string,
  blocks: ContentBlock[],
  timestamp: number,
): AssistantMessage {
  const textBlocks = blocks.filter((b) => b.type === 'text');
  return {
    id,
    sessionId,
    role: 'assistant',
    status: 'complete',
    modelId: 'claude-sonnet-4',
    content: textBlocks.map((b) => b.content).join('\n\n'),
    blocks,
    createdAt: new Date(timestamp).toISOString(),
    updatedAt: new Date(timestamp).toISOString(),
    usage: {
      inputTokens: 500,
      outputTokens: 300,
      totalTokens: 800,
    },
  };
}

function createTextBlock(id: string, content: string): ContentBlock {
  return { id, type: 'text', content };
}

function createThinkingBlock(id: string, thinking: string): ContentBlock {
  return { id, type: 'thinking', content: thinking, thinking, duration: 1200 };
}

function createToolCallBlock(id: string, name: string, args: Record<string, unknown>): ContentBlock {
  return { id, type: 'tool_call', content: `Calling ${name}`, toolCallId: id, toolName: name, args };
}

function createToolResultBlock(id: string, toolCallId: string, result: string): ContentBlock {
  return { id, type: 'tool_result', content: result, toolCallId, result, isError: false };
}
