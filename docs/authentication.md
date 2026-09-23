# Connecting a workspace

The plugin connects to `https://www.sanctionskit.com/mcp`. Sandbox screening, saved sandbox results, source access, and usage require workspace authorization. Use the client's connection controls to sign in to SanctionsKit and approve the requested access. Claude Code exposes these controls through `/mcp`.

The package includes separate connection settings for each desktop client:

| Client | Public client ID | Exact redirect URI |
| --- | --- | --- |
| Codex | `sanctionskit-codex` | `http://127.0.0.1:43127/callback` |
| Claude Code | `sanctionskit-claude-code` | `http://localhost:43128/callback` |
| Cursor desktop | `sanctionskit-cursor` | `http://localhost:8787/callback` |

These are configuration targets. The hosted service's registration of these clients and successful sign-in from each application have not been verified for this package. Installation alone does not establish that authenticated tools will work. The service operator must register the matching client and redirect URI before sandbox access can be used.

The public client IDs are identifiers, not secrets. The browser sign-in uses authorization codes with PKCE. Do not add a client secret, dashboard API key, access token, or refresh token to this repository.

## Service operator setup

SanctionsKit requires pre-registered OAuth clients and exact redirect URI matching. It does not advertise dynamic client registration. The following entries illustrate the required public clients for the server's `MCP_OAUTH_CLIENTS` configuration:

```json
[
  {
    "client_id": "sanctionskit-codex",
    "client_name": "SanctionsKit for Codex",
    "redirect_uris": ["http://127.0.0.1:43127/callback"],
    "token_endpoint_auth_method": "none"
  },
  {
    "client_id": "sanctionskit-claude-code",
    "client_name": "SanctionsKit for Claude Code",
    "redirect_uris": ["http://localhost:43128/callback"],
    "token_endpoint_auth_method": "none"
  },
  {
    "client_id": "sanctionskit-cursor",
    "client_name": "SanctionsKit for Cursor",
    "redirect_uris": ["http://localhost:8787/callback"],
    "token_endpoint_auth_method": "none"
  }
]
```

Merge the needed entries with existing server registrations, preserving other clients and keeping each client ID unique. This repository does not apply server configuration or register OAuth clients. After registration, test sign-in and an invented sandbox example in each application before declaring that connection supported.

Cursor's included configuration targets the desktop callback only. Web authentication needs a separately registered redirect URI and its own verification.

## Connection problems

- **Client is not registered:** the service operator must register the exact public client ID above.
- **Redirect URI is not registered:** verify the complete scheme, hostname, port, and path. `localhost` and `127.0.0.1` are distinct registrations.
- **Callback cannot start:** close another connection flow using the same local port, then reconnect.
- **Workspace access denied:** sign in with a workspace account authorized to use the requested sandbox tools.

The requested scopes are `sources:read`, `screenings:write`, `results:read`, and `usage:read`. Through this MCP service they apply to sandbox integration workflows. They do not enable production screening or compliance decisions.

Configuration references: [Claude Code OAuth](https://code.claude.com/docs/en/mcp#use-pre-configured-oauth-credentials), [Cursor static OAuth](https://cursor.com/docs/mcp#static-oauth-for-remote-servers), and [SanctionsKit MCP](https://www.sanctionskit.com/resources/mcp).
