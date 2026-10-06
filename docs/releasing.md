# Publishing a release

## First publication

Create an empty public GitHub repository under the intended account or organization. Push this repository to it using GitHub's displayed remote URL. No particular GitHub namespace is assumed by the package: marketplace entries resolve within the checkout.

Install from that public GitHub URL using the README instructions and confirm the repository contains the complete `plugins/sanctionskit` directory. GitHub source hosting and client directory listings are separate; publishing here does not submit the plugin to a client's public directory.

## Release checks

1. Update the version in `package.json`, its lockfile, and the Codex, Claude Code, and Cursor manifests together.
2. Run `npm ci` and `npm run check` from a clean checkout.
3. Run `npm run smoke` against the public service.
4. Install the package in each client being advertised. Test public documentation, interactive sign-in, one intended synthetic screening, retrieval, and usage. A screening uses sandbox allowance and may create a review case. Never use customer inputs for these checks.
5. Confirm client IDs and callbacks are registered as described in [authentication.md](authentication.md). Record untested clients or blocked account flows in the release notes.
6. Move the completed changes from “Unreleased” to the new version in `CHANGELOG.md`, using the actual release date.
7. Commit the release, tag that commit with its version, and create the GitHub release from that tag. Include the checks performed and any remaining limitations.

Keep credentials and local diagnostic output out of source archives. The installable folder can be copied on its own; its manifests reference only files inside that folder.

## MCP Registry metadata

The root [`server.json`](../server.json) describes the hosted MCP server in the official MCP Registry. Its `repository` points to this public GitHub repository so downstream directories, including GitHub's MCP Registry, can find the README. Keep this repository public and its configuration and usage instructions current.

Registry metadata releases are independent of plugin releases. The top-level version in `server.json` does not need to match `package.json` or the plugin manifests. Every publication needs a new version because the official registry does not allow published metadata to be changed. Use a version greater than the current latest version for a correction: for example, publish `1.0.1` after `1.0.0`. A `1.0.0-1` prerelease sorts before `1.0.0` and would not become latest. See the [registry versioning guidance](https://modelcontextprotocol.io/registry/versioning).

1. Confirm the existing registry name, remote URL, and latest version. Preserve the server name when updating metadata.
2. Update `server.json`, retaining the public repository URL and incrementing its version.
3. Run `npm run check` and validate with the official [`mcp-publisher` CLI](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/cli/commands.md):

   ```sh
   mcp-publisher validate server.json
   ```

4. Authenticate with a GitHub account authorized to publish the existing `io.github.SanctionsKit/*` namespace, then publish:

   ```sh
   mcp-publisher login github
   mcp-publisher publish server.json
   ```

   The registry destination comes from the stored login token. If selecting a registry explicitly, pass `--registry` to `login`, not `publish`. Authentication files named `.mcpregistry_*` are ignored by Git; keep them out of commits and release archives.

5. Read the published entry from the official registry and confirm the new version is latest and includes the correct `repository.url` and `repository.source`. A Git push alone does not update the registry. If a downstream directory requested the correction, provide that verified publication information when requesting another review.
