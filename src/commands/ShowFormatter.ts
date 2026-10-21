import type { Element } from '../model/Element.ts';

/**
 * Renders one element for the `show` command (spec §5.2):
 *
 * ```
 * circle#c1  parent=g#markers
 *   cx=100 cy=100 r=20
 *   fill=red
 * ```
 *
 * The header carries the parent, because an attribute editor without that
 * context cannot answer "where is this thing?".
 */
export class ShowFormatter {
  format(element: Element): string[] {
    const parent = element.parent;
    const parentLabel = parent === null ? 'svg' : parent.label();
    const lines: string[] = [`${element.label()}  parent=${parentLabel}`];
    for (const line of element.detailLines()) {
      lines.push(`  ${line}`);
    }
    return lines;
  }
}
