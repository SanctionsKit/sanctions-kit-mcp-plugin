# SanctionsKit

![SanctionsKit](assets/icon.png)

Build integrations with the [SanctionsKit sanctions screening API](https://www.sanctionskit.com/docs/quickstart). Find current documentation, inspect request schemas, validate payloads, and test invented subjects in a connected synthetic sandbox.

## What you can do

- Find API documentation with `search_docs` and read it with `get_doc`.
- Inspect REST operations and response fields with `get_api_schema`.
- Check request structure with `validate_screening_request` without submitting a screening.
- Connect a sandbox workspace to inspect its profile, source metadata, and usage, run an invented screening, and retrieve its retained result.

Documentation, schemas, and request validation need no SanctionsKit account. The account tools use the host's OAuth connection flow. Let ChatGPT or Claude handle sign-in; never paste passwords, tokens, or API keys into a conversation.

## Try these prompts

- “Find SanctionsKit's idempotency guidance and explain how to retry a lost response.”
- “Validate an invented organization named Juniper Example Cooperative using sandbox@1, without submitting it.”
- “Using my connected sandbox, run the invented Alex Morgan example, retrieve the result, and show my remaining allowance.”

The integration skill works in a chat or an open code project. In chat, it explains the API and prepares code for review. In a code project, it follows the project's conventions and the changes you request.

## Scope and data handling

The plugin connects to the hosted [SanctionsKit MCP service](https://www.sanctionskit.com/resources/mcp) using Streamable HTTP. It has no local server, installation command, background job, or bundled credential. Tool queries and arguments are sent to SanctionsKit at `https://www.sanctionskit.com/mcp`; the package does not request conversation history.

Account tools are sandbox-only and require invented inputs. A sandbox screening consumes allowance, saves evidence under the workspace retention policy, and may create a review case. Retrieving saved evidence also records evidence access. Keep the same idempotency key and payload when retrying the same run. Validation only checks structure; it does not establish coverage or a screening result.

This version does not search real public sanctions records, run production screenings, change billing, enroll monitors, or decide cases. A synthetic result says nothing about a real person or organization. A potential match requires human review, and a no-match is not legal clearance. The plugin can explain a production REST integration from the documentation, but it does not execute production work.

## Connection help

If the host asks you to connect, use its SanctionsKit connection control. If sign-in is unavailable or the client is not registered, public documentation tools can still help; contact support for account-linking assistance. Do not work around an account error by sharing credentials in chat. Report coverage, allowance, and expired-evidence errors directly rather than silently changing the request or starting another screening.

Maintained by **SanctionsKit LLC**. [MCP setup documentation](https://www.sanctionskit.com/guides/mcp-integration) · [Support](https://www.sanctionskit.com/contact) · [Privacy policy](https://www.sanctionskit.com/privacy) · [Service terms](https://www.sanctionskit.com/terms).

The [MIT license](LICENSE) applies to these plugin files. Hosted service use is governed by the service terms. Preparing this package does not establish directory approval or publication.
