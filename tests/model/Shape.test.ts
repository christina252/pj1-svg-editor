import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Circle } from '../../src/model/Circle.ts';
import { Ellipse } from '../../src/model/Ellipse.ts';
import { Line } from '../../src/model/Line.ts';
import { Rect } from '../../src/model/Rect.ts';
import { Text } from '../../src/model/Text.ts';
import { EditorError } from '../../src/errors/EditorError.ts';

describe('leaf shapes — tree summary (spec §5.1)', () => {
  it('renders a rect with short geometry names and its fill', () => {
    assert.equal(
      new Rect('bg', 0, 0, 800, 600, '#ffffff').summary(),
      'x=0 y=0 w=800 h=600 fill=#ffffff',
    );
  });

  it('renders a circle without a fill when none was given', () => {
    assert.equal(new Circle('c1', 100, 100, 20).summary(), 'cx=100 cy=100 r=20');
  });

  it('renders an ellipse like the class sample in the specification', () => {
    assert.equal(new Ellipse('e1', 1, 2, 3, 4).summary(), 'cx=1 cy=2 rx=3 ry=4');
  });

  it('renders a line as two points', () => {
    assert.equal(new Line('arrow1', 280, 130, 520, 130, 'black').summary(), '(280,130) -> (520,130)');
  });

  it('renders a text element with its content in quotes', () => {
    assert.equal(new Text('title', 20, 40, 'My Diagram').summary(), '(20,40) "My Diagram"');
  });
});

describe('leaf shapes — move (R-E3)', () => {
  it('shifts a rect anchor', () => {
    const rect = new Rect('r1', 10, 20, 100, 50);
    rect.translate(30, -5);
    assert.equal(rect.summary(), 'x=40 y=15 w=100 h=50');
  });

  it('shifts a circle centre', () => {
    const circle = new Circle('c1', 100, 100, 20);
    circle.translate(30, 0);
    assert.equal(circle.summary(), 'cx=130 cy=100 r=20');
  });

  it('shifts both ends of a line', () => {
    const line = new Line('l1', 0, 0, 10, 10);
    line.translate(5, 5);
    assert.equal(line.summary(), '(5,5) -> (15,15)');
  });
});

describe('leaf shapes — scale (R-E4: every geometric attribute is multiplied)', () => {
  it('scales position and size of a rect', () => {
    const rect = new Rect('r1', 10, 20, 100, 50);
    rect.scaleBy(2);
    assert.equal(rect.summary(), 'x=20 y=40 w=200 h=100');
  });

  it('scales centre and radius of a circle', () => {
    const circle = new Circle('c1', 100, 100, 20);
    circle.scaleBy(0.5);
    assert.equal(circle.summary(), 'cx=50 cy=50 r=10');
  });

  it('keeps decimal noise out of the output (D15)', () => {
    const circle = new Circle('c1', 100, 100, 20);
    circle.scaleBy(1.1);
    assert.equal(circle.summary(), 'cx=110 cy=110 r=22');
  });

  it('scales the anchor of a text element but not its font', () => {
    const text = new Text('t1', 20, 40, 'hello');
    text.scaleBy(3);
    assert.equal(text.summary(), '(60,120) "hello"');
  });
});

describe('leaf shapes — whitelist for set (R-E5 / R-ERR13)', () => {
  it('accepts a style attribute', () => {
    const rect = new Rect('r1', 0, 0, 10, 10);
    rect.setAttribute('fill', 'red');
    assert.equal(rect.summary(), 'x=0 y=0 w=10 h=10 fill=red');
  });

  it('accepts a geometry attribute and normalises the number', () => {
    const rect = new Rect('r1', 0, 0, 10, 10);
    rect.setAttribute('width', '12.5000');
    assert.equal(rect.summary(), 'x=0 y=0 w=12.5 h=10');
  });

  it('rejects an attribute outside the whitelist', () => {
    const rect = new Rect('r1', 0, 0, 10, 10);
    assert.throws(() => rect.setAttribute('opacity', '0.5'), EditorError);
  });

  it('rejects a non-numeric value for a geometry attribute', () => {
    const rect = new Rect('r1', 0, 0, 10, 10);
    assert.throws(() => rect.setAttribute('width', 'wide'), /invalid number: wide/);
  });

  it('writes the text content through `set <id> text`', () => {
    const text = new Text('t1', 20, 40, 'My Diagram');
    text.setAttribute('text', 'My Diagram v2');
    assert.equal(text.content, 'My Diagram v2');
    assert.equal(text.summary(), '(20,40) "My Diagram v2"');
  });
});

describe('leaf shapes — show details (spec §5.2)', () => {
  it('lists geometry first, then the remaining attributes', () => {
    const circle = new Circle('c1', 100, 100, 20, 'red');
    assert.deepEqual(circle.detailLines(), ['cx=100 cy=100 r=20', 'fill=red']);
  });

  it('includes the text content of a text element', () => {
    const text = new Text('t1', 20, 40, 'hello');
    assert.deepEqual(text.detailLines(), ['x=20 y=40', 'text="hello"']);
  });
});
