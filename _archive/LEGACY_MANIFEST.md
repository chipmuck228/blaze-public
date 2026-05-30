# Legacy Manifest

| Path | Tier | Status | Replacement | Notes |
|------|------|--------|-------------|-------|
| _archive/components/AllCamps.tsx | A | isolated | src/components/Camps.tsx | Zero imports |
| _archive/components/UserAnalytics.tsx | A | isolated | — | API exists; no page mounts component |
| _archive/components/mode-toggle.tsx | A | isolated | theme-provider | Zero imports |
| _archive/components/location/LocationFeaturedCourses.tsx | A | isolated | LocationProgramsByCategory | Zero imports |
| _archive/components/location/LocationFeature.tsx | A | isolated | LocationFeatures.tsx | Zero imports |
| _archive/components/location/ContactButton.tsx | A | isolated | — | Zero imports |
| _archive/components/ui/carousel.tsx | A | isolated | — | shadcn orphan |
| _archive/components/ui/switch.tsx | A | isolated | — | shadcn orphan |
| _archive/components/ui/button-variants.ts | A | isolated | button.tsx inline cva | Duplicate |
| _archive/components/ui/responsive-table.tsx | A | isolated | — | Zero imports |
| _archive/lib/platform.ts | A | isolated | usePlatform + mobile-detection | Zero imports |
| _archive/hooks/useMobileBrowser.ts | A | isolated | usePlatform | Zero imports |
| _archive/scripts/test-phase*.js | A | isolated | — | Manual integration tests |
| _archive/scripts/run-phase1-migrations.js | A | isolated | — | One-off migration |
| _archive/scripts/run-offering-prerequisites-migration.js | A | isolated | — | One-off migration |
| _archive/scripts/create-coach-user.js | A | isolated | scripts/create-coach-user.ts | Duplicate |
| _archive/scripts/sql/v2_instance_*.sql | A | isolated | v2/ DDL | Applied migrations |
| _archive/admin-pages/series/page.tsx | B | isolated | /admin/blaze/programs | Redirect in src |
| _archive/admin-pages/instances/page.tsx | B | isolated | /admin/blaze/instance | Redirect in src |
| _archive/admin-pages/assignments/page.tsx | B | isolated | /admin/guide | No 1:1 Blaze page |
| _archive/admin-pages/offerings/page.tsx | B | isolated | /admin/blaze/offerings | Redirect in src |
| _archive/admin-pages/categories/page.tsx | B | isolated | /admin/blaze/categories | Redirect in src |
| _archive/admin-pages/franchises/page.tsx | B | isolated | /admin/blaze/franchises | Redirect in src |
| _archive/admin-pages/locations/page.tsx | B | isolated | /admin/blaze/campuses | Redirect in src |
| _archive/admin-pages/offering-types/page.tsx | B | isolated | /admin/blaze/offering-types | Redirect in src |
| _archive/admin-pages/guide/page.tsx | B | isolated | src/app/admin/guide/page.tsx | Legacy schema-driven admin guide (archived 2026-05) |
| _archive/admin-pages/subcategories/page.tsx | B | isolated | /admin/guide | No v2 equivalent |
| _archive/components/admin/InstanceCreateDialog.tsx | B | isolated | InstanceCreateDialogV2 | Was series-only |
| _archive/components/admin/BatchCreateInstanceDialog.tsx | B | isolated | InstanceCreateDialogV2 | Was instances/assignments |
| _archive/components/admin/OfferingEditDialog.tsx | B | isolated | blaze offerings admin | Orphan after page archive |
| _archive/components/admin/CourseEditDialog.tsx | B | isolated | /admin/guide | Orphan after page archive |
| _archive/components/admin/CourseDetailDialog.tsx | B | isolated | — | Orphan after page archive |
| _archive/components/admin/CoursePrerequisitesManager.tsx | B | isolated | — | Orphan after page archive |
| _archive/components/admin/FranchiseContentEditDialog.tsx | B | isolated | blaze franchises | Orphan after page archive |
| src/app/api/students/me/route.ts | — | fixed | — | Added for Navbar student check |
| src/app/settings/payment/page.tsx | — | fixed | /api/user/payment-methods | Was wrong API path |
| _archive/design/FRANCHISE_CONFIG_EXAMPLES.md | D | isolated | v2/ DDL | Moved from v2/ |
| src/app/api/public/programs-v2/route.ts | C | registered | /api/programs | No frontend fetch |
| src/app/api/public/featured-categories/route.ts | C | registered | /api/public/categories | No frontend fetch |
| src/app/api/public/franchises/[code]/route.ts | C | registered | franchises-v2 | No frontend fetch |
| src/app/api/public/franchises/[code]/featured-courses/route.ts | C | registered | — | No frontend fetch |
| src/app/api/public/franchises/[code]/locations/route.ts | C | registered | public/locations | No frontend fetch |
| src/app/api/admin/stats/route.ts | C | registered | admin/stats/* sub-routes | Dashboard uses sub-routes |
| src/app/api/admin/offerings/available/route.ts | C | registered | offerings/v2/available | useLegacy never sent from UI |
| src/app/api/cron/check-waitlist/route.ts | C | registered | — | Not in vercel.json crons |
| src/app/api/blaze/franchises/route.ts | C | registered | admin/franchises/v2 | No fetch callers |
| src/app/api/blaze/franchises/[id]/route.ts | C | registered | admin/franchises/v2 | No fetch callers |
| src/app/api/blaze/programs/route.ts | C | registered | admin/programs/v2 | No fetch callers |
| src/app/api/blaze/programs/[id]/route.ts | C | registered | admin/programs/v2 | No fetch callers |
| src/app/api/blaze/programs/hierarchy/route.ts | C | registered | admin/programs/v2/hierarchy | No fetch callers |
| src/app/api/blaze/categories/route.ts | C | registered | admin/categories/v2 | No fetch callers |
| src/app/api/blaze/categories/[id]/route.ts | C | registered | admin/categories/v2 | No fetch callers |
| src/app/api/blaze/offering-types/route.ts | C | registered | admin/offering-types/v2 | No fetch callers |
| src/app/api/blaze/offering-types/[id]/route.ts | C | registered | admin/offering-types/v2 | No fetch callers |
| src/app/api/blaze/offerings/[id]/route.ts | C | registered | admin/offering/v2 | No fetch callers |
| src/app/api/blaze/instances/route.ts | C | registered | admin/instance/v2 | Only [id] used |
| src/lib/db-v2.ts | C | deprecated | v2_* + supabaseAdmin | Do not extend |
| src/lib/db.ts | C | active | — | auth/enrollment/payment; delete after migration |
