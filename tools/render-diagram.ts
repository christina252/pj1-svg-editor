/**
 * Renders docs/architecture.puml into doc/architecture.svg: `npm run diagram`.
 *
 * The machine used for development has no Java, so the PlantUML public server
 * does the rendering; the .puml file stays the source of truth and can be
 * rendered with a local plantuml.jar just as well.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlantumlEncoder } from './PlantumlEncoder.ts';

const SOURCE = 'docs/architecture.puml';
const TARGET = 'doc/architecture.svg';
const SERVER = 'https://www.plantuml.com/plantuml/svg';

const source = readFileSync(SOURCE, 'utf8');
const url = `${SERVER}/${PlantumlEncoder.encode(source)}`;

const response = await fetch(url);
if (!response.ok) {
  console.error(`plantuml server returned ${response.status}`);
  process.exitCode = 1;
} else {
  const svg = await response.text();
  if (!svg.startsWith('<svg') && !svg.includes('<svg')) {
    console.error('the server did not return an SVG (syntax error in the diagram?)');
    process.exitCode = 1;
  } else {
    writeFileSync(TARGET, svg, 'utf8');
    console.log(`rendered ${SOURCE} -> ${TARGET} (${svg.length} bytes, url ${url.length} chars)`);
  }
}
