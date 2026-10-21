import assert from 'node:assert/strict';
import { XMLValidator } from 'fast-xml-parser';
import { describe, it } from 'node:test';
import { SvgWriter } from '../../src/io/SvgWriter.ts';
import { Document } from '../../src/model/Document.ts';
import { ForeignElement } from '../../src/model/ForeignElement.ts';
import { Group } from '../../src/model/Group.ts';
import { Rect } from '../../src/model/Rect.ts';
import { Text } from '../../src/model/Text.ts';

const writer = new SvgWriter();

/**
 * Render verification.
 *
 * A headless browser cannot start in the development sandbox (it needs named
 * pipes for its IPC, which the sandbox forbids), so "would a browser show this?"
 * is answered by the next best thing: the produced file must be **well-formed
 * XML** — which is exactly what a browser needs — plus the read/write round trip
 * covered in `tests/io/SvgReader.test.ts`.
 */
describe('written SVG is well-formed XML', () => {
  it('accepts the document of spec §0.1', () => {
    const document = Document.blank(400, 200);
    const flow = new Group('flow');
    flow.append(new Rect('start', 30, 70, 120, 60, '#4a90d9'));
    flow.append(new Text('label', 40, 100, '开始 & <draft>'));
    document.append(flow);

    const result = XMLValidator.validate(writer.write(document));

    assert.equal(result, true);
  });

  it('accepts preserved foreign elements', () => {
    const document = Document.blank();
    const path = new ForeignElement('p1', 'path', new Map([['d', 'M0 0 L10 10']]));
    path.append(new ForeignElement('p2', 'title'));
    document.append(path);

    assert.equal(XMLValidator.validate(writer.write(document)), true);
  });

  it('accepts the checked-in example file', () => {
    const text = new SvgWriter().write(
      (() => {
        const document = Document.blank(10, 10);
        document.append(new Rect('r1', 0, 0, 10, 10));
        return document;
      })(),
    );

    assert.equal(XMLValidator.validate(text), true);
  });
});
