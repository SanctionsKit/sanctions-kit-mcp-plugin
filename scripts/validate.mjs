import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function validate(root = repository) {
  root = path.resolve(root);
  const issues = [];
  const check = (condition, message) => { if (!condition) issues.push(message); };
  const json = (relative) => {
    try { return JSON.parse(readFileSync(path.join(root, relative), 'utf8')); }
    catch { issues.push(`${relative}: missing or invalid JSON`); return {}; }
  };
  function inside(base, reference, label) {
    if (typeof reference !== 'string' || !reference.startsWith('./')) {
      issues.push(`${label}: use a ./ relative path`);
      return false;
    }
    const resolved = path.resolve(base, reference);
    if (!resolved.startsWith(`${base}${path.sep}`) || !existsSync(resolved)) {
      issues.push(`${label}: missing path or path outside the package`);
      return false;
    }
    if (!realpathSync(resolved).startsWith(`${realpathSync(base)}${path.sep}`)) {
      issues.push(`${label}: symlink escapes the package`);
      return false;
    }
    return true;
  }
  const pkg = json('package.json');
  check(versionPattern.test(pkg.version), 'package.json: version must be semver');
  const lock = json('package-lock.json');
  check(lock.version === pkg.version && lock.packages?.['']?.version === pkg.version,
    'package-lock.json: version differs from package.json');
  const bundle = 'plugins/sanctionskit';
  const bundleRoot = path.join(root, bundle);
  try {
    check(readFileSync(path.join(root, 'LICENSE'), 'utf8') === readFileSync(path.join(bundleRoot, 'LICENSE'), 'utf8'),
      'Installable plugin LICENSE must match the repository LICENSE');
  } catch { issues.push('Repository and installable plugin must include LICENSE'); }
  const manifests = {};
  for (const client of ['codex', 'claude', 'cursor']) {
    const filename = `${bundle}/.${client}-plugin/plugin.json`;
    const manifest = json(filename);
    manifests[client] = manifest;
    check(manifest.name === 'sanctionskit', `${filename}: wrong plugin name`);
    check(manifest.version === pkg.version, `${filename}: version differs from package.json`);
    check(typeof manifest.description === 'string' && manifest.description.length > 10,
      `${filename}: missing description`);
    check(Boolean(manifest.author?.name), `${filename}: missing author`);
    check(manifest.license === 'MIT', `${filename}: license must match LICENSE`);
    const skillPaths = Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills];
    for (const ref of skillPaths) inside(bundleRoot, ref, `${filename}: skills`);
    let servers;
    if (manifest.mcpServers && typeof manifest.mcpServers === 'object' && !Array.isArray(manifest.mcpServers)) {
      check(client === 'codex', `${client}: use a client configuration file`);
      servers = manifest.mcpServers;
    } else if (inside(bundleRoot, manifest.mcpServers, `${filename}: mcpServers`)) {
      servers = json(`${bundle}/${manifest.mcpServers.slice(2)}`).mcpServers;
    }
    const serverObject = servers && typeof servers === 'object' && !Array.isArray(servers);
    check(Boolean(serverObject), `${client}: missing MCP server configuration`);
    if (serverObject) {
      const server = servers.sanctionskit;
      check(Object.keys(servers).length === 1, `${client}: expected one MCP server`);
      check(server?.url === 'https://www.sanctionskit.com/mcp', `${client}: unexpected MCP URL`);
      check(server?.type === 'http' || (client === 'cursor' && server?.type === undefined), `${client}: MCP must use HTTP`);
      check(!server?.headers && !server?.command && !server?.env, `${client}: unexpected credentials or command`);
      if (client === 'codex' || client === 'claude') {
        const clientId = client === 'codex' ? 'sanctionskit-codex' : 'sanctionskit-claude-code';
        const port = client === 'codex' ? 43127 : 43128;
        check(server?.oauth?.clientId === clientId, `${client}: incorrect OAuth client ID`);
        check(server?.oauth?.callbackPort === port, `${client}: incorrect callback port`);
        if (client === 'codex') check(server?.oauth?.callbackUrl === `http://127.0.0.1:${port}/callback`, 'codex: incorrect callback URL');
      } else {
        check(server?.auth?.CLIENT_ID === 'sanctionskit-cursor', 'cursor: incorrect OAuth client ID');
      }
    }
  }
  for (const key of ['composerIcon', 'logo', 'logoDark']) {
    inside(bundleRoot, manifests.codex.interface?.[key], `Codex interface.${key}`);
  }
  check(manifests.codex.interface?.developerName === 'SanctionsKit, LLC', 'Codex: missing publisher identity');
  for (const name of ['.mcp.json', 'mcp.json']) {
    check(!existsSync(path.join(bundleRoot, name)), `${name}: conflicts with per-client MCP discovery`);
  }
  for (const client of ['codex', 'claude', 'cursor']) {
    const filename = client === 'codex' ? '.agents/plugins/marketplace.json' : `.${client}-plugin/marketplace.json`;
    const catalog = json(filename);
    check(catalog.name === 'sanctionskit', `${filename}: wrong marketplace name`);
    check(catalog.plugins?.length === 1, `${filename}: expected one plugin`);
    const entry = catalog.plugins?.[0];
    check(entry?.name === 'sanctionskit', `${filename}: wrong plugin name`);
    const source = client === 'codex' ? entry?.source?.path : entry?.source;
    check(source === `./${bundle}` || source === bundle, `${filename}: incorrect source path`);
    if (typeof source === 'string') inside(root, source.startsWith('./') ? source : `./${source}`, `${filename}: source`);
    if (client === 'codex') {
      check(entry?.source?.source === 'local', `${filename}: expected a local source`);
      check(entry?.policy?.installation === 'AVAILABLE' && entry?.policy?.authentication === 'ON_INSTALL', `${filename}: missing installation policies`);
      check(Boolean(entry?.category), `${filename}: missing category`);
    }
  }
  function walk(directory) {
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (['.git', 'node_modules', '.DS_Store'].includes(entry.name)) return [];
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) { issues.push(`${path.relative(root, filename)}: symlinks are not portable`); return []; }
      return entry.isDirectory() ? walk(filename) : [filename];
    });
  }
  const files = walk(root);
  const skills = files.filter((file) => file.startsWith(`${bundleRoot}${path.sep}skills${path.sep}`) && path.basename(file) === 'SKILL.md');
  check(skills.length > 0, 'Plugin must contain a skill');
  for (const file of skills) {
    const source = readFileSync(file, 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    check(Boolean(frontmatter), `${path.relative(root, file)}: missing frontmatter`);
    check(frontmatter?.[1].match(/^name: (.+)$/m)?.[1] === path.basename(path.dirname(file)), `${path.relative(root, file)}: skill name differs from folder`);
    check(Boolean(frontmatter?.[1].match(/^description: .+/m)), `${path.relative(root, file)}: missing description`);
  }
  for (const file of files.filter((file) => /\.(md|json)$/.test(file))) {
    const source = readFileSync(file, 'utf8');
    check(!source.includes('[TODO:'), `${path.relative(root, file)}: unfinished scaffold`);
    if (file.endsWith('.json')) {
      try { JSON.parse(source); }
      catch { issues.push(`${path.relative(root, file)}: invalid JSON`); }
    }
    if (!file.endsWith('.md')) continue;
    for (const match of source.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
      const href = match[1];
      if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(href)) continue;
      const target = decodeURIComponent(href.split('#')[0]);
      const base = file.startsWith(`${bundleRoot}${path.sep}`) ? bundleRoot : root;
      const resolved = path.resolve(path.dirname(file), target);
      check(resolved.startsWith(`${base}${path.sep}`) && existsSync(resolved),
        `${path.relative(root, file)}: broken or external package link ${href}`);
    }
  }
  return issues;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = validate();
  if (issues.length) {
    console.error(issues.map((issue) => `- ${issue}`).join('\n'));
    process.exitCode = 1;
  } else console.log('Plugin manifests, marketplace sources, assets, skills, and local links are valid.');
}
