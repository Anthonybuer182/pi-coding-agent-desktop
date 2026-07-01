/**
 * Extract <think>...</think> tags from text content.
 * Some models (Minimax, DeepSeek-R1) return thinking content as XML tags
 * in the text stream rather than as structured reasoning_content blocks.
 *
 * Returns the extracted thinking content (null if none) and the text
 * with think tags stripped.
 *
 * Handles streaming partials:
 *  - Incomplete <think> (no closing tag): all content treated as thinking
 *  - Complete <think>...</think>: thinking extracted, text cleaned
 *  - No think tag: thinking=null, text=original
 *
 * Shared between the streaming adapter (chat.ts) and the session loader
 * (session.ts) so that live and persisted messages render identically.
 */
export function extractThinkContent(text: string): { thinking: string | null; text: string } {
  // Fast path: no opening tag at all
  if (!text.includes('<think>')) {
    return { thinking: null, text };
  }

  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
  let thinking = '';
  const textParts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = thinkRegex.exec(text)) !== null) {
    // Text before this think block
    textParts.push(text.slice(lastIndex, match.index));
    // Thinking content
    thinking += (thinking ? '\n' : '') + match[1];
    lastIndex = match.index + match[0].length;
  }
  // Remaining text after last think block
  textParts.push(text.slice(lastIndex));

  const cleanText = textParts.join('').trim();
  return {
    thinking: thinking.trim() || null,
    text: cleanText,
  };
}
