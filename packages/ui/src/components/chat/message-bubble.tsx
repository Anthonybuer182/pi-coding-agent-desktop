import type { Message, ContentBlock, ThinkingBlock as ThinkingBlockType, ToolCallBlock, ToolResultBlock } from '@pi/types';
import { cn } from '@/lib/utils';
import { UserIcon, Bot } from 'lucide-react';
import { ThinkingBlock } from './thinking-block';
import { ToolCallDisplay } from './tool-call-display';
import { ToolResultDisplay } from './tool-result-display';

interface MessageBubbleProps {
  message: Message;
}

function TextBlockContent({ content }: { content: string }) {
  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const [, ...codeLines] = part.split('\n');
          const code = codeLines.slice(0, -1).join('\n');
          const lang = part.split('\n')[0].replace('```', '').trim();
          return (
            <pre key={i} className="my-2 overflow-x-auto rounded-md bg-muted/80 p-3 text-xs">
              {lang && (
                <div className="mb-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                  {lang}
                </div>
              )}
              <code className="font-mono text-xs leading-relaxed whitespace-pre">
                {code}
              </code>
            </pre>
          );
        }
        return part ? <p key={i} className="whitespace-pre-wrap">{part}</p> : null;
      })}
    </>
  );
}

function renderBlock(block: ContentBlock, message: Message) {
  switch (block.type) {
    case 'text':
      return <TextBlockContent key={block.id} content={block.content} />;
    case 'thinking':
      return <ThinkingBlock key={block.id} block={block as ThinkingBlockType} />;
    case 'tool_call':
      return <ToolCallDisplay key={block.id} block={block as ToolCallBlock} isStreaming={message.status === 'streaming'} />;
    case 'tool_result':
      return <ToolResultDisplay key={block.id} block={block as ToolResultBlock} />;
    default:
      return null;
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasBlocks = message.blocks && message.blocks.length > 0;

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : '')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('flex max-w-[80%] flex-col gap-1', isUser && 'items-end')}>
        <div className={cn(
          'rounded-lg px-4 py-2 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          {isUser || !hasBlocks ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="flex flex-col">
              {message.blocks.map((block) => renderBlock(block, message))}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(message.createdAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
