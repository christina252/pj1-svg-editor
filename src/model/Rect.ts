import { Shape } from './Shape.ts';

/**
 * `<rect x y width height>` — spec §0.1 / §4.1.
 */
export class Rect extends Shape {
  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string) {
    super(id);
    this.putNumber('x', x);
    this.putNumber('y', y);
    this.putNumber('width', width);
    this.putNumber('height', height);
    if (fill !== undefined) {
      this.put('fill', fill);
    }
  }

  override get tagName(): string {
    return 'rect';
  }

  protected override geometryNames(): readonly string[] {
    return ['x', 'y', 'width', 'height'];
  }

  /** `x=0 y=0 w=800 h=600 fill=#ffffff` (spec §5.1 — short names for the tree). */
  override summary(): string {
    const parts = [
      `x=${this.geometryText('x')}`,
      `y=${this.geometryText('y')}`,
      `w=${this.geometryText('width')}`,
      `h=${this.geometryText('height')}`,
    ];
    const style = this.styleSummary();
    if (style !== '') {
      parts.push(style);
    }
    return parts.join(' ');
  }

  override translate(dx: number, dy: number): void {
    this.shift('x', dx);
    this.shift('y', dy);
  }

  override scaleBy(factor: number): void {
    this.multiply('x', factor);
    this.multiply('y', factor);
    this.multiply('width', factor);
    this.multiply('height', factor);
  }
}
