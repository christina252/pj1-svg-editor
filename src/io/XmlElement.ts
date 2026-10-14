/** One element of a parsed XML file, with the details the loader needs. */
export class XmlElement {
  readonly name: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly children: readonly XmlElement[];
  readonly text: string;

  constructor(
    name: string,
    attributes: ReadonlyMap<string, string>,
    children: readonly XmlElement[],
    text: string,
  ) {
    this.name = name;
    this.attributes = attributes;
    this.children = children;
    this.text = text;
  }
}
