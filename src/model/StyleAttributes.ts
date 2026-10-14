/**
 * The style attributes every visible element may carry (spec §0.1).
 *
 * Shared by leaf shapes and by containers, because in SVG these properties
 * inherit down the tree — `set g1 fill red` is meaningful for that reason (D9).
 */
export class StyleAttributes {
  static readonly names: readonly string[] = ['fill', 'stroke', 'stroke-width'];

  static includes(name: string): boolean {
    return StyleAttributes.names.includes(name);
  }
}
