import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { runSmoke } from '../scripts/smoke.mjs';

async function fixture(t, { sse = false, fault } = {}) {
  const calls = [];
  let origin;
  const server = createServer(async (req, res) => {
    assert.equal(req.headers.authorization, undefined);
    res.setHeader('content-type', 'application/json');
    if (req.method === 'GET') {
      const metadata = req.url === '/.well-known/oauth-protected-resource/mcp'
        ? { resource: `${origin}/mcp`, authorization_servers: [origin] }
        : { issuer: origin, authorization_endpoint: `${origin}/mcp/oauth/authorize`, token_endpoint: `${origin}/mcp/oauth/token`,
          revocation_endpoint: `${origin}/mcp/oauth/revoke`, code_challenge_methods_supported: ['S256'] };
      res.end(JSON.stringify(metadata));
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    calls.push(body);
    let result;
    if (body.method === 'initialize') {
      assert.equal(body.params.clientInfo.name, 'sanctionskit-plugin-check');
      result = { protocolVersion: '2025-06-18', serverInfo: { name: 'sanctionskit', version: '1.0.0' }, capabilities: { tools: {} } };
      res.setHeader('mcp-session-id', 'fixture-session');
    } else {
      assert.equal(req.headers['mcp-protocol-version'], '2025-06-18');
      assert.equal(req.headers['mcp-session-id'], 'fixture-session');
      if (body.method === 'notifications/initialized') {
        res.writeHead(202).end();
        return;
      }
      if (body.method === 'tools/list') {
        result = { tools: ['search_docs', 'get_doc', 'get_api_schema', 'validate_screening_request',
          'list_sources', 'run_sandbox_screening', 'get_screening_result', 'get_usage', 'get_profile'].map((name) => ({ name })) };
      } else {
        const { name, arguments: args } = body.params;
        let data;
        if (name === 'search_docs') data = [{ slug: 'docs/idempotency' }];
        else if (name === 'get_doc') data = { slug: args.slug, url: `${origin}/${args.slug}`, text: 'Idempotency guidance' };
        else if (name === 'get_api_schema') data = { path: '/screenings', method: 'POST', baseUrl: `${origin}/api/v1`, operation: {} };
        else if (name === 'validate_screening_request') {
          data = args.request.subject || fault === 'validation'
            ? { valid: true, scope: 'structure_only', coverageChecked: false }
            : { valid: false, issues: [{ path: 'subject', message: 'Required' }] };
        } else if (name === 'get_usage') {
          result = { isError: true, _meta: { 'mcp/www_authenticate': [
            `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`,
          ] } };
          if (fault === 'auth') result = { structuredContent: { data: {} } };
        }
        result ??= { structuredContent: { data } };
      }
    }
    let reply = { jsonrpc: '2.0', id: body.id, result };
    if (body.method === 'initialize') {
      if (fault === 'id') reply.id += 1;
      if (fault === 'version') reply.jsonrpc = '1.0';
      if (fault === 'rpc') reply = { jsonrpc: '2.0', id: body.id, error: { code: -32603, message: 'SENSITIVE SERVER DETAIL' } };
      if (fault === 'timeout') return;
    }
    if (sse) {
      res.setHeader('content-type', 'text/event-stream');
      res.end(`: heartbeat\r\n\r\nevent: message\r\ndata: ${JSON.stringify(reply)}\r\n\r\n`);
    } else res.end(JSON.stringify(reply));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  return { endpoint: `${origin}/mcp`, calls };
}

for (const sse of [false, true]) {
  test(`public smoke succeeds over ${sse ? 'finite SSE' : 'JSON'} without screening writes`, async (t) => {
    const { endpoint, calls } = await fixture(t, { sse });
    const logs = [];
    await runSmoke({ endpoint, log: (message) => logs.push(message) });
    assert.deepEqual(calls.map((call) => call.method), [
      'initialize', 'notifications/initialized', 'tools/list', ...Array(6).fill('tools/call'),
    ]);
    assert.deepEqual(calls.filter((call) => call.method === 'tools/call').map((call) => call.params.name), [
      'search_docs', 'get_doc', 'get_api_schema', 'validate_screening_request', 'validate_screening_request', 'get_usage',
    ]);
    assert.match(logs.at(-1), /Public smoke check passed/);
    assert.ok(!logs.join('\n').includes('Juniper'));
  });
}

for (const [fault, expected] of [
  ['id', /request ID/],
  ['version', /JSON-RPC version/],
  ['rpc', /JSON-RPC error/],
  ['validation', /Malformed request validation/],
  ['auth', /OAuth authentication challenge/],
  ['timeout', /timed out/],
]) {
  test(`public smoke fails closed on ${fault}`, async (t) => {
    const { endpoint } = await fixture(t, { fault });
    await assert.rejects(runSmoke({ endpoint, timeoutMs: fault === 'timeout' ? 50 : 15000, log: () => {} }), (error) => {
      assert.match(error.message, expected);
      assert.ok(!error.message.includes('SENSITIVE SERVER DETAIL'));
      return true;
    });
  });
}

test('endpoint rejects embedded credentials before making a request', async () => {
  await assert.rejects(runSmoke({ endpoint: 'https://secret@example.com/mcp', log: () => {} }), /omit credentials/);
});
