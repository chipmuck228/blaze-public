# Legacy Manifest

| Path | Tier | Status | Replacement | Notes |
|------|------|--------|-------------|-------|
| _archive/web-pages/course-catalog/** | B | archived | /programs | V1 catalog; redirects in next.config.ts |
| _archive/web-pages/course/page.tsx | B | archived | /programs | Marketing |
| _archive/web-pages/camps/page.tsx | B | archived | /programs | Marketing |
| _archive/web-pages/competition/page.tsx | B | archived | /journey/compete | Marketing |
| _archive/web-pages/learning-paths/** | B | archived | /programs | No nav entry |
| _archive/web-pages/about/faq/page.tsx | B | archived | /faq | Duplicate of /faq |
| _archive/web-pages/settings/notifications/page.tsx | B | archived | /profile | Prefs on Profile |
| _archive/web-pages/billing/page.tsx | B | archived | /portal | Duplicate of portal billing tab |
| _archive/web-pages/robotics-for-beginners/page.tsx | B | archived | /programs?category=beginner_robotics | SEO landing; no nav link |
| src/app/settings/account/page.tsx | B | archived | /profile | next.config redirect (2026-05) |
| _archive/components/AllCourses.tsx | B | archived | /programs | Was course-catalog only |
| _archive/components/AllCoursesMobile.tsx | B | archived | /programs | Was course-catalog only |
| _archive/components/CourseDetail.tsx | B | archived | /category/.../instance | Was course-catalog only |
| _archive/components/LearningPathsList.tsx | B | archived | /programs | Was learning-paths page |
| _archive/components/LearningPathDetail.tsx | B | archived | /programs | Was learning-paths [slug] |
| _archive/components/Camps.tsx | B | archived | /programs | Zero imports; /camps page archived |
| _archive/components/Courses.tsx | B | archived | /programs | Zero imports |
| _archive/admin-pages/series/page.tsx | B | archived | /admin/blaze/programs | next.config redirect |
| _archive/admin-pages/instances/page.tsx | B | archived | /admin/blaze/instance | next.config redirect |
| _archive/admin-pages/assignments/page.tsx | B | archived | /admin/guide | next.config redirect |
| _archive/admin-pages/offerings/page.tsx | B | archived | /admin/blaze/offerings | next.config redirect |
| _archive/admin-pages/categories/page.tsx | B | archived | /admin/blaze/categories | next.config redirect |
| _archive/admin-pages/franchises/page.tsx | B | archived | /admin/blaze/franchises | next.config redirect |
| _archive/admin-pages/locations/page.tsx | B | archived | /admin/blaze/campuses | next.config redirect |
| _archive/admin-pages/offering-types/page.tsx | B | archived | /admin/blaze/offering-types | next.config redirect |
| _archive/admin-pages/courses/page.tsx | B | archived | /admin/guide | next.config redirect |
| _archive/admin-pages/subcategories/page.tsx | B | archived | /admin/guide | next.config redirect |
| _archive/admin-pages/offerings-assignments/page.tsx | B | archived | /admin/guide | next.config redirect |
| _archive/admin-pages/settings/page.tsx | B | archived | /admin | Placeholder |
| _archive/admin-pages/newsletter/statistics/page.tsx | B | archived | subscribers?tab=statistics | Tab on subscribers |
| _archive/admin-pages/newsletter/unsubscribe-stats/page.tsx | B | archived | subscribers?tab=unsubscribe-stats | Tab on subscribers |
| _archive/admin-pages/learning-paths/page.tsx | B | archived | /admin/guide | V1 path CRUD; not in sidebar |
| _archive/components/admin/LearningPathEditDialog.tsx | B | archived | — | Orphan after learning-paths page archive |
| _archive/api-routes/admin/learning-paths/** | B | archived | — | V1 path CRUD; was /api/admin/learning-paths |
| _archive/api-routes/learning-paths/** | B | archived | — | Public list/detail; was /api/learning-paths |
| _archive/api-routes/user/learning-paths/** | B | archived | — | Recommended + progress; no active UI |
| _archive/api-routes/user/analytics/route.ts | B | archived | — | Was /api/user/analytics; UserAnalytics only |
| _archive/lib/learning-paths-db.ts | B | archived | — | V1 learning_paths CRUD + progress; removed from src/lib/db.ts |
| _archive/api-routes/admin-legacy/** | B | archived | admin/*/v2 | series, courses, instances, offerings, categories (non-v2), etc. |
| _archive/api-routes/public-legacy/** | B | archived | instances-v2, franchises-v2 | programs-v2, featured-categories, legacy instances |
| _archive/api-routes/courses/** | B | archived | featured-instances | V1 courses API; mobile uses v2 |
| _archive/public/templates/course-import-template.csv | A | archived | scripts/templates/* | Zero references |
| _archive/public/{window,file,vercel}.svg | A | archived | — | Create Next App defaults; zero references |
| _archive/public/team/*.{png,webp} | B | archived | — | Coach avatars; Team Mgmt uses DB URLs only |
| _archive/public/team/growth-details-cover-1.png | A | archived | — | Zero references |
| _archive/components/Team.tsx | B | archived | /about/teams | Home Team section removed; teams from API |
| _archive/components/AllCamps.tsx | A | isolated | — | Zero imports |
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
| _archive/admin-pages/guide/page.tsx | B | isolated | src/app/admin/guide/page.tsx | Legacy schema-driven admin guide (archived 2026-05) |
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
| _archive/api-routes/public-legacy/programs-v2/route.ts | C | archived | /api/programs | Removed from src 2026-05 |
| _archive/api-routes/public-legacy/featured-categories/route.ts | C | archived | /api/public/categories | Removed from src 2026-05 |
| _archive/api-routes/public-legacy/featured-programs/route.ts | C | archived | featured-instances | Removed from src 2026-05 |
| _archive/api-routes/public-legacy/instances/[id]/route.ts | C | archived | instance-v2 | Removed from src 2026-05 |
| _archive/api-routes/public-legacy/franchises/[code]/featured-courses/route.ts | C | archived | — | Removed from src 2026-05 |
| _archive/api-routes/public-legacy/franchises/[code]/locations/route.ts | C | archived | public/locations | Removed from src 2026-05 |
| _archive/api-routes/public-legacy/franchises/[code]/route.ts | C | archived | franchises-v2 | Never existed in src; copy only |
| _archive/api-routes/admin-legacy/stats/route.ts | C | archived | admin/stats/* sub-routes | Removed from src 2026-05 |
| _archive/api-routes/admin-legacy/offerings/available/route.ts | C | archived | offerings/v2/available | Removed from src 2026-05 |
| _archive/api-routes/cron/check-waitlist/route.ts | C | archived | — | Not in vercel.json crons |
| _archive/api-routes/blaze-legacy/franchises/route.ts | C | archived | admin/franchises/v2 | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/franchises/[id]/route.ts | C | archived | admin/franchises/v2 | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/programs/route.ts | C | archived | admin/programs/v2 | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/programs/[id]/route.ts | C | archived | admin/programs/v2 | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/programs/hierarchy/route.ts | C | archived | admin/programs/v2/hierarchy | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/categories/route.ts | C | archived | admin/categories/v2 | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/categories/[id]/route.ts | C | archived | admin/categories/v2 | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/offering-types/route.ts | C | archived | admin/offering-types/v2 | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/offering-types/[id]/route.ts | C | archived | admin/offering-types/v2 | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/offerings/[id]/route.ts | C | archived | admin/offering/v2 | Removed from src 2026-05 |
| _archive/api-routes/blaze-legacy/instances/route.ts | C | archived | admin/instance/v2 | List route only |
| check-env-vars.js (repo root) | A | deleted | scripts/check/check-env-vars.js | Duplicate |
| scripts/output/*.json, *.log | A | deleted | — | Import run artifacts; gitignored |
| .temp-style-*.css (repo root) | A | deleted | — | md-to-pdf temp |
| 微信图片_20251216192108_4496_18.jpg | A | deleted | — | Root screenshot; zero refs |
| _archive/public/{next,globe}.svg | A | archived | — | Create Next App defaults; zero refs |
| pdfs/** (repo root) | D | archived | _archive/pdfs/ | PRD PDF exports; gitignored **/*.pdf |
| PRD-01-项目概述与产品定位.pdf (repo root) | D | archived | _archive/pdfs/ | Duplicate of pdfs/PRD-01; removed 2026-05 |
| src/app/api/courses/** | B | archived | featured-instances | Removed from src (copy in _archive/api-routes/courses) |
| src/app/api/learning-paths/** | B | archived | — | Removed from src 2026-05 |
| src/app/api/user/learning-paths/** | B | archived | — | Removed from src 2026-05 |
| src/app/api/user/analytics/route.ts | B | archived | — | Removed from src 2026-05 |
| src/app/api/admin/learning-paths/** | B | archived | — | Removed from src 2026-05 |
| src/app/admin/learning-paths/page.tsx | B | archived | /admin/guide | Removed from src 2026-05 |
| src/app/learning-paths/** | B | archived | /programs | Redirect only |
| src/app/course-catalog/** | B | archived | /programs | Redirect only |
| src/app/api/admin/instances/v2/** | B | archived | admin/instance/v2 | Removed from src 2026-05 |
| src/lib/db-v2.ts | C | deprecated | v2_* + supabaseAdmin | Do not extend |
| src/lib/db.ts | C | active | — | auth/enrollment/payment; delete after migration |
| _archive/scripts/import-instances-camp.js | B | archived | import-instances.js --type camp | Unified wide-table legacy; archived 2026-06 |
| _archive/scripts/import-instances-course.js | B | archived | import-instances.js --type course | Unified wide-table legacy; archived 2026-06 |
| _archive/scripts/extract-instances-from-raw.js | B | archived | Per-type schema CSV export/edit | Raw → unified wide table; archived 2026-06 |
| _archive/scripts/design/unified-instance-import.md | D | archived | instance-csv-import.md | Unified camp+course spec; archived 2026-06 |
| scripts/import-instances-camp.js | B | deprecated stub | import-instances.js --type camp | Prints message; real script in _archive |
| scripts/import-instances-course.js | B | deprecated stub | import-instances.js --type course | Prints message; real script in _archive |
| scripts/extract-instances-from-raw.js | B | deprecated stub | export-instances.js --type {code} | Prints message; real script in _archive |
