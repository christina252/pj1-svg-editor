import type { Document } from '../model/Document.ts';
import type { Element } from '../model/Element.ts';
import { NumberFormat } from '../model/NumberFormat.ts';
import { XmlEscape } from './XmlEscape.ts';

/**
 * Serialises the document tree to SVG text.
 *
 * The output is meant to be opened directly in a browser (spec §0.2), so it
 * carries the XML declaration and the SVG namespace, uses two-space indentation
 * and writes `id` before every other attribute.
 *
 * The writer only asks the elements for `tagName`, `attributes()`, `children`
 * and `textContent()` — it contains no `instanceof`/`switch`, so a new shape
 * class becomes writable without touching this file.
 */
export class SvgWriter {
  static readonly INDENT = '  ';
  static readonly XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
  static readonly SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

  write(document: Document): string {
    const lines: string[] = [SvgWriter.XML_DECLARATION, this.#rootTag(document)];
    for (const child of document.children) {
      this.#writeElement(child, 1, lines);
    }
    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }

  #rootTag(document: Document): string {
    const width = NumberFormat.format(document.width);
    const height = NumberFormat.format(document.height);
    return `<svg xmlns="${SvgWriter.SVG_NAMESPACE}" width="${width}" height="${height}" viewBox="${XmlEscape.attribute(document.viewBox)}">`;
  }

  #writeElement(element: Element, depth: number, lines: string[]): void {
    const indent = SvgWriter.INDENT.repeat(depth);
    const tag = element.tagName;
    const attributes = this.#attributesOf(element);
    const children = element.children;
    const content = element.textContent();

    if (children.length === 0 && content === '') {
      lines.push(`${indent}<${tag}${attributes}/>`);
      return;
    }
    if (children.length === 0) {
      lines.push(`${indent}<${tag}${attributes}>${XmlEscape.text(content)}</${tag}>`);
      return;
    }

    lines.push(`${indent}<${tag}${attributes}>`);
    for (const child of children) {
      this.#writeElement(child, depth + 1, lines);
    }
    lines.push(`${indent}</${tag}>`);
  }

  #attributesOf(element: Element): string {
    const parts: string[] = [];
    if (element.id !== '') {
      parts.push(`id="${XmlEscape.attribute(element.id)}"`);
    }
    for (const [name, value] of element.attributes()) {
      parts.push(`${name}="${XmlEscape.attribute(value)}"`);
    }
    return parts.length === 0 ? '' : ` ${parts.join(' ')}`;
  }
}
