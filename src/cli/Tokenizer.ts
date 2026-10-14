import { EditorError } from '../errors/EditorError.ts';

const WHITESPACE = new Set([' ', '\t', '\r']);
const COMMENT_MARKER = '#';
const QUOTE = '"';

/**
 * Splits one input line into command tokens.
 *
 * Rules (spec §2):
 * - a line whose first non-blank character is `#` is a comment → no tokens;
 *   `#` **inside** a line is an ordinary character, so `create rect bg 0 0 800 600 #ffffff`
 *   keeps `#ffffff` as the fill argument;
 * - double quotes group an argument that contains blanks (mainly text content);
 * - a quote that is never closed is a syntax error (D10 / R-ERR15).
 */
export class Tokenizer {
  static tokenize(line: string): string[] {
    const trimmed = line.trimStart();
    if (trimmed === '' || trimmed.startsWith(COMMENT_MARKER)) {
      return [];
    }

    const tokens: string[] = [];
    let current = '';
    let tokenStarted = false;
    let inQuotes = false;

    for (const char of line) {
      if (inQuotes) {
        if (char === QUOTE) {
          inQuotes = false;
        } else {
          current += char;
        }
        continue;
      }

      if (char === QUOTE) {
        inQuotes = true;
        tokenStarted = true;
        continue;
      }

      if (WHITESPACE.has(char)) {
        if (tokenStarted) {
          tokens.push(current);
          current = '';
          tokenStarted = false;
        }
        continue;
      }

      current += char;
      tokenStarted = true;
    }

    if (inQuotes) {
      throw EditorError.unterminatedQuote();
    }
    if (tokenStarted) {
      tokens.push(current);
    }

    return tokens;
  }
}
