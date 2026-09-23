# Security

Send vulnerability reports to [support@sanctionskit.com](mailto:support@sanctionskit.com) with the subject “Plugin security report.” Include affected versions, reproduction steps, and the expected behavior. Please avoid public issues for credential exposure or access-control vulnerabilities.

Remove tokens, API keys, customer inputs, and screening results from reports. If a key has been exposed, revoke it in SanctionsKit and replace it before sharing diagnostics.

This repository contains connection settings and integration guidance. It contains no credentials and runs no installation hooks. Authentication and screening requests go to `https://www.sanctionskit.com`; the hosted service's [privacy policy](https://www.sanctionskit.com/privacy) applies.
