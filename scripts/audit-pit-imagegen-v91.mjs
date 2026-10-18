import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { archiveAndAuditPitImagegenBatchV91 } from './lib/pit-imagegen-admission-v91.mjs';

/* Usage (Node with native TypeScript stripping, no game build):
 * node --experimental-strip-types scripts/audit-pit-imagegen-v91.mjs intake.json work-local/v91/admission
 * Intake schemaVersion1: exactly10 candidates {id,sourcePath,sourceSha256?,
 * expectedNativeFrames,definition:<real PitSpriteSheetAnimationDefinition>}.
 * New movement clips require native alpha, explicit cuts/pivots and60ticks/s.
 * Candidate atlas/page/clip statuses stay draft until root reviews the image.
 * rejectedAttempts:[{id,sourcePath,sourceSha256?,reason,provenance?}] preserves
 * additional failed generations separately from the ten final target candidates.
 * Optional reviews: {id,sourceSha256,contractSha256,decision:'accept'|'reject',
 * reviewer,notes,checks:{identityAndCostume,nativeFacing,anatomyAndEquipment,
 * motionSequence,frameCuts,registrationAndBodyReference}}.
 * All six checks must be true. A changed original OR frame contract invalidates review.
 * Never promote a technical pass into visual acceptance or1:1 certification.
 * Original bytes and previous refusals are retained under originals/ and receipts/.
 * No public file, existing source, registry, Git index or save is modified.
 * Root first preserves ALL10 via admission.preservationCopyPlan (art-source is
 * excluded by .vercelignore), then copies ONLY admission.exactCopyPlan to public.
 * Every copy must retain sourceSha256; root stages these exact filenames without
 * wildcard, keeps rejected artwork out of registry/preloads, and verifies ten
 * accepted PNGs before claiming completeTenPngAdmission (partial lots stay partial).
 * Root verifies SHA after copying,
 * and coordinates a NEW registry consumer only for its approved entries.
 * A partial accepted lot is not reported as ten admittedPNG or complete animation.
 */
const [intakeFile, outputArgument] = process.argv.slice(2);
if (!intakeFile || !outputArgument) throw new Error('Usage: audit-pit-imagegen-v91.mjs intake.json work-local/v91/admission');
const project = fileURLToPath(new URL('..', import.meta.url));
const output = path.resolve(project, outputArgument);
const allowed = path.join(project, 'work-local', 'v91');
if (output !== allowed && !output.startsWith(allowed + path.sep)) throw new Error('Private output must remain within work-local/v91');
const receipt = await archiveAndAuditPitImagegenBatchV91(JSON.parse(await readFile(intakeFile, 'utf8')), output);
console.log(JSON.stringify({ receiptPath: receipt.receiptPath, submitted: receipt.admission.submitted,
  technicallyEligible: receipt.reports.filter(r => r.technicalAccepted).length,
  visuallyAdmitted: receipt.admission.accepted, completeTenPngAdmission: receipt.admission.completeTenPngAdmission,
  originalBytesPreserved: receipt.admission.physicalOriginalsPreserved,
  additionalRejectedAttempts: receipt.admission.additionalRejectedAttempts, runtimeRegistryChanged: false }, null, 2));
