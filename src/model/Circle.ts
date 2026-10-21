import { Shape } from './Shape.ts';

/**
 * `<circle cx cy r>` — spec §4.1.
 */
export class Circle extends Shape {
  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id);
    this.putNumber('cx', cx);
    this.putNumber('cy', cy);
    this.putNumber('r', r);
    if (fill !== undefined) {
      this.put('fill', fill);
    }
  }

  override get tagName(): string {
    return 'circle';
  }

  protected override geometryNames(): readonly string[] {
    return ['cx', 'cy', 'r'];
  }

  /** `cx=100 cy=100 r=20 fill=red` (spec §5.1). */
  override summary(): string {
    const parts = [
      `cx=${this.geometryText('cx')}`,
      `cy=${this.geometryText('cy')}`,
      `r=${this.geometryText('r')}`,
    ];
    const style = this.styleSummary();
    if (style !== '') {
      parts.push(style);
    }
    return parts.join(' ');
  }

  override translate(dx: number, dy: number): void {
    this.shift('cx', dx);
    this.shift('cy', dy);
  }

  override anchor(): Readonly<{ x: number; y: number }> {
    return { x: this.numberOf('cx'), y: this.numberOf('cy') };
  }

  override scaleBy(factor: number): void {
    this.multiply('cx', factor);
    this.multiply('cy', factor);
    this.multiply('r', factor);
  }
}
