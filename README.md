<picture>
  <source media="(prefers-color-scheme: dark)" srcset="plugins/sanctionskit/assets/logo-dark.png">
  <img src="plugins/sanctionskit/assets/logo.png" alt="SanctionsKit" width="320">
</picture>

# SanctionsKit plugin

Build SanctionsKit integrations from your editor. Find API documentation, check request formats, and test invented subjects against the sandbox.

The plugin bundles the hosted [SanctionsKit MCP server](https://www.sanctionskit.com/resources/mcp) connection and an integration skill for **Codex, Claude Code, and Cursor**. There is no local server to run and no install script.

A separate **Gemini CLI extension** connects to the four public documentation, schema, and request-validation tools. It requires no SanctionsKit account or API key and does not expose sandbox account tools.

[Documentation](https://www.sanctionskit.com/docs) · [MCP guide](https://www.sanctionskit.com/guides/mcp-integration) · [Authentication](docs/authentication.md) · [MIT license](LICENSE)

## Get started

Clone this repository and open its directory. Install with the instructions for your client below, then try:

> Find the SanctionsKit screening request schema and validate an invented example without submitting it.

Documentation, schemas, and request validation work without a SanctionsKit account. Sandbox account tools require a connection to a SanctionsKit workspace. Each client's OAuth registration must be configured on the hosted service; see [authentication setup](docs/authentication.md).

### Connect to the hosted MCP server

You can also connect directly from an MCP client using **Streamable HTTP** at:

```text
https://www.sanctionskit.com/mcp
```

Public documentation, schema, and validation tools need no credentials. For sandbox account tools, sign in through the client's OAuth connection flow after its client ID and callback have been registered with SanctionsKit. The requested scopes are `sources:read`, `screenings:write`, `results:read`, and `usage:read`. See [authentication setup](docs/authentication.md) for client configuration and verification status.

### Codex

From the repository root:

```sh
codex plugin marketplace add .
```

Open the plugin directory in Codex, choose the **SanctionsKit** marketplace, and install **SanctionsKit**. Start a new task after installation. For a GitHub installation, pass this repository's HTTPS GitHub URL to the same command instead of `.`.

### Claude Code

Start Claude Code in the repository root:

```text
/plugin marketplace add .
/plugin install sanctionskit@sanctionskit
```

You can also give `/plugin marketplace add` this repository's HTTPS GitHub URL. Restart Claude Code after installation. Use `/mcp` to inspect the connection and sign in when account tools are needed.

### Cursor

For a local installation, enable **Allow Local Plugin Imports** in Cursor, copy the plugin folder into its local plugin directory, then reload Cursor. Enterprise policies may require an administrator to allow local imports.

```sh
mkdir -p ~/.cursor/plugins/local
cp -R plugins/sanctionskit ~/.cursor/plugins/local/
```

This command is for a first install; replace the existing `sanctionskit` folder when updating. Use a real copy, since Cursor skips external symlink targets. Team administrators can use **Import from Repo** in their team's plugin marketplace with this repository's GitHub URL. A public Cursor directory listing requires a separate submission.

### Gemini CLI

Install the extension from this repository:

```sh
gemini extensions install https://github.com/SanctionsKit/sanctions-kit-mcp-plugin
```

Restart Gemini CLI, then use `/mcp` to inspect the `sanctionskit` connection. Try:

> Find the SanctionsKit screening request schema and validate an invented example without submitting it.

The root `gemini-extension.json` uses Streamable HTTP and allows only `search_docs`, `get_doc`, `get_api_schema`, and `validate_screening_request`. It includes no credentials, OAuth configuration, local executable, or bundled context file. Request validation checks structure only; it does not submit a screening or check a real subject. Gemini CLI's own access requirements still apply.

Sandbox screening and other account tools are not part of this extension. The integration skill bundled for the other clients is not installed by the Gemini extension. If you already configured a server named `sanctionskit` in Gemini's `settings.json`, that configuration takes precedence; remove or rename it if you intend to use this extension's public-tool configuration.

## What you can do

| Tool | Purpose | Connection |
| --- | --- | --- |
| `search_docs` | Find integration guides and document slugs | Public |
| `get_doc` | Read a document from the published catalog | Public |
| `get_api_schema` | Inspect REST operations, schemas, and examples | Public |
| `validate_screening_request` | Check request structure without submitting it | Public |
| `list_sources` | Inspect source metadata and availability | Sandbox workspace |
| `run_sandbox_screening` | Submit invented subjects to `sandbox@1` | Sandbox workspace |
| `get_screening_result` | Retrieve retained sandbox evidence | Sandbox workspace |
| `get_usage` | Check sandbox allowance and reservations | Sandbox workspace |
| `get_profile` | Identify the connected profile | Sandbox workspace |

The bundled `sanctionskit-integration` skill covers request design, validation, error handling, retries, and interpreting sandbox results. It uses the current tool schemas and documentation instead of assuming an SDK or endpoint exists.

Try these next:

- “Show me how to add SanctionsKit screening to my server-side TypeScript app.”
- “Validate a `sandbox@1` request for an invented organization.”
- “Run the synthetic Alex Morgan example, then show the result and remaining sandbox allowance.”
- “Explain how I should retry a request after a timeout.”

See the [synthetic request examples](plugins/sanctionskit/skills/sanctionskit-integration/examples/sandbox-requests.json) and [MCP argument examples](plugins/sanctionskit/skills/sanctionskit-integration/examples/mcp-calls.json).

## Sandbox behavior

MCP account tools operate in the sandbox. Production keys are rejected. A sandbox screening consumes sandbox allowance, retains evidence according to its retention policy, and may create a review case. Use a new idempotency key for a new intended screening; keep both the key and payload unchanged when retrying a lost response.

Validation checks structure only. Source catalog entries do not change the sandbox's synthetic coverage. A synthetic result says nothing about a real person or organization, and a no-match result is not legal clearance. Production integrations use the server-side REST API and your organization's review process.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Plugin does not appear | Add the repository root as the marketplace, install the plugin, and start a new session. |
| `invalid_client` or redirect error | Check the exact client ID and registered callback in [authentication setup](docs/authentication.md). |
| Sign-in or permission error | Reconnect the sandbox workspace with the required scopes. |
| Port already in use | Close the other login flow using that port, then retry. |
| Production key rejected | Use a sandbox connection for MCP; keep production integration in the REST API. |
| Result has expired | Report the expiry; create a new screening only if a new run is intended. |
| Coverage or allowance error | Inspect the returned error and current sandbox usage. Do not switch coverage silently. |

## Development

Node.js 22 or later is needed only for the repository checks. There are no npm dependencies.

```sh
npm ci
npm run check
npm run smoke
```

`check` validates package structure and runs offline tests. `smoke` checks the public hosted MCP endpoint and its authentication challenge without signing in or creating screenings. A passing smoke check does not establish that a client's interactive sign-in works.

```text
.agents/plugins/       Codex marketplace
.claude-plugin/        Claude Code marketplace
.cursor-plugin/        Cursor marketplace
gemini-extension.json  Gemini CLI public-tool extension
plugins/sanctionskit/  Installable plugin, client configs, skill, and assets
docs/                  Authentication and release guidance
scripts/               Package validation and public connection check
tests/                 Offline verification
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for changes and [the release guide](docs/releasing.md) for publishing.

Maintained by SanctionsKit, LLC. For help, contact [support@sanctionskit.com](mailto:support@sanctionskit.com). The MIT license covers this repository; hosted service use is governed by the [SanctionsKit terms](https://www.sanctionskit.com/terms) and [privacy policy](https://www.sanctionskit.com/privacy).
