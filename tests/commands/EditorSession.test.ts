import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EditorSession } from '../../src/commands/EditorSession.ts';
import { Document } from '../../src/model/Document.ts';

describe('EditorSession', () => {
  it('starts without a document and reports the specification error (R-ERR11)', () => {
    const session = new EditorSession();

    assert.equal(session.hasDocument, false);
    assert.equal(session.document, null);
    assert.throws(() => session.requireDocument(), /no document\. use 'init' or 'read' first/);
  });

  it('hands out the document it was given', () => {
    const session = new EditorSession();
    const document = Document.blank(400, 200);

    session.setDocument(document);

    assert.equal(session.hasDocument, true);
    assert.equal(session.requireDocument(), document);
    assert.equal(session.requireDocument().size, '400x200');
  });
});
