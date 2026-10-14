import { EditorError } from '../errors/EditorError.ts';

/**
 * Number formatting for geometry attributes.
 *
 * SVG coordinates are plain decimals, so results are rounded to six decimals
 * before being written out (D15): a scale like 1.1 then prints `110`, not
 * `110.00000000000001`, and undo comparisons stay stable.
 */
export class NumberFormat {
  static readonly #DECIMALS = 6;

  /** Parses a numeric argument; anything else is a user error (R-ERR17). */
  static parse(text: string): number {
    const value = Number(text);
    if (text.trim() === '' || !Number.isFinite(value)) {
      throw EditorError.invalidNumber(text);
    }
    return value;
  }

  /** Renders a number the way it should appear in an SVG attribute. */
  static format(value: number): string {
    if (!Number.isFinite(value)) {
      throw EditorError.invalidNumber(String(value));
    }
    return String(Number(value.toFixed(NumberFormat.#DECIMALS)));
  }
}
