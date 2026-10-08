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

Routing references:
- https://vercel.com/docs/routing/rewrites
- https://vercel.com/docs/environment-variables/system-environment-variables
- Local Next guide: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.md`
