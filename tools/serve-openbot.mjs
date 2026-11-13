#!/usr/bin/env node
// serve-openbot.mjs — expose kind: api bots over HTTP.
// Usage: node tools/serve-openbot.mjs [port] [bots-dir]

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import http from 'node:http';
import yaml from './lib/yaml.mjs';

const port = Number(process.argv[2] ?? 3081);
const botsDir = resolve(process.argv[3] ?? 'bots');

const routes = new Map();
for (const f of readdirSync(botsDir)) {
  if (!f.endsWith('.yaml') && !f.endsWith('.yml')) continue;
  try {
    const doc = yaml.load(readFileSync(join(botsDir, f), 'utf8'));
    for (const t of (doc.tasks || [])) {
      if (t.kind === 'api' && t.route) routes.set(t.route, { bot: doc.name, task: t });
    }
  } catch {}
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, bots: routes.size }));
    return;
  }
  const entry = routes.get(url.pathname);
  if (!entry) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let input;
    try { input = body ? JSON.parse(body) : {}; } catch { input = { raw: body }; }
    // Deterministic echo (reference non-model handler). Model-backed handlers
    // would call the adapter's run hook here.
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      bot: entry.bot,
      task: entry.task.id,
      route: entry.task.route,
      mode: 'api',
      echo: input,
    }, null, 2));
  });
});

server.listen(port, () => {
  console.log(`openbot api server on http://localhost:${port}`);
  for (const [route, e] of routes) console.log(`  ${route} → ${e.bot}/${e.task.id}`);
  if (routes.size === 0) console.log('  (no api bots registered)');
});