#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_ENDPOINT = 'https://www.sanctionskit.com/mcp';
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26'];
const MAX_RESPONSE_BYTES = 1024 * 1024;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Response was not valid JSON.');
  }
}

async function readBody(response) {
  check(response.body, 'Response body was missing.');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      check(bytes <= MAX_RESPONSE_BYTES, 'Response exceeded the 1 MiB limit.');
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function rpcResponse(response, text, requestId) {
  const type = response.headers.get('content-type')?.split(';')[0].trim();
  let messages;
  if (type === 'application/json') {
    messages = [parseJson(text)];
  } else if (type === 'text/event-stream') {
    // A finite SSE response is supported. An open stream expires at the request timeout.
    messages = text.replace(/\r\n?/g, '\n').split('\n\n')
      .map((event) => event.split('\n').filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).replace(/^ /, '')).join('\n'))
      .filter(Boolean).map(parseJson);
  } else {
    throw new Error('MCP response must use application/json or text/event-stream.');
  }
  check(messages.every((message) => message && message.jsonrpc === '2.0'),
    'MCP returned an invalid JSON-RPC version.');
  const replies = messages.filter((message) => Object.hasOwn(message, 'id'));
  check(replies.length === 1 && replies[0].id === requestId,
    'MCP response did not correlate with the request ID.');
  const reply = replies[0];
  check(!Object.hasOwn(reply, 'error'), 'MCP returned a JSON-RPC error.');
  check(Object.hasOwn(reply, 'result'), 'MCP response omitted its result.');
  return reply.result;
}

function toolData(result) {
  check(result && result.isError !== true && result.structuredContent &&
    Object.hasOwn(result.structuredContent, 'data'),
  'MCP tool returned an error or omitted structured data.');
  return result.structuredContent.data;
}

export async function runSmoke({ endpoint = DEFAULT_ENDPOINT, timeoutMs = 15000, log = console.log } = {}) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('Endpoint must be an absolute HTTPS URL or an HTTP loopback URL.');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  check((url.protocol === 'https:' || (url.protocol === 'http:' && loopback)) &&
    !url.username && !url.password && !url.search && !url.hash && url.pathname === '/mcp',
  'Endpoint must use HTTPS (or HTTP loopback), end in /mcp, and omit credentials, query and fragment.');
  check(Number.isInteger(timeoutMs) && timeoutMs > 0, 'Timeout must be a positive integer.');
  const origin = url.origin;
  let protocol = PROTOCOLS[0];
  let session;
  let id = 0;

  async function request(target, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(target, {
        method: body ? 'POST' : 'GET',
        redirect: 'error',
        signal: controller.signal,
        headers: body ? {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': protocol,
          ...(session ? { 'mcp-session-id': session } : {}),
        } : { accept: 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      check(response.ok, `HTTP request failed with status ${response.status}.`);
      const text = await readBody(response);
      return { response, text };
    } catch (error) {
      if (controller.signal.aborted) throw new Error('HTTP request timed out.');
      // Do not print server error bodies, request inputs or fetch diagnostics.
      if (error instanceof TypeError) throw new Error('HTTP request failed; check endpoint and connectivity.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function rpc(method, params) {
    const requestId = ++id;
    const { response, text } = await request(url, { jsonrpc: '2.0', id: requestId, method, params });
    const result = rpcResponse(response, text, requestId);
    if (method === 'initialize') session = response.headers.get('mcp-session-id');
    return result;
  }
  const call = (name, args) => rpc('tools/call', { name, arguments: args });
  const discovery = async (path) => {
    const { response, text } = await request(new URL(path, origin));
    check(response.headers.get('content-type')?.split(';')[0].trim() === 'application/json',
      'OAuth discovery did not return application/json.');
    return parseJson(text);
  };

  const initialized = await rpc('initialize', {
    protocolVersion: protocol,
    capabilities: {},
    clientInfo: { name: 'sanctionskit-plugin-check', version: '1.0.0' },
  });
  check(initialized?.serverInfo?.name === 'sanctionskit' && initialized.capabilities?.tools,
    'MCP server identity or tool capability was missing.');
  check(PROTOCOLS.includes(initialized.protocolVersion), 'MCP negotiated an unsupported protocol version.');
  protocol = initialized.protocolVersion;
  const notification = await request(url, { jsonrpc: '2.0', method: 'notifications/initialized' });
  check(notification.response.status === 202 && !notification.text.trim(),
    'MCP initialization notification was not accepted with an empty 202 response.');
  log('PASS MCP initialization');

  const catalog = await rpc('tools/list', {});
  const required = ['search_docs', 'get_doc', 'get_api_schema', 'validate_screening_request',
    'list_sources', 'run_sandbox_screening', 'get_screening_result', 'get_usage', 'get_profile'];
  check(Array.isArray(catalog?.tools) && required.every((name) => catalog.tools.some((tool) => tool.name === name)),
    'MCP catalog was missing a required public or account tool.');
  log('PASS tool catalog');

  const docs = toolData(await call('search_docs', { query: 'idempotency', limit: 5 }));
  const match = Array.isArray(docs) && docs.find((doc) => doc.slug === 'docs/idempotency');
  check(match, 'Documentation search did not find idempotency guidance.');
  const doc = toolData(await call('get_doc', { slug: match.slug }));
  check(doc?.slug === match.slug && doc.url === `${origin}/${match.slug}` && typeof doc.text === 'string' && doc.text.length > 0,
    'Documentation read returned an unexpected or empty document.');
  log('PASS documentation search and read');

  const schema = toolData(await call('get_api_schema', { path: '/screenings', method: 'post' }));
  check(schema?.path === '/screenings' && schema.method === 'POST' && schema.baseUrl === `${origin}/api/v1` && schema.operation,
    'API schema did not describe the expected screening operation.');
  log('PASS API schema');

  const valid = toolData(await call('validate_screening_request', {
    request: { subject: { name: 'Juniper Example Cooperative', entityType: 'organization' }, package: 'sandbox@1' },
  }));
  check(valid?.valid === true && valid.scope === 'structure_only' && valid.coverageChecked === false,
    'Synthetic request validation did not report a structure-only success.');
  const invalid = toolData(await call('validate_screening_request', { request: {} }));
  check(invalid?.valid === false && Array.isArray(invalid.issues) && invalid.issues.length > 0,
    'Malformed request validation did not report issues.');
  log('PASS synthetic request validation');

  const denied = await call('get_usage', {});
  const challenges = denied?._meta?.['mcp/www_authenticate'];
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource/mcp`;
  check(denied?.isError === true && Array.isArray(challenges) && challenges.some((value) =>
    typeof value === 'string' && /^Bearer /i.test(value) && value.includes(`resource_metadata="${metadataUrl}"`)),
  'Anonymous account access did not return an OAuth authentication challenge.');
  const resource = await discovery('/.well-known/oauth-protected-resource/mcp');
  check(resource?.resource === url.href && Array.isArray(resource.authorization_servers) && resource.authorization_servers.includes(origin),
    'OAuth protected-resource discovery was invalid.');
  const oauth = await discovery('/.well-known/oauth-authorization-server');
  check(oauth?.issuer === origin && oauth.authorization_endpoint === `${origin}/mcp/oauth/authorize` &&
    oauth.token_endpoint === `${origin}/mcp/oauth/token` && oauth.revocation_endpoint === `${origin}/mcp/oauth/revoke` &&
    Array.isArray(oauth.code_challenge_methods_supported) && oauth.code_challenge_methods_supported.includes('S256'),
  'OAuth authorization discovery was invalid or omitted PKCE.');
  log('PASS anonymous authentication challenge and OAuth discovery');
  log('Public smoke check passed. No screening was submitted and no account credentials were used.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length > 3) {
    console.error('Usage: node scripts/smoke.mjs [https://host/mcp]');
    process.exitCode = 1;
  } else {
    runSmoke({ endpoint: process.argv[2] }).catch((error) => {
      console.error(`FAIL ${error.message}`);
      process.exitCode = 1;
    });
  }
}
