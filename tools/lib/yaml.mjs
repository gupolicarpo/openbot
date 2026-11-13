// yaml.mjs — shared YAML loader for all OpenBot scripts.
// Order: $OPENBOT_JSYAML (explicit override) → a locally installed js-yaml →
// the vendored copy in tools/vendor (always present, so no install is needed).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let yaml = null;
for (const id of [process.env.OPENBOT_JSYAML, 'js-yaml'].filter(Boolean)) {
  try { yaml = require(id); break; } catch {}
}
if (!yaml) yaml = await import('../vendor/js-yaml.mjs');

export default yaml;
