import { useRef, useCallback, KeyboardEvent, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ComposerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSlashDetected?: (query: string) => void;
  onMentionDetected?: (query: string) => void;
  onSlashDismiss?: () => void;
  onMentionDismiss?: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoResize?: boolean;
  maxRows?: number;
  showMenu?: boolean;
  onMenuNavigate?: (direction: 'up' | 'down') => void;
  onMenuSelect?: () => void;
  totalMenuItems?: number;
}

export function ComposerInput({
  value,
  onChange,
  onSubmit,
  onSlashDetected,
  onMentionDetected,
  onSlashDismiss,
  onMentionDismiss,
  disabled,
  placeholder = 'Type a message, / for commands, or @ to mention...',
  autoResize = true,
  maxRows = 8,
  showMenu = false,
  onMenuNavigate,
  onMenuSelect,
}: ComposerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    if (!autoResize || !textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = 'auto';
    const lineHeight = 20; // approximate for text-sm
    const maxHeight = lineHeight * maxRows;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value, autoResize, maxRows]);

  const handleChange = useCallback(
    (value: string) => {
      onChange(value);

      const cursorPos = textareaRef.current?.selectionStart ?? value.length;
      const textBeforeCursor = value.slice(0, cursorPos);

      // Detect slash commands
      const slashMatch = textBeforeCursor.match(/\/(\w*)$/);
      if (slashMatch && onSlashDetected) {
        onSlashDetected(slashMatch[1]);
        return;
      }

      // Detect mentions
      const mentionMatch = textBeforeCursor.match(/@([\w-]*)$/);
      if (mentionMatch && onMentionDetected) {
        onMentionDetected(mentionMatch[1]);
        return;
      }

      // No match - dismiss menus
      onSlashDismiss?.();
      onMentionDismiss?.();
    },
    [onChange, onSlashDetected, onMentionDetected, onSlashDismiss, onMentionDismiss],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // When menu is open, route navigation keys to the menu
      if (showMenu) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          onMenuNavigate?.('down');
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onMenuNavigate?.('up');
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onMenuSelect?.();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onSlashDismiss?.();
          onMentionDismiss?.();
          return;
        }
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim()) {
          onSubmit();
        }
      }
      if (e.key === 'Escape') {
        onSlashDismiss?.();
        onMentionDismiss?.();
      }
    },
    [value, onSubmit, onSlashDismiss, onMentionDismiss, showMenu, onMenuNavigate, onMenuSelect],
  );

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      aria-label="Message input"
      className={cn(
        'w-full resize-none bg-transparent px-3 py-2 text-sm',
        'placeholder:text-muted-foreground',
        'focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    />
  );
}
