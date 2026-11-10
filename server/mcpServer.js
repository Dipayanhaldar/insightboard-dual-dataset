import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import {
  executeInsiCommand,
  extractConnectorRecords
} from '../src/v2/insiOperatorEngine.js';

const MAX_RECORDS = 2500;
const MAX_RESULT_ROWS = 100;

function loadSampleMallRecords() {
  try {
    const payload = JSON.parse(
      readFileSync(new URL('../src/shopping_mall_sales.json', import.meta.url), 'utf8')
    );
    return extractConnectorRecords(payload).slice(0, MAX_RECORDS);
  } catch {
    return [];
  }
}

function buildAnalysisResult({ records, datasetName, command }) {
  const result = executeInsiCommand({
    rows: records,
    datasetName,
    command,
    activeMode: records.length ? 'api_webhook' : 'awaiting_data'
  });

  return {
    ...result,
    processed_data: Array.isArray(result.processed_data)
      ? result.processed_data.slice(0, MAX_RESULT_ROWS)
      : [],
    connector_notice: {
      mode: 'read-only',
      persistence: 'none',
      ai_provider_calls: 0,
      record_limit: MAX_RECORDS,
      returned_detail_rows: MAX_RESULT_ROWS
    }
  };
}

function asToolResult(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }]
  };
}

export function createInsiMcpServer() {
  const server = new McpServer(
    { name: 'insightboard-vdb', version: '3.0.0' },
    { capabilities: { tools: { listChanged: false } } }
  );

  server.registerTool(
    'get_connector_capabilities',
    {
      title: 'Get InsightBoard connector capabilities',
      description: 'Returns supported InsightBoard VDB MCP tools, limits, and privacy behavior. Read-only; does not access user accounts or databases.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => asToolResult({
      product: 'InsightBoard VDB',
      version: '3.0.0',
      transport: 'MCP Streamable HTTP',
      permissions: 'read-only',
      tools: ['get_connector_capabilities', 'analyze_dataset', 'analyze_sample_mall_dataset'],
      maxRecordsPerAnalysis: MAX_RECORDS,
      maxReturnedDetailRows: MAX_RESULT_ROWS,
      persistence: 'No submitted dataset or analysis result is stored by the MCP tools.',
      aiProviderCalls: 0,
      supportedInputs: ['JSON records', 'built-in public mall sample dataset']
    })
  );

  server.registerTool(
    'analyze_dataset',
    {
      title: 'Analyze a supplied dataset',
      description: 'Runs InsightBoard INSI deterministic analytics on JSON records supplied in this request. The records are processed in memory only; this tool does not read accounts, access databases, write data, or call a paid AI provider. Maximum 2,500 records.',
      inputSchema: {
        records: z.array(z.record(z.string(), z.unknown())).max(MAX_RECORDS),
        command: z.string().trim().min(1).max(500).default('Summarize the dataset and identify key business metrics.'),
        datasetName: z.string().trim().min(1).max(140).default('User-supplied dataset')
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ records, command, datasetName }) => {
      const safeRecords = extractConnectorRecords(records).slice(0, MAX_RECORDS);
      return asToolResult(buildAnalysisResult({
        records: safeRecords,
        datasetName,
        command
      }));
    }
  );

  server.registerTool(
    'analyze_sample_mall_dataset',
    {
      title: 'Analyze the public mall sample dataset',
      description: 'Runs InsightBoard INSI analytics against the built-in public shopping mall and retail sample dataset. Does not access user data, write to a database, or call a paid AI provider.',
      inputSchema: {
        command: z.string().trim().min(1).max(500).default('Summarize revenue by store and identify the top and bottom performers.')
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ command }) => {
      const records = loadSampleMallRecords();
      if (!records.length) {
        return {
          content: [{ type: 'text', text: 'The built-in sample dataset is unavailable in this deployment.' }],
          isError: true
        };
      }
      return asToolResult(buildAnalysisResult({
        records,
        datasetName: 'InsightBoard public mall sample dataset',
        command
      }));
    }
  );

  return server;
}
