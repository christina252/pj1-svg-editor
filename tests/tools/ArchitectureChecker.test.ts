import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ArchitectureChecker } from '../../tools/ArchitectureChecker.ts';

const FIXTURE_ROOT = 'tests/fixtures/arch';

describe('ArchitectureChecker — rule engine', () => {
  it('scans every TypeScript file below the root', () => {
    const files = new ArchitectureChecker(FIXTURE_ROOT).scan();
    const paths = files.map((file) => file.path.split('\\').join('/'));

    assert.equal(files.length, 4);
    assert.ok(paths.some((path) => path.endsWith('model/Bad.ts')));
  });

  it('accepts a same-module import and ignores external packages', () => {
    const checker = new ArchitectureChecker(FIXTURE_ROOT);
    const good = checker.scan().find((file) => file.path.endsWith('Good.ts'));
    assert.ok(good !== undefined);
    // node:path is not relative, so it must not even be recorded as a module edge
    assert.deepEqual(
      good.imports.filter((entry) => entry.specifier.startsWith('node:')),
      [],
    );
  });

  it('flags a dependency that points the wrong way', () => {
    const violations = new ArchitectureChecker(FIXTURE_ROOT).violations();

    assert.equal(violations.length, 1);
    const violation = violations[0];
    assert.ok(violation !== undefined);
    assert.ok(violation.file.endsWith('model\\Bad.ts') || violation.file.endsWith('model/Bad.ts'));
    assert.match(violation.message, /'model' must not depend on 'cli'/);
  });

  it('reports a module that has no rule at all (forces an explicit decision)', () => {
    const checker = new ArchitectureChecker('src', [{ module: 'cli', allowed: ['cli'] }]);
    const violations = checker.violations();

    assert.ok(violations.some((violation) => violation.message.includes("module 'model' has no dependency rule")));
  });
});

describe('ArchitectureChecker — the real source tree', () => {
  it('the project itself is free of dependency violations', () => {
    assert.deepEqual(new ArchitectureChecker('src').violations(), []);
  });
});
