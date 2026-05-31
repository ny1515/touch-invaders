# Security and Privacy Notes

Touch Invaders is a static browser game. It does not use a backend server, API keys, passwords, database connections, analytics, forms, or admin screens.

## Current Rules

- Do not publish company-internal information or personal information in this repository.
- Do not commit API keys, passwords, tokens, private keys, or database connection strings.
- Any future admin screen or data-changing feature must require authentication and authorization before it is published.
- The service worker may cache only the known static app assets listed in `service-worker.js`.

## Before Adding Features

If a future change adds network calls, user accounts, score submission, admin tools, or data storage, review the change for secrets, personal data, authentication, authorization, and cache behavior before publishing.
