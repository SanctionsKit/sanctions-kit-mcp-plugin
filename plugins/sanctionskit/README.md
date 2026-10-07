# SanctionsKit

Build SanctionsKit API integrations with documentation lookup, request-structure validation, and synthetic sandbox screening. This plugin connects to the hosted [SanctionsKit MCP server](https://www.sanctionskit.com/resources/mcp) and includes an integration skill for planning requests, interpreting errors, preserving evidence, and handling retries.

The connection uses Streamable HTTP at `https://www.sanctionskit.com/mcp`. There is no local server, executable, install script, or API key bundled with the plugin. Queries and tool arguments are sent to SanctionsKit's hosted service. The [privacy policy](https://www.sanctionskit.com/privacy) and [service terms](https://www.sanctionskit.com/terms) describe the service's data practices and conditions.

## Start with the public tools

These four tools need no SanctionsKit account:

| Tool | Purpose |
| --- | --- |
| `search_docs` | Find integration documentation and document slugs. |
| `get_doc` | Read a document from the published catalog. |
| `get_api_schema` | Inspect REST operations, schemas, and examples. |
| `validate_screening_request` | Check a request's structure without submitting a screening. |

Try these prompts:

- Find SanctionsKit's quickstart and explain the difference between synthetic sandbox and production screening.
- Show the screening request schema and its required fields.
- Validate a `sandbox@1` request for an invented organization without submitting it.

Request validation checks structure only. It does not look up a real subject, produce a screening result, or establish legal clearance.

## Connect a sandbox workspace

The account tools are `list_sources`, `run_sandbox_screening`, `get_screening_result`, `get_usage`, and `get_profile`. They need a sandbox workspace connection through the client's OAuth flow. Each client's ID and callback must be registered with SanctionsKit; see the [authentication setup and verification status](https://github.com/SanctionsKit/sanctions-kit-mcp-plugin/blob/main/docs/authentication.md).

MCP account tools operate in the synthetic sandbox. Production keys are rejected. A sandbox screening consumes sandbox allowance, retains evidence according to the retention policy, and may create a review case. Use invented subjects. Keep the idempotency key and payload unchanged when retrying a lost response; use a new key for a new intended screening.

For example, after connecting: “Run the synthetic Alex Morgan example, then retrieve its result and remaining sandbox allowance.” Source catalog entries do not change synthetic sandbox coverage. A synthetic result says nothing about a real person or organization.

Production integrations use the server-side REST API and a separate paid plan. See the [API quickstart](https://www.sanctionskit.com/docs/quickstart), [production coverage](https://www.sanctionskit.com/coverage), and [pricing](https://www.sanctionskit.com/pricing).

## Install in Claude Code

Add the repository as a marketplace, then install the plugin:

```text
/plugin marketplace add https://github.com/SanctionsKit/sanctions-kit-mcp-plugin
/plugin install sanctionskit@sanctionskit
```

Restart Claude Code and inspect the connection with `/mcp`. This repository installation does not imply acceptance into Anthropic's public directory. Other client instructions are in the [repository README](https://github.com/SanctionsKit/sanctions-kit-mcp-plugin#readme).

## Get help

If authentication reports an invalid client or callback, check the registered client configuration before retrying. For allowance, coverage, or expired-result errors, inspect the returned error and documentation; do not silently change coverage or create a replacement screening.

Maintained by SanctionsKit, LLC. Contact [support@sanctionskit.com](mailto:support@sanctionskit.com). The bundled [MIT license](LICENSE) covers the plugin files; hosted service use follows the service terms above.
