# Contributing

Keep changes focused on the plugin, its integration guidance, or its client configuration. The hosted MCP service is maintained separately.

Use Node.js 22 or later:

```sh
npm ci
npm run check
```

When changing connection behavior, also run `npm run smoke`. For clients configured with account tools, test sign-in in the affected client; for the public-only Gemini extension, verify the four-tool allowlist without SanctionsKit sign-in. The smoke check exercises public operations only. Record what you actually tested in the pull request.

Keep versions consistent across `package.json`, the three plugin manifests, and `gemini-extension.json`. Check paths from the installable plugin root, since hosts copy that directory when installing. Match tool names and examples to the published MCP schema. The Gemini extension exposes public tools only; do not add account tools or credentials to its configuration.

Use invented subjects in examples and tests. Keep credentials, customer information, saved results, and local configuration out of patches and issue reports. Report security concerns privately using [SECURITY.md](SECURITY.md).

Write short commit messages describing the user-facing change, such as `Fix Cursor sign-in instructions`. Explain a non-obvious tradeoff in the pull request rather than listing every file changed.
