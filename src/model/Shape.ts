import { EditorError } from '../errors/EditorError.ts';
import { Element } from './Element.ts';
import { NumberFormat } from './NumberFormat.ts';
import { StyleAttributes } from './StyleAttributes.ts';

/**
 * Base class of the leaf shapes (`rect`, `circle`, `ellipse`, `line`, `text`).
 *
 * It owns the numeric-attribute arithmetic so that a subclass only declares
 * *which* attributes move and *which* attributes scale — never how the string
 * is parsed or formatted.
 */
export abstract class Shape extends Element {
  /** Geometry attributes this shape accepts through `set` (R-E5). */
  protected abstract geometryNames(): readonly string[];

  override get isGeometric(): boolean {
    return true;
  }

  /** Reads a geometry attribute (missing attributes read as 0). */
  numberOf(name: string): number {
    return NumberFormat.parse(this.raw(name) ?? '0');
  }

  /** Renders a geometry attribute for display, e.g. `w=800`. */
  protected geometryText(name: string): string {
    return NumberFormat.format(this.numberOf(name));
  }

  /**
   * The point a `move` reports back ("moved to (130,100)").
   *
   * Default is the `x`/`y` anchor; shapes based on `cx/cy` or `x1/y1` override it.
   */
  override anchor(): Readonly<{ x: number; y: number }> {
    return { x: this.numberOf('x'), y: this.numberOf('y') };
  }

  protected putNumber(name: string, value: number): void {
    this.put(name, NumberFormat.format(value));
  }

  protected shift(name: string, delta: number): void {
    this.putNumber(name, this.numberOf(name) + delta);
  }

  protected multiply(name: string, factor: number): void {
    this.putNumber(name, this.numberOf(name) * factor);
  }

  /** `fill` (or any style attribute) is shown in the tree when present. */
  protected styleSummary(): string {
    const fill = this.raw('fill');
    return fill === undefined ? '' : `fill=${fill}`;
  }

  override setAttribute(name: string, value: string): void {
    if (StyleAttributes.includes(name)) {
      this.put(name, value);
      return;
    }
    if (this.geometryNames().includes(name)) {
      this.putNumber(name, NumberFormat.parse(value));
      return;
    }
    throw EditorError.unknownAttribute(name);
  }

  override detailLines(): string[] {
    const geometry = this.geometryNames();
    const parts: string[] = [];
    for (const name of geometry) {
      parts.push(`${name}=${this.raw(name) ?? '0'}`);
    }
    const lines: string[] = [];
    if (parts.length > 0) {
      lines.push(parts.join(' '));
    }
    for (const [name, value] of this.attributes()) {
      if (!geometry.includes(name)) {
        lines.push(`${name}=${value}`);
      }
    }
    return lines;
  }

  override walk(visit: (element: Element) => void): void {
    visit(this);
  }
}
