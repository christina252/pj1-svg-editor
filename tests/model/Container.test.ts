import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EditorError } from '../../src/errors/EditorError.ts';
import { ForeignElement } from '../../src/model/ForeignElement.ts';
import { Group } from '../../src/model/Group.ts';
import { Rect } from '../../src/model/Rect.ts';

describe('Container — child list', () => {
  it('appends children in order and links them to their parent', () => {
    const group = new Group('g1');
    const a = new Rect('a', 0, 0, 1, 1);
    const b = new Rect('b', 0, 0, 1, 1);
    group.append(a);
    group.append(b);

    assert.deepEqual(group.children.map((child) => child.id), ['a', 'b']);
    assert.equal(a.parent, group);
  });

  it('inserts at a given index', () => {
    const group = new Group('g1');
    const a = new Rect('a', 0, 0, 1, 1);
    const b = new Rect('b', 0, 0, 1, 1);
    const c = new Rect('c', 0, 0, 1, 1);
    group.append(a);
    group.append(c);
    group.insertAt(1, b);

    assert.deepEqual(group.children.map((child) => child.id), ['a', 'b', 'c']);
  });

  it('detaches a child from its previous parent when it is inserted elsewhere', () => {
    const first = new Group('g1');
    const second = new Group('g2');
    const rect = new Rect('r1', 0, 0, 1, 1);
    first.append(rect);

    second.append(rect);

    assert.deepEqual(first.children, []);
    assert.deepEqual(second.children.map((child) => child.id), ['r1']);
    assert.equal(rect.parent, second);
  });

  it('removes a child and reports the position it had', () => {
    const group = new Group('g1');
    const a = new Rect('a', 0, 0, 1, 1);
    const b = new Rect('b', 0, 0, 1, 1);
    group.append(a);
    group.append(b);

    assert.equal(group.removeChild(a), 0);
    assert.equal(a.parent, null);
    assert.deepEqual(group.children.map((child) => child.id), ['b']);
  });

  it('refuses to put a container inside its own descendant (R-ERR18)', () => {
    const outer = new Group('g1');
    const inner = new Group('g2');
    outer.append(inner);

    assert.throws(() => inner.append(outer), EditorError);
    assert.throws(() => inner.append(outer), /cannot move a container into its own descendant: g1/);
    assert.throws(() => outer.append(outer), EditorError);
  });
});

describe('Container — composite operations (spec §2.1)', () => {
  it('translates every descendant', () => {
    const group = new Group('markers');
    const circle = new Rect('box', 200, 80, 60, 60);
    group.append(circle);

    group.translate(0, 100);

    assert.equal(circle.summary(), 'x=200 y=180 w=60 h=60');
  });

  it('scales every descendant recursively (R-E4)', () => {
    const outer = new Group('flowchart');
    const inner = new Group('node1');
    const rect = new Rect('start', 120, 100, 160, 60);
    outer.append(inner);
    inner.append(rect);

    outer.scaleBy(2);

    assert.equal(rect.summary(), 'x=240 y=200 w=320 h=120');
  });

  it('leaves foreign subtrees untouched instead of failing (D12)', () => {
    const group = new Group('g1');
    const foreign = new ForeignElement('p1', 'path', new Map([['d', 'M0 0 L10 10']]));
    group.append(foreign);

    group.translate(10, 10);

    assert.deepEqual([...foreign.attributes()], [['d', 'M0 0 L10 10']]);
  });

  it('rejects a geometry attribute on a plain group (D9)', () => {
    const group = new Group('g1');
    group.setAttribute('fill', 'red');
    assert.equal(group.attributes().get('fill'), 'red');
    assert.throws(() => group.setAttribute('x', '10'), /unknown attribute: x/);
  });
});

describe('Element — traversal helpers', () => {
  it('walks the tree in document order', () => {
    const group = new Group('g1');
    const rect = new Rect('r1', 0, 0, 1, 1);
    const foreign = new ForeignElement('p1', 'path');
    group.append(rect);
    group.append(foreign);

    const ids: string[] = [];
    group.walk((element) => ids.push(element.id));

    assert.deepEqual(ids, ['g1', 'r1', 'p1']);
  });

  it('reports descendants without the element itself', () => {
    const group = new Group('g1');
    const inner = new Group('g2');
    const rect = new Rect('r1', 0, 0, 1, 1);
    group.append(inner);
    inner.append(rect);

    assert.deepEqual(group.descendants().map((element) => element.id), ['g2', 'r1']);
  });

  it('answers containment for self and descendants', () => {
    const group = new Group('g1');
    const inner = new Group('g2');
    group.append(inner);

    assert.ok(group.contains(group));
    assert.ok(group.contains(inner));
    assert.ok(!inner.contains(group));
  });
});

describe('ForeignElement (D8 / D12)', () => {
  it('keeps its tag, attributes and subtree', () => {
    const foreign = new ForeignElement('p1', 'path', new Map([['d', 'M0 0']]));
    const child = new ForeignElement('p2', 'title');
    foreign.append(child);

    assert.equal(foreign.tagName, 'path');
    assert.equal(foreign.summary(), '(foreign)');
    assert.equal(foreign.isGeometric, false);
    assert.deepEqual(foreign.descendants().map((element) => element.id), ['p2']);
  });

  it('refuses geometry commands aimed at it directly', () => {
    const foreign = new ForeignElement('p1', 'path');
    assert.throws(() => foreign.setAttribute('fill', 'red'), /unsupported element: p1/);
  });
});
