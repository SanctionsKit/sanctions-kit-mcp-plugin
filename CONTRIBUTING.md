# Contributing

Keep changes focused on the plugin, its integration guidance, or its client configuration. The hosted MCP service is maintained separately.

Use Node.js 22 or later:

```sh
npm ci
npm run check
```

When changing connection behavior, also run `npm run smoke` and test sign-in in the affected client. The smoke check exercises public operations only. Record what you actually tested in the pull request.

Keep plugin versions consistent across `package.json` and the three client manifests. Check paths from the installable plugin root, since hosts copy that directory when installing. Match tool names and examples to the published MCP schema.

Use invented subjects in examples and tests. Keep credentials, customer information, saved results, and local configuration out of patches and issue reports. Report security concerns privately using [SECURITY.md](SECURITY.md).

Write short commit messages describing the user-facing change, such as `Fix Cursor sign-in instructions`. Explain a non-obvious tradeoff in the pull request rather than listing every file changed.
