import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { cn } from '@/lib/utils';
import './chat-animations.css';

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownContent({ content, isStreaming }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none animate-streaming-in',
        'prose-pre:my-2 prose-pre:bg-muted/80 prose-pre:border prose-pre:border-border',
        'prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none',
        'prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-semibold',
        'prose-p:my-1 prose-p:leading-relaxed',
        'prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
        'prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1',
        'prose-blockquote:border-l-2 prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-50/30 prose-blockquote:py-1 prose-blockquote:pl-3 prose-blockquote:not-italic',
        isStreaming && 'after:content-["▊"] after:animate-pulse after:text-emerald-500 after:ml-0.5',
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
