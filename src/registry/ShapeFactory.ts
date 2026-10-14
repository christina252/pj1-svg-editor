import type { Element } from '../model/Element.ts';
import { Circle } from '../model/Circle.ts';
import { Ellipse } from '../model/Ellipse.ts';
import { ForeignElement } from '../model/ForeignElement.ts';
import { Group } from '../model/Group.ts';
import { Line } from '../model/Line.ts';
import { NumberFormat } from '../model/NumberFormat.ts';
import { Rect } from '../model/Rect.ts';
import { Text } from '../model/Text.ts';

/** One XML element, as handed over by the loader. */
export interface ParsedShape {
  readonly tag: string;
  readonly id: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly content: string;
  readonly hasElementChildren: boolean;
}

/**
 * The single place where a type name is turned into a class (spec §2.1 — the
 * "shape factory", the second and last allowed dispatch point next to the
 * command registry).
 *
 * Two entry points belong here and only here:
 * - `fromParsed` — a tag name read from a file (`<rect x="0" …/>`), implemented now;
 * - `create` — a type name typed by the user (`create rect r1 0 0 10 10`), added
 *   with the edit commands in stage S4.
 *
 * Anything unknown deliberately becomes a `ForeignElement` instead of an error,
 * so that reading a file never loses content (D8).
 */
export class ShapeFactory {
  /** Type names built into the phase-1 kernel (R-C12). */
  static readonly TYPES: readonly string[] = ['rect', 'circle', 'ellipse', 'line', 'text', 'g'];

  static isKnown(type: string): boolean {
    return ShapeFactory.TYPES.includes(type);
  }

  /**
   * Builds an element from a parsed file element.
   *
   * @throws EditorError never — unknown tags are preserved (D8), but a known
   *         leaf that carries child elements is downgraded to a foreign element
   *         as well (D20), because this editor cannot represent that content.
   */
  fromParsed(shape: ParsedShape): Element {
    if (shape.hasElementChildren && shape.tag !== 'g') {
      return new ForeignElement(shape.id, shape.tag, shape.attributes);
    }

    switch (shape.tag) {
      case 'rect':
        return this.#withExtraAttributes(
          new Rect(
            shape.id,
            this.#number(shape, 'x'),
            this.#number(shape, 'y'),
            this.#number(shape, 'width'),
            this.#number(shape, 'height'),
            shape.attributes.get('fill'),
          ),
          shape,
        );
      case 'circle':
        return this.#withExtraAttributes(
          new Circle(
            shape.id,
            this.#number(shape, 'cx'),
            this.#number(shape, 'cy'),
            this.#number(shape, 'r'),
            shape.attributes.get('fill'),
          ),
          shape,
        );
      case 'ellipse':
        return this.#withExtraAttributes(
          new Ellipse(
            shape.id,
            this.#number(shape, 'cx'),
            this.#number(shape, 'cy'),
            this.#number(shape, 'rx'),
            this.#number(shape, 'ry'),
            shape.attributes.get('fill'),
          ),
          shape,
        );
      case 'line':
        return this.#withExtraAttributes(
          new Line(
            shape.id,
            this.#number(shape, 'x1'),
            this.#number(shape, 'y1'),
            this.#number(shape, 'x2'),
            this.#number(shape, 'y2'),
            shape.attributes.get('stroke'),
          ),
          shape,
        );
      case 'text':
        return this.#withExtraAttributes(
          new Text(shape.id, this.#number(shape, 'x'), this.#number(shape, 'y'), shape.content),
          shape,
        );
      case 'g':
        return this.#withExtraAttributes(new Group(shape.id), shape);
      default:
        return new ForeignElement(shape.id, shape.tag, shape.attributes);
    }
  }

  /** Geometry values read from a file fall back to 0 when absent. */
  #number(shape: ParsedShape, name: string): number {
    const raw = shape.attributes.get(name);
    return raw === undefined || raw === '' ? 0 : NumberFormat.parse(raw);
  }

  /**
   * Keeps every attribute the constructor did not consume — otherwise a
   * round trip through the editor would silently drop `class`, `style`,
   * `data-*`, `rx`, `transform`, … (D8).
   */
  #withExtraAttributes<T extends Element>(element: T, shape: ParsedShape): T {
    for (const [name, value] of shape.attributes) {
      if (name === 'id' || element.attributes().has(name)) {
        continue;
      }
      element.defineAttribute(name, value);
    }
    return element;
  }
}
