// OpenBot DSH (Cordis) plugin — registers the openbot skill at runtime.
// SOURCE SKELETON: not built or load-tested against the DSH plugin runtime.
// Build with the DSH toolchain and bundle SKILL.md + references/ before use.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const name = 'openbot-plugin';
export const inject = ['skills'];

export function apply(ctx) {
  // Resolve the skill from the canonical source; a distribution build should
  // bundle SKILL.md + references/ into this package instead.
  const skillPath = join(__dirname, '..', '..', '.agents', 'skills', 'openbot', 'SKILL.md');
  const raw = readFileSync(skillPath, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  const frontmatter = m?.[1] ?? '';
  const body = (m?.[2] ?? raw).trim();
  const desc = (/^description:\s*(.+)$/m.exec(frontmatter)?.[1] ?? 'OpenBot').trim();

  ctx.skills.register({
    name: 'openbot',
    description: desc,
    content: body,
  });
}