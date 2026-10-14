/**
 * Escaping for XML output.
 *
 * SVG is XML, so `&` and `<` may never appear literally in text or attribute
 * values; a label like `R&D <draft>` would otherwise produce a file that no
 * browser can parse.
 */
export class XmlEscape {
  static attribute(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  static text(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }
}
