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
