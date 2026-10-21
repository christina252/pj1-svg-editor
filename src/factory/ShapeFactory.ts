import { EditorError } from '../errors/EditorError.ts';
import { Circle } from '../model/Circle.ts';
import type { Element } from '../model/Element.ts';
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
 * The single place where a type name becomes a class — the "shape factory"
 * allowed by spec §2.1 next to the command registry.
 *
 * Two entry points live here and only here:
 * - `create` — a type name typed by the user (`create rect r1 0 0 10 10` + `in`),
 * - `fromParsed` — a tag name read from a file (`<rect x="0" …/>`).
 *
 * Anything unknown becomes a `ForeignElement` when reading (content must never
 * be lost, D8) and an `unknown shape type` error when creating (the user asked
 * for something this kernel cannot do, R-ERR5).
 *
 * Why its own module: both the command layer and the reader need it, while
 * `registry/` depends on `commands/` (it stores command instances) and must not
 * be imported back by them. A dedicated, dependency-light module keeps the
 * dependency graph acyclic — see doc/README.md §3.
 */
export class ShapeFactory {
  /** Type names built into the phase-1 kernel (R-C12). */
  static readonly TYPES: readonly string[] = ['rect', 'circle', 'ellipse', 'line', 'text', 'g'];

  /** Usage text per type, used by `create`'s arity errors (R-ERR14). */
  static readonly SYNTAX: Readonly<Record<string, string>> = {
    rect: 'create rect <id> <x> <y> <w> <h> [fill]',
    circle: 'create circle <id> <cx> <cy> <r> [fill]',
    ellipse: 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]',
    line: 'create line <id> <x1> <y1> <x2> <y2> [stroke]',
    text: 'create text <id> <x> <y> "content"',
    g: 'create g <id>',
  };

  static isKnown(type: string): boolean {
    return ShapeFactory.TYPES.includes(type);
  }

  /** `create <type> <id> <params…>` — spec §4.1. */
  create(type: string, id: string, params: readonly string[]): Element {
    switch (type) {
      case 'rect':
        ShapeFactory.#requireArity(type, params, 4, true);
        return new Rect(
          id,
          ShapeFactory.#number(params, 0),
          ShapeFactory.#number(params, 1),
          ShapeFactory.#number(params, 2),
          ShapeFactory.#number(params, 3),
          params[4],
        );
      case 'circle':
        ShapeFactory.#requireArity(type, params, 3, true);
        return new Circle(
          id,
          ShapeFactory.#number(params, 0),
          ShapeFactory.#number(params, 1),
          ShapeFactory.#number(params, 2),
          params[3],
        );
      case 'ellipse':
        ShapeFactory.#requireArity(type, params, 4, true);
        return new Ellipse(
          id,
          ShapeFactory.#number(params, 0),
          ShapeFactory.#number(params, 1),
          ShapeFactory.#number(params, 2),
          ShapeFactory.#number(params, 3),
          params[4],
        );
      case 'line':
        ShapeFactory.#requireArity(type, params, 4, true);
        return new Line(
          id,
          ShapeFactory.#number(params, 0),
          ShapeFactory.#number(params, 1),
          ShapeFactory.#number(params, 2),
          ShapeFactory.#number(params, 3),
          params[4],
        );
      case 'text':
        ShapeFactory.#requireArity(type, params, 3, false);
        return new Text(
          id,
          ShapeFactory.#number(params, 0),
          ShapeFactory.#number(params, 1),
          params[2] ?? '',
        );
      case 'g':
        ShapeFactory.#requireArity(type, params, 0, false);
        return new Group(id);
      default:
        throw EditorError.unknownShapeType(type);
    }
  }

  /**
   * Builds an element from a parsed file element.
   *
   * A known leaf that carries child elements is downgraded to a foreign element
   * (D20), because this editor cannot represent that content and must not drop
   * it.
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
            this.#attributeNumber(shape, 'x'),
            this.#attributeNumber(shape, 'y'),
            this.#attributeNumber(shape, 'width'),
            this.#attributeNumber(shape, 'height'),
            shape.attributes.get('fill'),
          ),
          shape,
        );
      case 'circle':
        return this.#withExtraAttributes(
          new Circle(
            shape.id,
            this.#attributeNumber(shape, 'cx'),
            this.#attributeNumber(shape, 'cy'),
            this.#attributeNumber(shape, 'r'),
            shape.attributes.get('fill'),
          ),
          shape,
        );
      case 'ellipse':
        return this.#withExtraAttributes(
          new Ellipse(
            shape.id,
            this.#attributeNumber(shape, 'cx'),
            this.#attributeNumber(shape, 'cy'),
            this.#attributeNumber(shape, 'rx'),
            this.#attributeNumber(shape, 'ry'),
            shape.attributes.get('fill'),
          ),
          shape,
        );
      case 'line':
        return this.#withExtraAttributes(
          new Line(
            shape.id,
            this.#attributeNumber(shape, 'x1'),
            this.#attributeNumber(shape, 'y1'),
            this.#attributeNumber(shape, 'x2'),
            this.#attributeNumber(shape, 'y2'),
            shape.attributes.get('stroke'),
          ),
          shape,
        );
      case 'text':
        return this.#withExtraAttributes(
          new Text(
            shape.id,
            this.#attributeNumber(shape, 'x'),
            this.#attributeNumber(shape, 'y'),
            shape.content,
          ),
          shape,
        );
      case 'g':
        return this.#withExtraAttributes(new Group(shape.id), shape);
      default:
        return new ForeignElement(shape.id, shape.tag, shape.attributes);
    }
  }

  /** A type with `count` required numbers and one optional trailing colour. */
  static #requireArity(type: string, params: readonly string[], count: number, optionalTail: boolean): void {
    const max = count + (optionalTail ? 1 : 0);
    if (params.length < count || params.length > max) {
      throw EditorError.usage(ShapeFactory.SYNTAX[type] ?? `create ${type}`);
    }
  }

  static #number(params: readonly string[], index: number): number {
    return NumberFormat.parse(params[index] ?? '');
  }

  /** Geometry values read from a file fall back to 0 when absent. */
  #attributeNumber(shape: ParsedShape, name: string): number {
    const raw = shape.attributes.get(name);
    return raw === undefined || raw === '' ? 0 : NumberFormat.parse(raw);
  }

  /**
   * Keeps every attribute the constructor did not consume — otherwise a round
   * trip through the editor would silently drop `class`, `style`, `data-*`,
   * `rx`, `transform`, … (D8).
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
