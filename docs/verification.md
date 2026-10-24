# Verification report

Updated 24 October 2026, Asia/Kuala_Lumpur.

## Connected project

RumahStock is connected to Supabase project `uobvttelqccqyurjcyja` in Singapore. The ignored `.env.local` holds the URL and publishable key. No service-role key is used or exposed.

All three checked-in migrations are applied, and remote migration history matches their local versions:

- `20261024025611_household_mvp.sql`: schema, authorization, Storage and Realtime.
- `20261024033727_hosted_indexes.sql`: indexes covering the foreign keys flagged by hosted advisors.
- `20261024034439_hosted_conflicts.sql`: ordinary HTTP conflicts instead of a PostgREST serialization retry loop.

Local callback URLs are allowlisted, minimum password length is eight, and email confirmation remains enabled. The minimal hosted configuration update preserved the other remote settings.

## Checks completed

| Check | Result |
|---|---|
| Production build and strict TypeScript | PASS |
| ESLint | PASS, no errors or warnings |
| Unit tests | PASS, 12 tests including authentication form regressions |
| Database tests | PASS, 38 checks using the actual migrations in PostgreSQL/PGlite |
| Browser regression suite | PASS, 15 tests against the production build; desktop, mobile, dark mode, optical barcode decoding, camera lifecycle, list and purchase flows |
| Hosted password authentication | PASS, three isolated test identities authenticated with Supabase Auth |
| App login and session persistence | PASS, two browser sessions logged in; refresh preserved authentication |
| App logout | PASS; opening dashboard afterward returned to login |
| Hosted household collaboration | PASS, owner created a household, a member joined by invitation and received the member role |
| Owner authorization | PASS, member invitation-management calls rejected |
| Hosted partial purchase | PASS, purchase/availability/list remainder committed together |
| Duplicate purchase | PASS, identical retry returned the existing receipt |
| Hosted stale purchase | PASS, HTTP 409 / PT409 returned promptly with no second receipt |
| Cross-household Data API access | PASS, unrelated identity could neither read nor mutate the product |
| Private Storage | PASS, member upload/read worked; unrelated household read/write was denied |
| App photo form and image route | PASS, a real upload was saved, and the authenticated image route returned 200 with private, no-store caching |
| Hosted Realtime transport | PASS, a separate member received stock and shopping-list events |
| Actual two-browser synchronization | PASS, a purchase through the app changed the other browser's pending quantity from three to two without reloading |
| Disposable data cleanup | PASS, test images, three test accounts, both test households and their dependent records were removed |

No signup or recovery email was sent. Test identities were isolated, confirmed fixtures using reserved `rumahstock.invalid` addresses, not real mailboxes. Real signup/recovery delivery and email-link handling still need checking with the user's own mailbox.

## Problems found and fixed during hosted verification

1. **Authentication forms:** the original generic server schema validated empty fields hidden by the selected form. Login, recovery and reset now use separate schemas, with four regression tests.
2. **Conflict handling:** custom SQLSTATE 40001 triggered infinite retries on the project's PostgREST 14 version. Business conflicts now use PT409, and application mutation RPCs disable automatic SDK retries. The looping verification requests were stopped. [Supabase explanation](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).
3. **Realtime initialization:** the browser could join before its cookie session initialized, resulting in an anonymous subscription and invalid-filter errors. Subscription now waits for the authenticated token, with isolated channel names and cleanup guards for React remounts.
4. **Restricted invitation subscription:** invitations are excluded from the shared channel and instead refreshed after owner actions and regular reconciliation. Their token hashes remain unreadable to clients. Connection errors now affect the visible connection state.

## Scanner regression repair

The reported `MultiFormatReader: non-ReaderException ... NotFoundException` warning was reproduced on empty frames. Optical tests also exposed rotation and UPC-E failures in the JavaScript decoder. The fallback now uses ZXing-C++ through `zxing-wasm`, with a version-matched binary copied into `public/wasm` by `predev` and `prebuild`. No CDN or server receives camera frames. Native detection switches to this fallback after repeated failures, and stopped camera sessions ignore late results.

Six regression cases feed generated barcode pixels through a real canvas `MediaStream` into the app's production decoding code: EAN-13 resolves the saved demo item; EAN-8, UPC-A with a leading zero, UPC-E, a rotated EAN-13 at mobile width, and a broken native detector all resolve the expected numbers. Each case begins with empty frames, checks the exact barcode string, confirms camera tracks stop, and asserts no browser warnings/errors. Tests also verify the decoder binary is requested from this app only after opening the camera. UPC output is restored from normalized GTIN values so the printed UPC-E value and UPC-A leading zeros are retained. The demo EAN-13 check digit was corrected to `9556001123459`.

Desktop and mobile screenshots were inspected. A mobile flex alignment inherited from the tablet grid compressed the manual-entry cards; the mobile layout now stretches them to the available width. The mobile scanner regression also checks the manual input width.

## Database and security scope

The 38 PostgreSQL checks cover membership limits, role restrictions, invitation expiry/revocation/single use, barcode strings and uniqueness, products without barcodes, unique pending entries, valid quantities/prices/dates/units, atomic partial purchases, duplicate retries, stale updates, immutable purchase snapshots, household isolation, Storage paths, removed members, anonymous access, RLS on every exposed table, and private privileged functions.

Hosted Security Advisors show one remaining platform warning: leaked-password protection is disabled. Supabase makes this feature available on Pro plans and above; no plan upgrade was made. [Password protection and remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Foreign-key index findings were repaired; unused-index information is expected for a new database and is not a reason to remove the constraint/query indexes.

## Browser and visual evidence

Playwright Chromium was used because the dedicated Browser plugin/skill was absent. Desktop was checked at 1536 × 1024 and mobile at 390 × 844. Main routes had no horizontal document overflow; dark mode persisted after refresh. Real login, purchase and image-upload flows ran at localhost:3000 with two authenticated contexts.

The [design reference](design-concept.png) and implementation screenshots were opened with `view_image`. Layout, typography, palette, buttons, icons, assets, responsive behavior and copy were compared. [Design notes](design-notes.md) contain the comparison ledger and intentional adaptations. UI changes in this update concern integration and validation, not a redesign.

## Remaining limits

- Signup confirmation and password-recovery email delivery, including real mailbox callbacks, were not tested.
- EAN/UPC recognition is covered with generated barcode pixels passed through a real canvas video stream and the production decoder. Physical phone-camera focus, lighting and permission behavior still require a real-device check over HTTPS.
- Concurrent stale requests are rejected and duplicate request keys are protected; a broader concurrent load test was not performed.
- A deployment must set its own site origin and allowlist its callback URLs. This app is running locally, not published to a production domain.
- Receipt scanning, expiry tracking, offline write queues, consumption detection and live retailer prices remain outside scope.
- English feature copy remains untranslated; shared navigation, category and status labels are centralized.

See [README.md](../README.md) for setup and the remaining acceptance checks.
