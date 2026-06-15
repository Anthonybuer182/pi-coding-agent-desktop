import type { ContentBlock } from '@pi/types';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface StreamingState {
  /** Accumulated content blocks in display order. */
  blocks: ContentBlock[];
  /** Index within `blocks` where the current LLM turn's text/thinking began.
   *  Updated by `message_start` events so that multi-turn agent loops don't
   *  mistakenly overwrite blocks from a previous turn. */
  turnStartIdx: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type StreamAction =
  | { type: 'message_start' }
  | { type: 'block'; block: ContentBlock }
  | { type: 'text_delta'; content: string }
  | { type: 'reset' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findLastIndexFrom<T>(
  arr: T[],
  fromIdx: number,
  pred: (item: T) => boolean,
): number {
  for (let i = arr.length - 1; i >= fromIdx; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function initialStreamingState(): StreamingState {
  return { blocks: [], turnStartIdx: 0 };
}

/**
 * Pure reducer that builds streaming content blocks in a way that mirrors the
 * final stored-message structure produced by the session loader
 * (`agentMessageToBlocks` + tool-result merging).
 *
 * Key invariants:
 * - `message_start` marks a new LLM turn. Text/thinking dedup from that point.
 * - Text blocks (full-text) replace the last text block **within the current turn**.
 * - Thinking blocks dedup the same way — only one thinking block per turn.
 * - Tool calls / tool results dedup by `toolCallId` across ALL turns.
 * - Other block types (image, file) dedup by `id`.
 */
export function streamReducer(
  state: StreamingState,
  action: StreamAction,
): StreamingState {
  switch (action.type) {
    // ---------------------------------------------------------------
    case 'reset':
      return initialStreamingState();

    // ---------------------------------------------------------------
    case 'message_start':
      // Mark turn boundary — future text/thinking updates only consider
      // blocks from this index onward, isolating multi-turn agent loops.
      return { ...state, turnStartIdx: state.blocks.length };

    // ---------------------------------------------------------------
    case 'block': {
      const block = action.block;

      // ---- text (full accumulated text, replace current turn's text) ----
      if (block.type === 'text') {
        const idx = findLastIndexFrom(
          state.blocks,
          state.turnStartIdx,
          (b) => b.type === 'text',
        );
        if (idx >= 0) {
          const next = [...state.blocks];
          next[idx] = block;
          return { ...state, blocks: next };
        }
        return { ...state, blocks: [...state.blocks, block] };
      }

      // ---- thinking (replace current turn's thinking) ----
      if (block.type === 'thinking') {
        const idx = findLastIndexFrom(
          state.blocks,
          state.turnStartIdx,
          (b) => b.type === 'thinking',
        );
        if (idx >= 0) {
          const next = [...state.blocks];
          next[idx] = block;
          return { ...state, blocks: next };
        }
        return { ...state, blocks: [...state.blocks, block] };
      }

      // ---- tool_call – dedup by toolCallId across all turns ----
      if (block.type === 'tool_call' && block.toolCallId) {
        const idx = state.blocks.findIndex(
          (b) => b.type === 'tool_call' && (b as ContentBlock & { toolCallId?: string }).toolCallId === block.toolCallId,
        );
        if (idx >= 0) {
          const next = [...state.blocks];
          next[idx] = block;
          return { ...state, blocks: next };
        }
        return { ...state, blocks: [...state.blocks, block] };
      }

      // ---- tool_result – dedup by toolCallId across all turns ----
      if (block.type === 'tool_result' && block.toolCallId) {
        const idx = state.blocks.findIndex(
          (b) => b.type === 'tool_result' && (b as ContentBlock & { toolCallId?: string }).toolCallId === block.toolCallId,
        );
        if (idx >= 0) {
          const next = [...state.blocks];
          next[idx] = block;
          return { ...state, blocks: next };
        }
        return { ...state, blocks: [...state.blocks, block] };
      }

      // ---- image / file / other — simple dedup by block.id ----
      {
        const idx = state.blocks.findIndex((b) => b.id === block.id);
        if (idx >= 0) {
          const next = [...state.blocks];
          next[idx] = block;
          return { ...state, blocks: next };
        }
        return { ...state, blocks: [...state.blocks, block] };
      }
    }

    // ---------------------------------------------------------------
    case 'text_delta':
      // Delta text: append to the last text block in the current turn.
      {
        const delta = action.content;
        const idx = findLastIndexFrom(
          state.blocks,
          state.turnStartIdx,
          (b) => b.type === 'text',
        );
        if (idx >= 0) {
          const next = [...state.blocks];
          next[idx] = {
            ...next[idx],
            content: (next[idx] as ContentBlock & { content: string }).content + delta,
          };
          return { ...state, blocks: next };
        }
        // No existing text block — create one.
        const newBlock = {
          id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'text' as const,
          content: delta,
        };
        return { ...state, blocks: [...state.blocks, newBlock as ContentBlock] };
      }

    default:
      return state;
  }
}
