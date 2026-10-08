# V89 — native sprite origin and bounded static output

The V88 Git deployment compiled successfully but stopped during cleanup:
`Disposable tree refuses mounted filesystems`. Its final output volume is
separate from the checkout. Deleting checkout caches cannot be credited as
capacity reclaimed on that destination.

This change keeps that mount protection. It skips unnecessary source cleanup
when the output already fits, and skips cleanup that cannot affect a separate
destination volume. Insufficient capacity still fails closed.

Only the historical `/game/imports/v85` group is served through a Next
`beforeFiles` rewrite to the same public repository, pinned to the exact
deployment Git SHA. Local builds keep reading their local native files.
Original Git/public files are never deleted, resized or re-encoded. Newer
V86–V89 asset groups remain in the normal static build.

The Vercel-only script omits generated V85 copies only after all candidates
pass literal-path, no-link, mode/size, SHA-256, committed Git-blob and compiled
rewrite checks. Any mismatch rejects the whole plan before its first unlink.
The CLI refuses local execution, external/shared Git metadata and any other
repository identity. Fixture access is limited to fresh private test roots.

At baseline `f7db275`, the source group has 1,498 tracked regular PNG files,
3,552,603,080 bytes. That is the expected reduction of generated static output,
not a claimed measurement of a completed Vercel deployment.

Validation before publication: 24 fixture/configuration tests passed and the
changed script/configuration files passed ESLint. Two existing landing-craft
PNGs returned HTTP 200 from the pinned public origin and matched their local
original sizes and SHA-256 values. These checks do not certify every external
response, a deployed browser, or all game content. A READY deployment and public
asset/gameplay checks remain separate release gates.

The origin introduces a GitHub availability dependency. It is a bounded
publication repair, not a promise of an unlimited asset-hosting SLA. A future
dedicated asset store would need its own access, integrity and cost review.

On 8 October, the first Vercel run compiled but omitted the new script through
`.vercelignore`; its allowlist and a build-command inclusion test now cover it.
The following run reached the native-origin script and showed that the official
adapter mounts generated static output on a separate volume. The filesystem
boundary is therefore the exact literal `.next/output/static` directory, rather
than the clone device. Links and mounts below that output boundary remain
refused. Original PNGs must remain on the Git clone device and match committed
blob hashes. This change still unlinks only the verified generated PNG copies.
The real Vercel outcome remains to be observed after this repair.

A peer review identified that equal `st_dev` values alone cannot exclude a
same-filesystem bind mount. Before traversing and before the first unlink, Linux
builds now read `/proc/self/mountinfo` and refuse every mount strictly below the
literal static boundary, including bind mounts. The exact adapter mount remains
allowed. A source/output pair sharing `(dev, ino)` is also rejected during the
complete preflight. A real hard-link fixture proves that a late alias leaves
every ordinary generated copy and original intact; mount-table tests cover the
exact adapter boundary, siblings, same-volume descendants and escaped names.

The deployment for `74623b1` still refused a different device below the static
directory; compilation and built-CSS checks passed. No native-original deletion
was reported. Instead of relaxing that guard, `.vercelignore` now excludes only
`/public/game/imports/v85` at packaging time. The matching SHA-pinned rewrite
remains mandatory even when no generated copy exists. Git/public originals are
unchanged locally and remain available at the same committed public origin.
Other asset groups are not ignored. This packaging repair still requires an
observed Vercel run; the script now identifies a rejected relative path and its
device values if the provider still supplies a mounted generated copy.

Routing references:
- https://vercel.com/docs/routing/rewrites
- https://vercel.com/docs/environment-variables/system-environment-variables
- Local Next guide: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.md`
- Linux mount information: https://docs.kernel.org/filesystems/proc.html#proc-pid-mountinfo-information-about-mounts
- Deployment packaging exclusions: https://vercel.com/docs/deployments/vercel-ignore
