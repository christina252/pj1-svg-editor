import type { Element } from '../model/Element.ts';

/**
 * Renders the document tree for the `tree` command (spec §5.1).
 *
 * Format rules (D4 — the samples in the specification are not internally
 * consistent, so the rule is ours and stays deterministic):
 * - one line per element: `label` + inline attributes;
 * - box drawing: `├── ` / `└── ` for siblings, `│   ` / `    ` for ancestors;
 * - the label column of one sibling list is padded to *its* longest label + 2,
 *   so every list is aligned within itself and never grows a global column;
 * - a container without attributes prints its label only (no trailing blanks).
 */
export class TreeFormatter {
  format(root: Element): string[] {
    const summary = root.summary();
    const lines: string[] = [summary === '' ? root.label() : `${root.label()} ${summary}`];
    this.#appendChildren(root, '', lines);
    return lines;
  }

  #appendChildren(parent: Element, prefix: string, lines: string[]): void {
    const children = parent.children;
    if (children.length === 0) {
      return;
    }
    const width = Math.max(...children.map((child) => child.label().length)) + 2;

    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const summary = child.summary();
      const text = summary === '' ? child.label() : `${child.label().padEnd(width)}${summary}`;
      lines.push(`${prefix}${connector}${text}`);
      this.#appendChildren(child, `${prefix}${isLast ? '    ' : '│   '}`, lines);
    });
  }
}
