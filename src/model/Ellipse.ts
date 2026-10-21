import { Shape } from './Shape.ts';

/**
 * `<ellipse cx cy rx ry>` — spec §4.1.
 */
export class Ellipse extends Shape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id);
    this.putNumber('cx', cx);
    this.putNumber('cy', cy);
    this.putNumber('rx', rx);
    this.putNumber('ry', ry);
    if (fill !== undefined) {
      this.put('fill', fill);
    }
  }

  override get tagName(): string {
    return 'ellipse';
  }

  protected override geometryNames(): readonly string[] {
    return ['cx', 'cy', 'rx', 'ry'];
  }

  /** `cx=1 cy=2 rx=3 ry=4` (spec §6 tree sample). */
  override summary(): string {
    const parts = [
      `cx=${this.geometryText('cx')}`,
      `cy=${this.geometryText('cy')}`,
      `rx=${this.geometryText('rx')}`,
      `ry=${this.geometryText('ry')}`,
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

  override scaleBy(factor: number): void {
    this.multiply('cx', factor);
    this.multiply('cy', factor);
    this.multiply('rx', factor);
    this.multiply('ry', factor);
  }

  override anchor(): Readonly<{ x: number; y: number }> {
    return { x: this.numberOf('cx'), y: this.numberOf('cy') };
  }
}
