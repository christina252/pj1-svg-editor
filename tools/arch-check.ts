/**
 * Entry point of the architecture guardian: `npm run arch:check`.
 *
 * Prints the rule table, the scanned files and every dependency that violates
 * the agreed direction; exits non-zero when something is wrong, so it can sit
 * in `npm run check` next to typecheck and tests.
 */
import { ArchitectureChecker } from './ArchitectureChecker.ts';

const checker = new ArchitectureChecker('src');
const files = checker.scan();
const violations = checker.violations();

console.log('dependency rules (module -> may import)');
for (const rule of checker.rules()) {
  console.log(`  ${rule.module.padEnd(9)} -> ${rule.allowed.length === 0 ? '(nothing)' : rule.allowed.join(', ')}`);
}

console.log('');
console.log(`scanned ${files.length} files under src/`);

if (violations.length === 0) {
  console.log('no dependency violations');
} else {
  console.log('');
  console.log(`${violations.length} violation(s):`);
  for (const violation of violations) {
    console.log(`  ${violation.file}: ${violation.message}`);
  }
  process.exitCode = 1;
}
