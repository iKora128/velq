# Security Policy

## Supported versions

Only the latest release of Velq (0.x) receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

- Preferred: [GitHub private vulnerability reporting](https://github.com/iKora128/velq/security/advisories/new)
- Or email: ndaichi.0128@gmail.com

You'll get an acknowledgement within 72 hours. Please include reproduction
steps and, if possible, a minimal document or `.velq` package that triggers
the issue.

## Scope notes

The `.velq` viewer is a permission-zero sandbox: JavaScript inside a package
may run, but must never reach the filesystem, the network, or Tauri commands
(see [docs/velq-format.md](docs/velq-format.md)). Any escape from that
sandbox — a `fetch` or `invoke` succeeding from viewer content, path
traversal during unpack — is a high-severity vulnerability and exactly what
this policy exists for.
