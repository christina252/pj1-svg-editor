import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SvgReader } from '../../src/io/SvgReader.ts';
import { SvgWriter } from '../../src/io/SvgWriter.ts';
import { ForeignElement } from '../../src/model/ForeignElement.ts';
import { Group } from '../../src/model/Group.ts';
import { Rect } from '../../src/model/Rect.ts';
import { Text } from '../../src/model/Text.ts';
import type { Document } from '../../src/model/Document.ts';

const reader = new SvgReader();
const writer = new SvgWriter();

/** The example file of spec §6: one element has no id. */
const OTHER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
  <text id="t1" x="10" y="290">imported</text>
  <circle id="c1" cx="50" cy="50" r="10"/>
  <g id="g1">
    <rect id="r2" x="0" y="0" width="10" height="10"/>
    <circle id="c2" cx="5" cy="5" r="2"/>
  </g>
  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>
</svg>
`;

describe('SvgReader — the example file of spec §6', () => {
  it('reads the canvas size and the viewBox', () => {
    const { document } = reader.read(OTHER_SVG, 'other.svg');

    assert.equal(document.size, '400x300');
    assert.equal(document.viewBox, '0 0 400 300');
  });

  it('assigns an id to the unnamed rect and warns, exactly as the specification shows', () => {
    const { warnings } = reader.read(OTHER_SVG, 'other.svg');

    assert.deepEqual(warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  });

  it('builds the documented tree of seven elements', () => {
    const { document } = reader.read(OTHER_SVG, 'other.svg');

    assert.equal(document.elementCount(), 7);
    assert.deepEqual(
      document.children.map((child) => child.label()),
      ['rect#rect1', 'text#t1', 'circle#c1', 'g#g1', 'ellipse#e1'],
    );
    const group = document.find('g1');
    assert.ok(group instanceof Group);
    assert.deepEqual(group.children.map((child) => child.label()), ['rect#r2', 'circle#c2']);
  });

  it('keeps the text content of a text element', () => {
    const { document } = reader.read(OTHER_SVG, 'other.svg');

    const text = document.find('t1');
    assert.ok(text instanceof Text);
    assert.equal(text.content, 'imported');
    assert.equal(text.summary(), '(10,290) "imported"');
  });
});

describe('SvgReader — robustness', () => {
  it('keeps unknown elements with their attributes and subtree (D8)', () => {
    const { document } = reader.read(
      `<svg width="100" height="100"><defs><path id="p1" d="M0 0 L10 10"/></defs></svg>`,
      'a.svg',
    );

    const defs = document.find('defs1');
    assert.ok(defs instanceof ForeignElement);
    assert.equal(defs.tagName, 'defs');
    assert.equal(defs.summary(), '(foreign)');
    assert.equal(defs.children[0]?.tagName, 'path');
    assert.equal(defs.children[0]?.id, 'p1');
  });

  it('keeps attributes the model does not use', () => {
    const { document } = reader.read(
      `<svg width="10" height="10"><rect id="r1" x="1" y="2" width="3" height="4" class="box" data-kind="box"/></svg>`,
      'a.svg',
    );

    const rect = document.find('r1');
    assert.ok(rect instanceof Rect);
    assert.equal(rect.attributes().get('class'), 'box');
    assert.equal(rect.attributes().get('data-kind'), 'box');
  });

  it('renames a duplicate id and warns (D21)', () => {
    const { document, warnings } = reader.read(
      `<svg width="10" height="10"><rect id="r1" x="0" y="0" width="1" height="1"/><rect id="r1" x="0" y="0" width="1" height="1"/></svg>`,
      'a.svg',
    );

    assert.deepEqual(warnings, ['warning: id r1 already exists, assigned rect1 to <rect>']);
    assert.deepEqual(document.children.map((child) => child.id), ['r1', 'rect1']);
  });

  it('downgrades a text element with child elements to a preserved element (D20)', () => {
    const { document } = reader.read(
      `<svg width="10" height="10"><text id="t1" x="0" y="0">a<tspan>b</tspan></text></svg>`,
      'a.svg',
    );

    const text = document.find('t1');
    assert.ok(text instanceof ForeignElement);
    assert.equal(text.children[0]?.tagName, 'tspan');
  });

  it('falls back to the default canvas size for sizes without a pixel equivalent', () => {
    const missing = reader.read('<svg><rect id="r1" x="0" y="0" width="1" height="1"/></svg>', 'a.svg');
    assert.equal(missing.document.size, '800x600');

    const pixels = reader.read('<svg width="400px" height="300px"></svg>', 'a.svg');
    assert.equal(pixels.document.size, '400x300');
  });

  it('writes a percentage size back unchanged instead of turning it into a number (D22)', () => {
    const source = '<svg width="100%" height="50%"></svg>';
    const { document } = reader.read(source, 'a.svg');

    assert.equal(document.size, '800x600', 'no pixel equivalent without a viewport');
    assert.match(writer.write(document), /width="100%" height="50%"/);
  });

  it('reports a file that is not an SVG document (R-ERR23)', () => {
    assert.throws(() => reader.read('<html><body/></html>', 'a.svg'), /invalid svg file: a\.svg/);
    assert.throws(() => reader.read('not xml at all', 'a.svg'), /invalid svg file: a\.svg/);
  });
});

describe('SvgReader — round trip', () => {
  it('reads back what the writer produced', () => {
    const { document } = reader.read(OTHER_SVG, 'other.svg');
    const text = writer.write(document);
    const reloaded: Document = reader.read(text, 'other.svg').document;

    assert.equal(reloaded.size, document.size);
    assert.equal(reloaded.elementCount(), document.elementCount());
    assert.equal(writer.write(reloaded), text);
  });
});
