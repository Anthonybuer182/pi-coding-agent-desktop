import React from 'react';

/**
 * Regex to match /command and @mention tokens.
 * Only matches at word boundaries (start of string or after whitespace).
 * The capturing group includes leading whitespace so split() preserves spacing.
 */
const TOKEN_PATTERN = /((?:^|\s)(?:\/[a-zA-Z][\w-]*|@[^\s]+))/g;

/**
 * Check whether a string segment looks like a token
 * (starts with optional whitespace followed by / or @).
 */
function isToken(text: string): boolean {
  return /^(?:\s*)(?:\/[a-zA-Z][\w-]*|@[^\s]+)$/.test(text);
}

/**
 * Render plain text with /command and @mention tokens highlighted as styled badges.
 * Leading whitespace is rendered outside the badge for clean visuals.
 * Returns an array of alternating text fragments and styled spans.
 */
export function renderTokenizedText(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts = text.split(TOKEN_PATTERN);

  return parts
    .filter((part) => part !== '')
    .map((part, i) => {
      if (isToken(part)) {
        const trimmed = part.trimStart();
        const leadingSpace = part.slice(0, part.length - trimmed.length);
        const isSlash = trimmed.startsWith('/');
        const className = isSlash ? 'token-slash' : 'token-mention';
        return (
          <React.Fragment key={i}>
            {leadingSpace}
            <span className={className}>{trimmed}</span>
          </React.Fragment>
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
}
