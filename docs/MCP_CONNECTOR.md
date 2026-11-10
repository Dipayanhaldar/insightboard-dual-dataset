# InsightBoard VDB MCP Connector

## Production endpoint

`https://insightboard-v2-bsiu.onrender.com/api/mcp`

## Transport

- Model Context Protocol over Streamable HTTP.
- Stateless request handling; no session store or new database collections.
- POST is the supported MCP transport method. GET and DELETE return HTTP 405.
- Built on the official `@modelcontextprotocol/sdk` TypeScript SDK v1 compatibility line for the repository's Node.js 20+ runtime.

## Available tools

| Tool | Purpose |
|---|---|
| `get_connector_capabilities` | Describes supported tools, limits, and privacy behavior |
| `analyze_dataset` | Analyzes up to 2,500 JSON records supplied with the request |
| `analyze_sample_mall_dataset` | Analyzes the built-in public mall sample dataset |

All tools are read-only. They do not query private accounts, read saved reports, modify records, write to MongoDB/Supabase, or call an AI provider. Analysis uses the existing deterministic INSI engine.

## Data handling and limits

- User-supplied records are processed in memory for the request.
- The MCP tools do not persist submitted records or outputs.
- At most 2,500 records are accepted; at most 100 processed detail rows are returned.
- The existing Express API rate limiter applies, with an additional MCP-specific limit.
- The endpoint currently has no authentication. Anyone with the endpoint URL can invoke the read-only tools; do not submit secrets or sensitive personal information.
- The tools analyze caller-supplied records and the built-in public sample. They do not provide access to private MongoDB/Supabase datasets.

## Local validation

```bash
npm install
npm run check:server
npm test
npm run build
```

## Connect a compatible MCP client

Add `https://insightboard-v2-bsiu.onrender.com/api/mcp` as a remote MCP server using Streamable HTTP. A client may label the integration **InsightBoard VDB**.

## Hosting and cost

The MCP route runs inside the existing Express API deployment. No separate MCP service or paid AI model API is required. The existing Render Free service may sleep after inactivity and is subject to provider quotas and limits.
