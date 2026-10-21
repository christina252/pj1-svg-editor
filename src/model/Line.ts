import { Shape } from './Shape.ts';

/**
 * `<line x1 y1 x2 y2>` — spec §4.1.
 *
 * Both end points are geometry, so a scale multiplies all four values: the
 * line stays anchored to the canvas origin, exactly like the other shapes (R-E4).
 */
export class Line extends Shape {
  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id);
    this.putNumber('x1', x1);
    this.putNumber('y1', y1);
    this.putNumber('x2', x2);
    this.putNumber('y2', y2);
    if (stroke !== undefined) {
      this.put('stroke', stroke);
    }
  }

  override get tagName(): string {
    return 'line';
  }

  protected override geometryNames(): readonly string[] {
    return ['x1', 'y1', 'x2', 'y2'];
  }

  /** `(280,130) -> (520,130)` (spec §6.1). */
  override summary(): string {
    return `(${this.geometryText('x1')},${this.geometryText('y1')}) -> (${this.geometryText('x2')},${this.geometryText('y2')})`;
  }

  override translate(dx: number, dy: number): void {
    this.shift('x1', dx);
    this.shift('y1', dy);
    this.shift('x2', dx);
    this.shift('y2', dy);
  }

  override scaleBy(factor: number): void {
    this.multiply('x1', factor);
    this.multiply('y1', factor);
    this.multiply('x2', factor);
    this.multiply('y2', factor);
  }

  override anchor(): Readonly<{ x: number; y: number }> {
    return { x: this.numberOf('x1'), y: this.numberOf('y1') };
  }
}
