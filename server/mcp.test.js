import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import app from './index.js';

let server;
let baseUrl;

async function postMcp(payload) {
  return fetch(`${baseUrl}/api/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream'
    },
    body: JSON.stringify(payload)
  });
}

function parseMcpResponse(text) {
  const dataLine = text.split(/\r?\n/).find(line => line.startsWith('data: '));
  return JSON.parse(dataLine ? dataLine.slice(6) : text);
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections?.();
  });
});

test('MCP endpoint initializes with stateless Streamable HTTP', async () => {
  const response = await postMcp({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'insightboard-mcp-test', version: '1.0.0' }
    }
  });

  assert.equal(response.status, 200);
  const body = parseMcpResponse(await response.text());
  assert.equal(body.result.serverInfo.name, 'insightboard-vdb');
  assert.ok(body.result.capabilities.tools);
});

test('MCP tools list contains only read-only analytics tools', async () => {
  const response = await postMcp({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  });

  assert.equal(response.status, 200);
  const body = parseMcpResponse(await response.text());
  const names = body.result.tools.map(tool => tool.name);
  assert.deepEqual(names, [
    'get_connector_capabilities',
    'analyze_dataset',
    'analyze_sample_mall_dataset'
  ]);
  for (const tool of body.result.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
  }
});

test('MCP analyze_dataset returns deterministic output without persistence tools', async () => {
  const response = await postMcp({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'analyze_dataset',
      arguments: {
        records: [
          { store: 'Alpha', revenue: 1200 },
          { store: 'Beta', revenue: 800 }
        ],
        command: 'Show revenue by store as a bar chart',
        datasetName: 'MCP test dataset'
      }
    }
  });

  assert.equal(response.status, 200);
  const body = parseMcpResponse(await response.text());
  assert.ok(body.result.content[0].text.includes('MCP test dataset'));
  assert.equal(body.result.isError, undefined);
});

test('MCP endpoint rejects non-POST transport methods', async () => {
  const response = await fetch(`${baseUrl}/api/mcp`);
  assert.equal(response.status, 405);
});
