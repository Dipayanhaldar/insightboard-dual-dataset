# InsightBoard VDB MCP Connector

## Endpoint

The remote MCP endpoint is served by the existing Express API:

`https://YOUR-EXISTING-API-HOST/api/mcp`

Use the same API host where `/api/connector/openapi.json` is currently available. No separate service, database, AI model key, or paid MCP hosting provider is required.

## Transport

- Model Context Protocol over Streamable HTTP.
- Stateless request handling; no session store or new database collections.
- POST is the supported MCP transport method. GET and DELETE return HTTP 405.
- Built on the official `@modelcontextprotocol/sdk` TypeScript SDK v1 compatibility line to retain the repository's Node.js 20+ runtime baseline.

## Available tools

| Tool | Purpose |
|---|---|
| `get_connector_capabilities` | Describes supported tools, limits, and privacy behavior |
| `analyze_dataset` | Analyzes up to 2,500 JSON records supplied with the request |
| `analyze_sample_mall_dataset` | Analyzes the built-in public mall sample dataset |

All tools are read-only. They do not query private accounts, read saved reports, modify records, write to MongoDB/Supabase, or call an AI provider. Analysis uses the existing deterministic INSI engine.

## Data handling

- User-supplied records are processed in memory for the request.
- The MCP tools do not persist submitted records or outputs.
- At most 2,500 records are accepted; at most 100 processed detail rows are returned.
- The existing Express API rate limiter applies, with an additional MCP-specific limit.
- Do not submit secrets or sensitive personal information to a public connector endpoint.

## Local validation

```bash
npm install
npm run check:server
npm test
npm run build
```

## Connect a compatible MCP client

Add the endpoint URL above as a remote MCP server using Streamable HTTP. A client may label the integration **InsightBoard VDB**.

## Hosting and cost

The MCP route runs inside the existing Express API deployment. Keep the API service on its existing Render/Vercel configuration; do not create another service or add paid resources. Render Free services may sleep after inactivity and have monthly resource limits. This connector does not require a paid model API, but hosting, bandwidth, and platform quotas remain subject to the existing provider's limits.
