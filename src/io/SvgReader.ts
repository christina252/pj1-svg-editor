import { EditorError } from '../errors/EditorError.ts';
import type { Element } from '../model/Element.ts';
import { Document } from '../model/Document.ts';
import type { Container } from '../model/Container.ts';
import type { ParsedShape } from '../factory/ShapeFactory.ts';
import { ShapeFactory } from '../factory/ShapeFactory.ts';
import type { LoadedDocument } from '../ports/LoadedDocument.ts';
import type { XmlElement } from './XmlElement.ts';
import { XmlParser } from './XmlParser.ts';

/**
 * Turns SVG text into a document tree.
 *
 * Behaviour that matters for round-tripping:
 * - elements without an `id` get one, with a warning (R-C4);
 * - a duplicate `id` is renamed with a warning as well (D21) — the model keeps
 *   ids unique at all times;
 * - tags this phase does not model, and known tags carrying unsupported child
 *   elements, are preserved as `ForeignElement` (D8, D20);
 * - attributes the model does not use survive (D8).
 */
export class SvgReader {
  readonly #parser: XmlParser;
  readonly #factory: ShapeFactory;

  constructor(parser: XmlParser = new XmlParser(), factory: ShapeFactory = new ShapeFactory()) {
    this.#parser = parser;
    this.#factory = factory;
  }

  read(text: string, path: string): LoadedDocument {
    const root = this.#parser.parse(text, path);
    if (root.name !== 'svg') {
      throw EditorError.invalidSvgFile(path);
    }

    const document = Document.blank(this.#size(root, 'width'), this.#size(root, 'height'));
    document.setRawSize(root.attributes.get('width') ?? null, root.attributes.get('height') ?? null);
    const viewBox = root.attributes.get('viewBox');
    if (viewBox !== undefined && viewBox !== '') {
      document.setViewBox(viewBox);
    }

    const warnings: string[] = [];
    this.#loadChildren(root, document, document, warnings);
    return { document, warnings };
  }

  #loadChildren(xml: XmlElement, parent: Container, document: Document, warnings: string[]): void {
    for (const child of xml.children) {
      parent.append(this.#buildElement(child, document, warnings));
    }
  }

  #buildElement(xml: XmlElement, document: Document, warnings: string[]): Element {
    const shape: ParsedShape = {
      tag: xml.name,
      id: this.#resolveId(xml, document, warnings),
      attributes: SvgReader.#withoutId(xml.attributes),
      content: xml.text,
      hasElementChildren: xml.children.length > 0,
    };

    const element = this.#factory.fromParsed(shape);
    for (const child of xml.children) {
      element.adopt(this.#buildElement(child, document, warnings));
    }
    return element;
  }

  #resolveId(xml: XmlElement, document: Document, warnings: string[]): string {
    const declared = xml.attributes.get('id');
    if (declared === undefined || declared === '') {
      const assigned = document.nextFreeId(xml.name);
      warnings.push(`warning: assigned id ${assigned} to unnamed <${xml.name}>`);
      return assigned;
    }
    if (document.hasId(declared)) {
      const assigned = document.nextFreeId(xml.name);
      warnings.push(`warning: id ${declared} already exists, assigned ${assigned} to <${xml.name}>`);
      return assigned;
    }
    return declared;
  }

  /**
   * Canvas sizes are read leniently but predictably: `400` and `400px` are
   * pixels, anything else (`100%`, `10em`) has no pixel equivalent without a
   * viewport and falls back to the default — while the original text is still
   * written back unchanged (D22).
   */
  #size(root: XmlElement, name: 'width' | 'height'): number {
    const fallback = name === 'width' ? Document.DEFAULT_WIDTH : Document.DEFAULT_HEIGHT;
    const raw = root.attributes.get(name);
    if (raw === undefined) {
      return fallback;
    }
    const text = raw.endsWith('px') ? raw.slice(0, -2) : raw;
    const value = Number(text);
    return text.trim() !== '' && Number.isFinite(value) ? value : fallback;
  }

  static #withoutId(attributes: ReadonlyMap<string, string>): ReadonlyMap<string, string> {
    const copy = new Map(attributes);
    copy.delete('id');
    return copy;
  }
}
