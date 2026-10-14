import { XMLParser } from 'fast-xml-parser';
import { EditorError } from '../errors/EditorError.ts';
import { XmlElement } from './XmlElement.ts';

/** Attribute names live under this key in the intermediate object. */
const ATTRIBUTE_GROUP = '@';
const TEXT_KEY = '#text';

/**
 * The only place that knows about the XML library (D1).
 *
 * Everything else in the project works with `XmlElement`, so replacing
 * `fast-xml-parser` means rewriting this single file.
 */
export class XmlParser {
  readonly #parser: XMLParser;

  constructor() {
    this.#parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      attributesGroupName: ATTRIBUTE_GROUP,
      parseAttributeValue: false,
      parseTagValue: false,
      trimValues: true,
      ignoreDeclaration: true,
      ignorePiTags: true,
      isArray: (tagName) => tagName !== ATTRIBUTE_GROUP,
    });
  }

  /** Parses a whole document and returns its root element. */
  parse(text: string, path: string): XmlElement {
    let raw: unknown;
    try {
      raw = this.#parser.parse(text);
    } catch {
      throw EditorError.invalidSvgFile(path);
    }
    if (raw === null || typeof raw !== 'object') {
      throw EditorError.invalidSvgFile(path);
    }
    for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
      if (name.startsWith('?') || name.startsWith('#')) {
        continue;
      }
      return this.#toElement(name, value);
    }
    throw EditorError.invalidSvgFile(path);
  }

  #toElement(name: string, node: unknown): XmlElement {
    const record = XmlParser.#asRecord(node);
    const attributes = new Map<string, string>();
    const attributesNode = record[ATTRIBUTE_GROUP];
    if (attributesNode !== undefined) {
      for (const [key, value] of Object.entries(XmlParser.#asRecord(attributesNode))) {
        attributes.set(key, String(value));
      }
    }

    const children: XmlElement[] = [];
    let text = '';
    for (const [key, value] of Object.entries(record)) {
      if (key === ATTRIBUTE_GROUP) {
        continue;
      }
      if (key === TEXT_KEY) {
        text += String(value);
        continue;
      }
      if (key.startsWith('#')) {
        continue; // comments, CDATA markers, …
      }
      for (const child of Array.isArray(value) ? value : [value]) {
        children.push(this.#toElement(key, child));
      }
    }

    return new XmlElement(name, attributes, children, text);
  }

  static #asRecord(node: unknown): Record<string, unknown> {
    if (Array.isArray(node)) {
      return XmlParser.#asRecord(node[0]);
    }
    if (node === null || typeof node !== 'object') {
      return {};
    }
    return node as Record<string, unknown>;
  }
}
