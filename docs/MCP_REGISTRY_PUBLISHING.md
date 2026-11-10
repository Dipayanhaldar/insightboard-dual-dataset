# Publish InsightBoard VDB to the Official MCP Registry

This repository includes a remote-only registry manifest at the repository root: `server.json`.

## What this publishes

- Registry name: `io.github.dipayanhaldar/insightboard-vdb`
- Display name: InsightBoard VDB
- Version: `3.0.0`
- Transport: Streamable HTTP
- Remote endpoint: `https://insightboard-v2-bsiu.onrender.com/api/mcp`

This is a metadata listing for the already-hosted remote server. It does not upload or deploy the server binary, create a hosting service, or change the Render deployment.

## Requirements before publishing

1. Merge the manifest and documentation changes into the default branch.
2. Confirm the public endpoint is still reachable and that all three tools execute successfully.
3. Install the official `mcp-publisher` CLI from the [MCP Registry releases](https://github.com/modelcontextprotocol/registry/releases).
4. From the repository root, validate the manifest:

   ```powershell
   mcp-publisher.exe validate .\server.json
   ```

5. Authenticate with GitHub. The GitHub account must control the `io.github.dipayanhaldar` namespace:

   ```powershell
   mcp-publisher.exe login github
   ```

   Complete the browser-based GitHub authorization. Do not paste access tokens into chat, commit them, or store them in repository files.

6. Publish:

   ```powershell
   mcp-publisher.exe publish .\server.json
   ```

7. Verify the listing in the [Official MCP Registry](https://registry.modelcontextprotocol.io/).

## Important limitations

- The registry validates namespace ownership. A GitHub login must have permission to publish under `io.github.dipayanhaldar`.
- The registry listing does not mean every AI client automatically installs or displays the server. Client discovery and compatibility vary.
- The registry does not validate ownership of the remote endpoint; the publisher is responsible for ensuring the URL is controlled and maintained.
- The Render Free service may sleep when idle. A registry listing does not provide uptime guarantees.
- The MCP endpoint currently exposes unauthenticated, read-only analytics. The tools accept caller-supplied records and a built-in public sample; they do not access private MongoDB/Supabase records.
- Publishing is a separate authenticated action. Do not run `publish` until the manifest has been reviewed and the endpoint health check has passed.

## Official references

- [MCP Registry publishing quickstart](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx)
- [Publisher CLI commands](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/cli/commands.md)
- [Registry namespace authentication](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/authentication.mdx)
