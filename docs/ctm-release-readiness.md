# CTM release readiness

This checklist connects the Christ Triumphant Ministry's hosted B1 site to the four ChurchApps code forks. The hosted CMS content and its custom styles are stored in B1, not in these Git repositories. A green fork build alone does not update the hosted church.

## Current code changes

- API [feature PR](https://github.com/Nyxar-code/Api/pull/1): church-scoped hymn endpoints and Content migration.
- API [verification PR](https://github.com/Nyxar-code/Api/pull/2): disposable MySQL and browser lifecycle, targeting the feature branch. Merge verification into the feature branch before the feature branch enters `main`.
- Admin [feature PR](https://github.com/Nyxar-code/B1Admin/pull/1): authenticated editor.
- App [feature PR](https://github.com/Nyxar-code/B1App/pull/1): public and mobile readers.
- The separate `*-hymns-current-source` branches are earlier alternatives. In particular, the API alternative has a September migration; do not combine it with the November migration without migration-history reconciliation.

## Gate 1: isolated integration

The API verification branch starts a disposable MySQL instance and runs the three application checkouts. Its browser test verifies a public homepage, a public sermon route, a phone-width member portal entry, then hymn draft → publish → website/mobile read → archive. The hymn test uses the seeded Grace demo church, not CTM's production records.

Require the two checks on the latest verification commit to pass. Build and typecheck each actual release commit as well; the feature PR heads currently have no required CI check runs. Update pinned App/Admin commit SHAs in the browser workflow if either PR changes.

## Gate 2: hosted deployment ownership

Confirm the operator and release path for `thechristtriumphantministry.b1.church`, `admin.b1.church`, and the Content API. The B1App fork's deploy workflow merges `main` into a `production` branch; it does not prove a deployment to the hosted domain. The Admin and API production workflows use AWS secrets that this review cannot confirm on these forks. Prefer an accepted ChurchApps upstream release for the shared hosted service. If self-hosting instead, first establish infrastructure, credentials, backups, and a domain cutover plan. Do not treat merging a fork PR as a production deployment.

The App and API package manifests require Node 22 or newer while some production workflows select Node 20. Align the release runner with the declared engine before attempting a fork deployment.

## Gate 3: data and release order

1. Preserve a database backup and inspect migration status in the target environment. Do not run a destructive `down` migration against church data.
2. Validate the November Content migration on an isolated environment with the same migration history as the target.
3. Deploy API and migrate Content first; verify tenant isolation and anonymous reads.
4. Deploy Admin, then App; verify authenticated create, publish, unpublish and archive with a test church before adding real hymn text.
5. Publish a church-specific hymn only when its text/source and rights have been reviewed. Add its navigation entry only after the public route is healthy.

## Gate 4: CTM visitor and member acceptance

On the hosted site, verify Home → Services → Contact, the map search and email links, Events → event detail, Groups → C-TRICE, and the member portal on a narrow phone. Check the event time in West Africa Time. Test member login, meeting list and attendance with an authorized test account; do not use real attendance records as test data.

Content still awaiting church-provided facts/assets: the exact map entrance pin, group meeting time, real church photos, and sermon recordings. Keep Prayer Requests on hold. Preserve existing pages and navigation while working through these items.

## Release decision

Release only when Gates 1–4 pass and the hosted-service operator has an explicit deployment path. Otherwise keep the code in review branches; continue CTM's safe CMS content edits independently.
