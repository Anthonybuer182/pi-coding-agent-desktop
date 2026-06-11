import { useState, useRef, useCallback, KeyboardEvent, useLayoutEffect, useEffect } from 'react';
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
  /** Called when Ctrl+Enter is pressed while streaming: steer the agent */
  onSteerSubmit?: () => void;
  /** Called when Enter is pressed while streaming: queue a follow-up */
  onFollowUpSubmit?: () => void;
  /** Whether the agent is currently generating a response */
  isStreaming?: boolean;
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
  onSteerSubmit,
  onFollowUpSubmit,
  isStreaming = false,
}: ComposerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Track IME composition state to prevent store updates from fighting CJK input.
  // Using a ref (not state) so we can read it synchronously in onChange.
  const isComposing = useRef(false);

  // Local mirror of the external value. The textarea is always controlled via
  // localValue so the DOM never switches between controlled/uncontrolled – this
  // eliminates the fragile "value={composing ? undefined : value}" pattern that
  // can permanently block input when compositionend is never fired.
  const [localValue, setLocalValue] = useState(value);

  // Sync external value → localValue only when not actively composing.
  // During IME composition the local state holds the intermediate text.
  useEffect(() => {
    if (!isComposing.current) {
      setLocalValue(value);
    }
  }, [value]);

  // Auto-resize — useLayoutEffect runs BEFORE paint, eliminating visual flicker
  useLayoutEffect(() => {
    if (!autoResize || !textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [localValue, autoResize, maxRows]);

  const flushToStore = useCallback(
    (rawValue: string) => {
      onChange(rawValue);

      const cursorPos = textareaRef.current?.selectionStart ?? rawValue.length;
      const textBeforeCursor = rawValue.slice(0, cursorPos);

      // Only detect slash commands when / is at start of input or after whitespace,
      // so paths like "path/to/file" don't accidentally trigger the menu.
      const slashMatch = textBeforeCursor.match(/(?:^|\s)\/(\w*)$/);
      if (slashMatch && onSlashDetected) {
        onSlashDetected(slashMatch[1]);
        return;
      }

      // Only detect mentions when @ is at start of input or after whitespace,
      // so emails like "user@example.com" don't accidentally trigger the menu.
      const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([\w-]*)$/);
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
      // During IME composition (e.g. typing Chinese/Japanese), Enter confirms
      // the candidate character and should NOT be treated as a send/submit.
      if (isComposing.current) return;

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

      // During streaming: Enter = follow-up (default), Ctrl/Cmd+Enter = steer
      if (isStreaming) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (value.trim()) {
            onSteerSubmit?.();
          }
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (value.trim()) {
            onFollowUpSubmit?.();
          }
          return;
        }
        // Escape during streaming aborts
        if (e.key === 'Escape') {
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
    [value, onSubmit, onSlashDismiss, onMentionDismiss, showMenu, onMenuNavigate, onMenuSelect, isStreaming, onSteerSubmit, onFollowUpSubmit],
  );

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      onChange={(e) => {
        const newValue = e.target.value;
        // Always update local state so the textarea always reflects user input.
        setLocalValue(newValue);
        // During IME composition, defer the store update until compositionEnd
        // to avoid React's controlled re-render overwriting the IME candidate text.
        if (!isComposing.current) {
          flushToStore(newValue);
        }
      }}
      onCompositionStart={() => {
        isComposing.current = true;
      }}
      onCompositionEnd={(e) => {
        isComposing.current = false;
        const finalValue = (e.target as HTMLTextAreaElement).value;
        setLocalValue(finalValue);
        flushToStore(finalValue);
      }}
      onBlur={() => {
        // Safety net: if compositionend was never delivered (e.g. user clicked
        // away during an active IME session), reset the flag so the next
        // keystroke isn't permanently blocked.
        if (isComposing.current) {
          isComposing.current = false;
          if (textareaRef.current) {
            flushToStore(textareaRef.current.value);
          }
        }
      }}
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
