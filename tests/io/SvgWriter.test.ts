import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SvgWriter } from '../../src/io/SvgWriter.ts';
import { Document } from '../../src/model/Document.ts';
import { ForeignElement } from '../../src/model/ForeignElement.ts';
import { Group } from '../../src/model/Group.ts';
import { Line } from '../../src/model/Line.ts';
import { Rect } from '../../src/model/Rect.ts';
import { Text } from '../../src/model/Text.ts';

const writer = new SvgWriter();

describe('SvgWriter — the sample file of spec §0.1', () => {
  it('reproduces the documented flow-chart fragment byte for byte', () => {
    const document = Document.blank(400, 200);
    const flow = new Group('flow');
    flow.append(new Rect('start', 30, 70, 120, 60, '#4a90d9'));
    flow.append(new Line('edge', 150, 100, 250, 100, 'black'));
    flow.append(new Rect('end', 250, 70, 120, 60, '#f5a623'));
    document.append(flow);

    assert.equal(
      writer.write(document),
      `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <g id="flow">
    <rect id="start" x="30" y="70" width="120" height="60" fill="#4a90d9"/>
    <line id="edge" x1="150" y1="100" x2="250" y2="100" stroke="black"/>
    <rect id="end" x="250" y="70" width="120" height="60" fill="#f5a623"/>
  </g>
</svg>
`,
    );
  });
});

describe('SvgWriter — element forms', () => {
  it('writes an empty container self-closing, as spec §4.1 shows for `create g`', () => {
    const document = Document.blank();
    document.append(new Group('scene'));

    assert.match(writer.write(document), /\n {2}<g id="scene"\/>\n/);
  });

  it('writes the label of a text element as its content, not as an attribute', () => {
    const document = Document.blank();
    document.append(new Text('title', 20, 40, 'My Diagram'));

    assert.match(writer.write(document), /\n {2}<text id="title" x="20" y="40">My Diagram<\/text>\n/);
  });

  it('keeps UTF-8 labels readable', () => {
    const document = Document.blank();
    document.append(new Text('t1', 155, 135, '开始'));

    assert.match(writer.write(document), />开始<\/text>/);
  });

  it('uses the canvas size and the viewBox of the document', () => {
    const document = Document.blank(800, 600);
    document.setViewBox('-10 -10 820 620');

    assert.match(
      writer.write(document),
      /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="800" height="600" viewBox="-10 -10 820 620">/,
    );
  });
});

describe('SvgWriter — escaping', () => {
  it('escapes markup characters in a label', () => {
    const document = Document.blank();
    document.append(new Text('t1', 0, 0, 'R&D <draft>'));

    assert.match(writer.write(document), />R&amp;D &lt;draft&gt;<\/text>/);
  });

  it('escapes quotes in attribute values', () => {
    const document = Document.blank();
    const rect = new Rect('r1', 0, 0, 10, 10);
    rect.defineAttribute('data-note', 'say "hi"');
    document.append(rect);

    assert.match(writer.write(document), /data-note="say &quot;hi&quot;"/);
  });
});

describe('SvgWriter — foreign elements (D8)', () => {
  it('writes a preserved element with its tag, attributes and subtree', () => {
    const document = Document.blank();
    const path = new ForeignElement('p1', 'path', new Map([['d', 'M0 0 L10 10']]));
    path.append(new ForeignElement('p2', 'title'));
    document.append(path);

    assert.equal(
      writer.write(document),
      `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <path id="p1" d="M0 0 L10 10">
    <title id="p2"/>
  </path>
</svg>
`,
    );
  });
});
