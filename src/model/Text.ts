import { Shape } from './Shape.ts';

/**
 * `<text x y>content</text>` — spec §0.1: the label is the element's *text
 * content*, not an attribute, so it is stored apart from the attribute map.
 *
 * `set t1 text "..."` writes the content (`text` is the specified attribute
 * name for it, spec §4.1); `set t1 x 20` still moves the anchor.
 */
export class Text extends Shape {
  #content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.putNumber('x', x);
    this.putNumber('y', y);
    this.#content = content;
  }

  override get tagName(): string {
    return 'text';
  }

  /** The element's text content. */
  get content(): string {
    return this.#content;
  }

  protected override geometryNames(): readonly string[] {
    return ['x', 'y'];
  }

  /** `(20,40) "My Diagram"` (spec §5.1). */
  override summary(): string {
    return `(${this.geometryText('x')},${this.geometryText('y')}) "${this.#content}"`;
  }

  override detailLines(): string[] {
    const lines = super.detailLines();
    lines.push(`text="${this.#content}"`);
    return lines;
  }

  override translate(dx: number, dy: number): void {
    this.shift('x', dx);
    this.shift('y', dy);
  }

  override scaleBy(factor: number): void {
    this.multiply('x', factor);
    this.multiply('y', factor);
  }

  override setAttribute(name: string, value: string): void {
    if (name === 'text') {
      this.#content = value;
      return;
    }
    super.setAttribute(name, value);
  }
}
