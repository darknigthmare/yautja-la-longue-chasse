import {HOMEWORLD_ARCHIVE_PLAQUE_V109,archivePlaqueSourceLineV109} from './homeworldArchivePlaqueDefinitionV109';

/** A later, voluntary episode at the same station, not a rewrite of B. */
export const HOMEWORLD_ARCHIVE_CONTINUATION_V111 = {
  operationId:'port-k17-deferred-continuation-v111',
  post:HOMEWORLD_ARCHIVE_PLAQUE_V109.post,
  sourceSceneId:HOMEWORLD_ARCHIVE_PLAQUE_V109.sceneId,
  maximumBaseBytes:65536,
} as const;

export const archiveContinuationOpeningLinesV111=(phase:'offer'|'choice'|'ready')=>[
  archivePlaqueSourceLineV109('OUV').id,
  ...(phase!=='offer'?[archivePlaqueSourceLineV109('CHOIX','A').id]:[]),
  ...(phase==='ready'?[archivePlaqueSourceLineV109('REPONSE','A').id]:[]),
];
