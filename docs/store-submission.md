# Public ChatGPT and Claude directory package

The package in `store/sanctionskit` is intended for a public **SanctionsKit** listing in ChatGPT and Claude. It reuses the deployed nine-tool developer MCP service. Existing editor packages remain separate. This is a submission candidate, not an accepted or published directory listing.

## Package and publishing paths

Run `python3 scripts/package-store.py`. It validates the package's local constraints and creates `dist/sanctionskit-store-0.1.0.zip`. The archive contains only the plugin folder's contents, including hidden manifests; it excludes credentials, Git history, internal reports, and repository tooling.

- **ChatGPT:** upload this ZIP to [OpenAI Platform Plugins](https://platform.openai.com/plugins). The authoritative manifest is root `plugin.json`, with MCP authentication in `mcp.json`. `.codex-plugin/plugin.json` is a compatibility fallback. The portable manifest supplies the support URL, square icon, concise subtitle, and exactly five positive and three negative review cases.
- **Claude connector:** submit `https://www.sanctionskit.com/mcp` through [Claude's developer portal](https://claude.ai/directory/manage), using the intended long-term company organization. Configure its OAuth connection and complete actual hosted tool tests.
- **Claude plugin:** from that same organization, submit the public company repository, directory `store/sanctionskit`, after the reviewed files have been published. Use the same MCP URL and pair the connector and plugin listings. Claude reads `.claude-plugin/plugin.json` and `.mcp.json`; no desktop loopback callback is packaged.

Publishing the repository must use the company GitKraken account and commit identity. Neither a repository publication nor a local validator establishes directory acceptance. OpenAI approval is followed by a separate Publish action. Claude's plugin-bundle review and connector status must each be checked in the portal.

## Authentication setup still required

The OpenAI package proposes the existing documented client ID `sanctionskit-openai`, `client_secret_post`, and mixed public/OAuth access. **Registration of that client is not verified.** Before connecting, obtain the exact callback from the portal, register that callback and the confidential client in the hosted service, and enter its secret only in approved secret storage and the portal's secret field. Update the package if the registered client ID or method differs. Do not guess a callback or embed a secret in a manifest.

Claude needs its own connector client registration with the exact callback and authentication method displayed by its portal. Do not reuse the Claude Code localhost callback. The bundle references the same hosted URL; configure its directory connector from the same submitting organization.

SanctionsKit currently advertises registered clients rather than DCR or CIMD. Confirm this against live discovery before connection. Do not declare automatic registration or a no-auth-only server to avoid the account tools' authentication requirements. Preserve existing client registrations when adding store clients.

## Review gates

1. The owner confirmed API development and synthetic sandbox tools as the first release's scope. Adding public-record search or production screening requires a separate implementation and fresh test evidence.
2. Finish publisher account onboarding and check for prior submissions before creating a draft. OpenAI requires verified company identity and Apps Management Write. Claude requires a paid plan and the applicable organization role. An eligible individual Pro account can submit; a Team subscription is not required solely for directory publication.
3. Register and test each store OAuth client, including consent, refresh, revocation, tenant isolation, expired evidence, scope restrictions, and production-token rejection.
4. Prepare dedicated reviewer workspaces with invented data and suitable access. Keep credentials and fixture IDs out of the package and public repository. OpenAI reviewers require a working test account without inaccessible MFA or email-code steps.
5. Execute the five positive and three negative OpenAI cases on the supported ChatGPT surfaces. Exercise every Claude connector tool and load the skill on the intended Claude surfaces. A public protocol smoke check does not complete these tests.
6. Record an actual video walkthrough and put its accessible URL in `extensions.com.openai.review.demo_recording_url`. No demo URL or screenshot is fabricated. No custom UI is declared.
7. Complete OpenAI's exact domain challenge. Choose publication countries intentionally. The package omits country targeting and does not silently select worldwide availability.
8. Review portal findings, listing copy, data-handling statements, terms, and policy attestations with the owner. Then submit, follow the review, and publish the approved versions.

The local package validator does not call these external checks passed. Keep actual client-test evidence, reviewer access, and submission receipts in a separate private record, outside the ZIP and public repository.

## Validator results and schema limitation

The candidate passes the local packaging checks, Codex plugin manifest validator, and Claude Code 2.1.301 plugin validator. Claude's validator advises adding a marketplace install command; no such command is supplied until a real public installation destination exists.

The Agent Plugins 1.0.0 `plugin.json` schema accepts the portable manifest. The generic `mcp.json` schema accepts the transport configuration without host extensions but rejects the `extensions` property. Current OpenAI documentation explicitly requires per-server `extensions["com.openai"].auth` for this authentication configuration. The candidate retains that documented OpenAI extension. This is a known difference between the generic schema and OpenAI's submission format, not a passed full MCP schema check. The actual OpenAI portal must validate the complete package before submission.

A live anonymous MCP smoke check passed initialization, the nine-tool catalog, documentation search/read, schema lookup, structural validation, and the account authentication challenge. No screening was submitted and no account credentials were used. These checks do not establish either host's OAuth or connected sandbox behavior.

## Current first-party references

- [OpenAI submission workflow](https://developers.openai.com/plugins/deploy/submission)
- [OpenAI packaging and authentication](https://developers.openai.com/plugins/build/plugins)
- [OpenAI plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines)
- [Claude directory publication and paired submissions](https://claude.com/docs/directory/publish)
- [Claude plugin checks](https://claude.com/docs/plugins/pre-submission-checklist)
- [Claude connector submission](https://claude.com/docs/connectors/building/submission)

The 19 September OpenAI handoff predates the current ZIP metadata workflow. Use these current requirements and the observed portal state when continuing.
