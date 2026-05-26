# Archive Directory

Isolated code and design files scheduled for deletion. **Do not add new features here.**

## Policy

1. Files move here instead of immediate deletion so we can verify no regressions.
2. Nothing in `_archive/` is compiled by Next.js or TypeScript (`tsconfig` exclude).
3. Before permanent deletion, check `LEGACY_MANIFEST.md` and run `npm run build` + `npm run lint`.

## Structure

| Directory | Contents |
|-----------|----------|
| `components/` | Unused React components |
| `hooks/` | Unused hooks |
| `lib/` | Unused lib modules |
| `scripts/` | One-off migration and phase test scripts |
| `admin-pages/` | Legacy admin UI (sidebar hidden; replaced by `/admin/blaze/*`) |
| `design/` | Non-DDL design docs |

## Deletion checklist

- [ ] No imports from `src/` point into `_archive/`
- [ ] Redirect pages exist for any archived admin routes
- [ ] Manifest entry marked `ready-to-delete`
- [ ] One sprint without issues after isolation
