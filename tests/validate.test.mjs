import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validate } from '../scripts/validate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture(t) {
  const target = mkdtempSync(path.join(os.tmpdir(), 'sanctionskit-package-'));
  for (const entry of ['plugins', '.agents', '.claude-plugin', '.cursor-plugin', 'package.json', 'package-lock.json', 'LICENSE']) {
    cpSync(path.join(root, entry), path.join(target, entry), { recursive: true });
  }
  t.after(() => rmSync(target, { recursive: true, force: true }));
  return target;
}

function change(root, relative, edit) {
  const file = path.join(root, relative);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  edit(data);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

test('repository package is self-contained and consistent', () => {
  assert.deepEqual(validate(root), []);
});

test('rejects version drift between clients', (t) => {
  const dir = fixture(t);
  change(dir, 'plugins/sanctionskit/.cursor-plugin/plugin.json', (data) => { data.version = '9.9.9'; });
  assert.ok(validate(dir).some((issue) => issue.includes('cursor-plugin/plugin.json: version differs')));
});

test('rejects malformed bundled examples', (t) => {
  const dir = fixture(t);
  writeFileSync(path.join(dir, 'plugins/sanctionskit/skills/sanctionskit-integration/examples/mcp-calls.json'), '{');
  assert.ok(validate(dir).some((issue) => issue.includes('examples/mcp-calls.json: invalid JSON')));
});

test('rejects MCP configuration outside the installable package', (t) => {
  const dir = fixture(t);
  change(dir, 'plugins/sanctionskit/.codex-plugin/plugin.json', (data) => { data.mcpServers = './../../package.json'; });
  assert.ok(validate(dir).some((issue) => issue.includes('mcpServers: missing path or path outside')));
});

test('rejects broken skill references after a package copy', (t) => {
  const dir = fixture(t);
  rmSync(path.join(dir, 'plugins/sanctionskit/skills/sanctionskit-integration/examples/mcp-calls.json'));
  assert.ok(validate(dir).some((issue) => issue.includes('broken or external package link examples/mcp-calls.json')));
});

test('rejects auto-discovered config that would merge with client settings', (t) => {
  const dir = fixture(t);
  writeFileSync(path.join(dir, 'plugins/sanctionskit/.mcp.json'), '{}');
  assert.ok(validate(dir).some((issue) => issue.includes('conflicts with per-client MCP discovery')));
});

test('rejects marketplace source paths outside the repository', (t) => {
  const dir = fixture(t);
  change(dir, '.agents/plugins/marketplace.json', (data) => { data.plugins[0].source.path = '../elsewhere'; });
  assert.ok(validate(dir).some((issue) => issue.includes('incorrect source path')));
});
