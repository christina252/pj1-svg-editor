import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Document } from '../../src/model/Document.ts';
import { Group } from '../../src/model/Group.ts';
import { Rect } from '../../src/model/Rect.ts';

describe('Document — canvas', () => {
  it('defaults to 800x600', () => {
    const document = Document.blank();
    assert.equal(document.size, '800x600');
    assert.equal(document.summary(), '(800x600)');
    assert.equal(document.label(), 'svg');
  });

  it('takes the requested canvas size from init', () => {
    assert.equal(Document.blank(400, 200).size, '400x200');
  });

  it('regenerates the viewBox when the canvas is resized (D17)', () => {
    const document = Document.blank(400, 200);
    document.setViewBox('-10 -10 420 220');
    assert.equal(document.viewBox, '-10 -10 420 220');

    document.resize(800, 600);

    assert.equal(document.size, '800x600');
    assert.equal(document.viewBox, '0 0 800 600');
  });
});

describe('Document — element lookup', () => {
  it('finds elements by id at any depth', () => {
    const document = Document.blank();
    const group = new Group('markers');
    const rect = new Rect('box', 200, 80, 60, 60);
    document.append(group);
    group.append(rect);

    assert.equal(document.find('box'), rect);
    assert.equal(document.find('markers'), group);
    assert.equal(document.find('nope'), undefined);
  });

  it('never returns the root itself (the root is not addressable)', () => {
    const document = Document.blank();
    assert.equal(document.find('svg'), undefined);
    assert.equal(document.find(''), undefined);
  });

  it('counts every element below the root', () => {
    const document = Document.blank();
    const group = new Group('markers');
    document.append(new Rect('bg', 0, 0, 800, 600));
    document.append(group);
    group.append(new Rect('box', 0, 0, 10, 10));

    assert.equal(document.elementCount(), 3);
  });
});

describe('Document — automatic ids (R-C4)', () => {
  it('names an unnamed rect rect1', () => {
    assert.equal(Document.blank().nextFreeId('rect'), 'rect1');
  });

  it('skips numbers that are already taken', () => {
    const document = Document.blank();
    document.append(new Rect('rect1', 0, 0, 1, 1));
    document.append(new Rect('rect3', 0, 0, 1, 1));

    assert.equal(document.nextFreeId('rect'), 'rect2');
  });

  it('numbers each tag independently', () => {
    const document = Document.blank();
    document.append(new Rect('rect1', 0, 0, 1, 1));

    assert.equal(document.nextFreeId('circle'), 'circle1');
  });
});

describe('Document — source path', () => {
  it('remembers where the document came from', () => {
    const document = Document.blank();
    assert.equal(document.sourcePath, null);

    document.setSourcePath('other.svg');

    assert.equal(document.sourcePath, 'other.svg');
  });
});
