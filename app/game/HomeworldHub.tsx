"use client";

import {HOMEWORLD_ARCHIVIST_SCENE_SOURCES_V111} from './systems/homeworldArchivistMotionV111';

/* eslint-disable @next/next/no-img-element -- local transparent whole-character plates and game props */

import HomeworldArchiveComparisonV107,{HomeworldArchiveComparisonJournalV107} from './HomeworldArchiveComparisonV107';
import HomeworldCargoV108,{HomeworldCargoJournalV108} from './HomeworldCargoV108';
import {HomeworldArchivePlaqueJournalV109} from './HomeworldArchivePlaqueV109';
import HomeworldArchivePlaqueV111 from './HomeworldArchivePlaqueV111';
import HomeworldArchiveContinuationV111,{HomeworldArchiveContinuationJournalV111} from './HomeworldArchiveContinuationV111';
import HomeworldArrivalRecoveryV111 from './HomeworldArrivalRecoveryV111';
import {createArchivePlaqueTransactionV112 as createArchivePlaqueTransactionV109,createArchiveContinuationTransactionV112 as createArchiveContinuationTransactionV111} from './systems/homeworldArchiveResumeV112';
import HomeworldUpgradeRecoveryV112 from './HomeworldUpgradeRecoveryV112';
import {homeworldGeometryRecoveryRequiredV112,homeworldGeometryRecoveryLedgersV112,planHomeworldGeometryRecoveryV112,createHomeworldGeometryRecoveryTransactionV112,storeHomeworldGeometryRecoveryBackupV112,homeworldGeometryRecoverySaveMatchesV112,homeworldGeometryRecoveryBackupConfirmedV112,type HomeworldGeometryRecoveryPlanV112} from './systems/homeworldGeometryRecoveryV112';
import HomeworldArchivistPortraitV111 from './HomeworldArchivistPortraitV111';
import {defaultHomeworldArrivalRecoveryV111,normalizeHomeworldArrivalRecoveryV111,homeworldArrivalRecoveryLedgersV111} from './systems/homeworldArrivalRecoveryLedgerV111';
import {planHomeworldArrivalRecoveryV111,createHomeworldArrivalRecoveryTransactionV111,type HomeworldArrivalRecoveryPlanV111} from './systems/homeworldArrivalRecoveryV111';
import {defaultHomeworldArchiveContinuationV111,normalizeHomeworldArchiveContinuationV111,archiveContinuationActiveV111,archiveContinuationBaseV111,archiveContinuationViewV111} from './systems/homeworldArchiveContinuationLedgerV111';
import {sampleArchiveContinuationWalkV111,type ArchiveContinuationActionV111} from './systems/homeworldArchiveContinuationV111';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109,HOMEWORLD_ARCHIVE_PLAQUE_ART_V109,archivePlaqueArtAdmittedV109} from './systems/homeworldArchivePlaqueDefinitionV109';
import {defaultHomeworldArchivePlaqueV109,normalizeHomeworldArchivePlaqueV109} from './systems/homeworldArchivePlaqueLedgerV109';
import {archivePlaqueActiveV109,archivePlaquePostReachedV109,archivePlaqueNearbyV109,sampleArchivePlaqueWalkV109,type ArchivePlaqueActionV109} from './systems/homeworldArchivePlaqueV109';
import cargoStylesV108 from './HomeworldCargoV108.module.css';
import {defaultHomeworldCargoV108,normalizeHomeworldCargoV108} from './systems/homeworldCargoLedgerV108';
import {cargoActiveV108,cargoPostReachedV108,cargoNearbyV108,createCargoTransactionV108,sampleCargoWalkV108,stepHomeworldCargoActorV108,type CargoActionV108} from './systems/homeworldCargoV108';
import {resolveCargoArrivalV108} from './systems/homeworldCargoArrivalV108';
import {defaultHomeworldArchiveComparisonV107,normalizeHomeworldArchiveComparisonV107} from './systems/homeworldArchiveComparisonLedgerV107';
import {archiveComparisonActiveV107,archiveComparisonBaseReadyV107,archiveComparisonPostReachedV107,archiveComparisonTableReachedV107,archiveComparisonNearbyV107,createArchiveComparisonTransactionV107,sampleArchiveComparisonV107,type ArchiveComparisonActionV107} from './systems/homeworldArchiveComparisonV107';
import HomeworldArchiveV106, {HomeworldArchiveJournalV106} from './HomeworldArchiveV106';
import {HOMEWORLD_ARCHIVE_V106} from './systems/homeworldArchiveDefinitionV106';
import {defaultHomeworldArchiveV106,normalizeHomeworldArchiveV106} from './systems/homeworldArchiveLedgerV106';
import {archiveActiveV106,archiveNearbyActionV106,archivePostReachedV106,createArchiveTransactionV106,sampleArchiveWalkV106,type ArchiveActionV106} from './systems/homeworldArchiveV106';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import { youthCampaignObjective, youthEquipmentSummary } from "./systems/youthCampaign";
import { getChronicleRank } from "./systems/clanChronicle";
import { matchesControlAction, type ControlActionId } from "./systems/controlBindings";
import { shipForId, type ShipId } from "./shipCatalogue";
import type { SaveGame } from "./types";
import HomeworldSideStoryV66 from "./HomeworldSideStoryV66";
import HomeworldNpcMissionsV66, { HomeworldNpcMissionsJournalV66 } from "./HomeworldNpcMissionsV66";
import YautjaTranslationV67 from "./YautjaTranslationV67";
import { applyHomeworldSideStoryV66, homeworldSideStoryV66Journal, type HomeworldSideStoryV66Action } from "./systems/homeworldSideStoryV66";
import { applyNpcMissionsV66, type NpcMissionActionV66 } from "./systems/homeworldNpcMissionsV66";
import { canStartSoloV66 } from "./systems/campaignSoloV66";
import { canStartSoloV67 } from "./systems/campaignSoloV67";
import {
  HOMEWORLD_ACTOR, HOMEWORLD_DISTRICTS, HOMEWORLD_POINTS, homeworldHeroPlate,
  HOMEWORLD_NPCS, HOMEWORLD_EVIDENCE, HOMEWORLD_REGIONS, HOMEWORLD_WITNESS_CHOICES,
  createHomeworldActor, stepHomeworldActorOnFloor,
  applyHomeworldAction, homeworldInquiryJournal, homeworldInquiryDialogue,
  type HomeworldActor, type HomeworldAction, type HomeworldPoint, type HomeworldProgress, type HomeworldInquiryAction,
  type HomeworldService, type HomeworldWitnessChoice, type HomeworldPlayableRegionId,
} from "./systems/homeworld";
import { createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice } from "./systems/homeworldInput";
import HomeworldWorldSceneV77 from './HomeworldWorldSceneV77';
import HomeworldWorldMapV77 from './HomeworldWorldMapV77';
import {HOMEWORLD_WORLD_V77,HOMEWORLD_BUILDINGS_V77,HOMEWORLD_DISTRICTS_V77,
 nearestHomeworldDoorV77,nearestHomeworldPointV77,homeworldResidentPoseV77,districtAtHomeworldActorV77,
 homeworldLevelV77,projectHomeworldWorldV77,homeworldCameraWorldV77,
 beginHomeworldTransitV77,nearestHomeworldConnectorV77,
 HOMEWORLD_CONNECTORS_V77,beginHomeworldSkiffV77,stepHomeworldSkiffV77,type HomeworldSkiffV77,type HomeworldLevelV77,type HomeworldTransitV77} from './systems/homeworldWorldV77';
import {stepHomeworldTransitV110,homeworldWorldArrivalV110,homeworldInteriorExitV110,homeworldExteriorArrivalAllowedV110} from './systems/homeworldTransitionsV110';
import {nearestHomeworldResidentContactV110,homeworldResidentDialogueContactV110,homeworldResidentContactPlacesV110,requestHomeworldResidentLandmarkV110} from './systems/homeworldResidentContactsV110';
import {createHomeworldCheckpointV77} from './systems/homeworldLocationV77';
import {HOMEWORLD_CIVIC_SCENE_SOURCES_V80} from './systems/homeworldCivicDecorV80';
import {homeworldCivicNeighborhoodV80} from './systems/homeworldCivicNeighborhoodsV80';
import {homeworldCivilianRoutineV84} from './systems/homeworldCivilianRoutinesV84';
import {homeworldSceneDepthV78} from './systems/homeworldVisualLayersV78';
import {HOMEWORLD_CONNECTOR_SCENE_SOURCES_V82} from './systems/homeworldConnectorArtV82';
import {HOMEWORLD_BACKDROP_SCENE_SOURCES_V82} from './systems/homeworldBackdropArtV82';
import {HOMEWORLD_LIFT_CABIN_SCENE_SOURCES_V82} from './systems/homeworldLiftCabinV82';
import {createHomeworldLiftStationV83,restoreHomeworldLiftStationV83,rememberHomeworldLiftStationV83,
 callHomeworldLiftV83,stepHomeworldLiftCallV83,homeworldLiftAtSocketV83,homeworldLiftPassengerV83,
 returnHomeworldLiftAfterRefusalV83,type HomeworldLiftStationV83} from './systems/homeworldLiftStationV83';
import {HOMEWORLD_LAVA_NATIVE_SOURCES_V77} from './systems/homeworldLavaPlacementV77';
import {HOMEWORLD_CITY_NATIVE_SCENE_SOURCES_V78} from './systems/homeworldCityNativeArtV78';
import {HOMEWORLD_NATIVE_SCENE_SOURCES_V81} from './systems/homeworldNativeArchitectureV81';
import {HOMEWORLD_STREET_DECOR_SCENE_SOURCES_V83} from './systems/homeworldStreetDecorV83';
import {HOMEWORLD_STREET_DECOR_SCENE_SOURCES_V84} from './systems/homeworldStreetDecorV84';
import {useHomeworldReducedMotionV77} from './useHomeworldReducedMotionV77';
import HomeworldContractsV68, { HomeworldContractsJournalV68 } from "./HomeworldContractsV68";
import { applyHomeworldContractV68, type ContractActionV68 } from "./systems/homeworldContractsV68";
import { canStartSoloV68 } from "./systems/campaignSoloV68";
import { canStartSoloV69 } from "./systems/campaignSoloV69";
import { canStartSoloV70 } from "./systems/campaignSoloV70";
import { canStartSoloV90 } from "./systems/campaignSoloV90";
import { canVisitHomeworldVillagesV69, usesHomeworldYouthAppearanceV69, HOMEWORLD_YOUTH_PLATE_V69 } from "./systems/homeworldAccessV69";
import { canEnterHomeworldRegionV68, isHomeworldRegionIdV68, type HomeworldRegionIdV68 } from "./systems/homeworldRegionsV68";
import HomeworldResidentConversationV75 from "./HomeworldResidentConversationV75";
import HomeworldStreetConversationV100 from "./HomeworldStreetConversationV100";
import {HomeworldCartographyJournalV104} from './HomeworldCartographyV104';
import HomeworldCartographyV105,{HomeworldCartographyObservationV105,HomeworldCartographyJournalV105} from './HomeworldCartographyV105';
import {HOMEWORLD_CARTOGRAPHY_V105} from './systems/homeworldCartographyDefinitionV105';
import {defaultHomeworldCartographyV105,normalizeHomeworldCartographyV105} from './systems/homeworldCartographyLedgerV105';
import {cartographyActiveV105,cartographyHighPointReachedV105,createCartographyTransactionV105,sampleCartographyWalkV105,sampleCartographyTransitV105,type CartographyActionV105} from './systems/homeworldCartographyV105';
import {HOMEWORLD_CARTOGRAPHY_V104} from './systems/homeworldCartographyDefinitionV104';
import {defaultHomeworldCartographyV104,normalizeHomeworldCartographyV104} from './systems/homeworldCartographyLedgerV104';
import {createCartographyTransactionV104,cartographyPostReachedV104,sampleCartographyWalkV104,type CartographyActionV104} from './systems/homeworldCartographyV104';
import {homeworldStreetContactReachedV100,nearestHomeworldStreetContactV100,homeworldStreetPlacesV100} from './systems/homeworldStreetContactsV100';
import HomeworldModularHunter from "./HomeworldModularHunter";
import HomeworldInteriorSurface from "./HomeworldInteriorSurface";
import HomeworldYouthMotionV74 from "./HomeworldYouthMotionV74";
import HomeworldYouthMotionV72 from "./HomeworldYouthMotionV72";
import { useHomeworldMotionAssetsV74 } from "./useHomeworldMotionAssetsV74";
import {HOMEWORLD_SCENE_ASSETS_V76} from './systems/homeworldSceneAssetsV76';
import HomeworldCntlipV77 from './HomeworldCntlipV77';
import useHomeworldCntlipV77 from './useHomeworldCntlipV77';
import {HOMEWORLD_CNTLIP_HOST_ASSETS_V77,homeworldCntlipReachedV77,homeworldCntlipEligibleV77} from './systems/homeworldCntlipPhysicalV77';
import type {CntlipSiteIdV77} from './systems/cntlipV77';
import { homeworldYouthDirectionV74, type HomeworldYouthDirectionV74 } from "./systems/homeworldYouthMotionV74";
import { homeworldCameraV72 } from "./systems/homeworldCameraV72";
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64 } from "./systems/homeworldGeometryV64";
import { homeworldInteriorForBuildingV64, nearestHomeworldInteriorTargetV64, isHomeworldInteriorWalkableV64, type HomeworldInteriorV64 } from "./systems/homeworldInteriorsV64";
import { homeworldPortraitPlacementV64, homeworldModularPlacementV64 } from "./systems/homeworldCharacterPlacementV64";
import { HUNTER_DREAD_STRANDS_V63, stepHunterDreadsV63, type DreadMotion } from "./hunterDreadsV63";
import styles from "./HomeworldCity.module.css";
import sprintStylesV81 from "./HomeworldSprintV81.module.css";

export interface HomeworldHubProps {
  save: SaveGame;
  selectedShipId: ShipId;
  suspended: boolean;
  navigation?: ReactNode;
  welcome?: ReactNode;
  /** Return false when durable saving failed; no local success is then announced. */
  onProgress(next: HomeworldProgress): boolean;
  onService(service: HomeworldService): void;
  onReturnShip(): void;
  /** Available only at the physically reached mentor after the chief. */
  onYouthTraining?(): boolean;
  onSoloV66?(): boolean;
  onSoloV67?(): boolean;
  onSoloV68?(): boolean;
  onSoloV69?(): boolean;
  onSoloV70?(): boolean;
  onSoloV90?(): boolean;
  onRegionV68?(id: HomeworldRegionIdV68): boolean;
  /** A completed connector returns at its physical threshold while its arrival
   * request is pending. Ordinary city reloads use the existing Port spawn. */
  arrivalV67?: { pointId: string; requestId: string } | null;
  onExpedition?(id: HomeworldPlayableRegionId): void;
  onNotify(message: string): void;
}
const sceneSourcesV77=[...HOMEWORLD_ARCHIVIST_SCENE_SOURCES_V111.map(source=>({...source,kind:'scene' as const})),...(archivePlaqueArtAdmittedV109()?[{src:HOMEWORLD_ARCHIVE_PLAQUE_ART_V109.src,sourceWidth:HOMEWORLD_ARCHIVE_PLAQUE_ART_V109.width,sourceHeight:HOMEWORLD_ARCHIVE_PLAQUE_ART_V109.height,kind:'scene' as const}]:[]),...HOMEWORLD_SCENE_ASSETS_V76,...HOMEWORLD_CONNECTOR_SCENE_SOURCES_V82,...HOMEWORLD_LIFT_CABIN_SCENE_SOURCES_V82,...HOMEWORLD_BACKDROP_SCENE_SOURCES_V82,...HOMEWORLD_CNTLIP_HOST_ASSETS_V77,...HOMEWORLD_CITY_NATIVE_SCENE_SOURCES_V78,...HOMEWORLD_CIVIC_SCENE_SOURCES_V80,...HOMEWORLD_NATIVE_SCENE_SOURCES_V81,...HOMEWORLD_STREET_DECOR_SCENE_SOURCES_V83,...HOMEWORLD_STREET_DECOR_SCENE_SOURCES_V84,...HOMEWORLD_LAVA_NATIVE_SOURCES_V77.map(source=>({src:source.src,sourceWidth:source.width,sourceHeight:source.height,kind:'scene' as const}))];

function pointInCurrentSpace(actor: { x: number; y: number }, room: HomeworldInteriorV64 | null, levelId: HomeworldLevelV77): HomeworldPoint | null {
  if (!room) return nearestHomeworldPointV77(levelId, actor);
  const target = nearestHomeworldInteriorTargetV64(room, actor);
  if (target?.kind !== "point") return null;
  const original = HOMEWORLD_POINTS.find(point => point.id === target.pointId);
  return original ? { ...original, ...target.position } : null;
}

export default function HomeworldHub({ save, selectedShipId, suspended, navigation, welcome, onProgress: persistProgress, onService, onReturnShip, onExpedition, onNotify, onYouthTraining, onSoloV66, onSoloV67, onSoloV68, onSoloV69, onSoloV70, onSoloV90, onRegionV68, arrivalV67 }: HomeworldHubProps) {
  const [initialLocationV77] = useState(() => resolveCargoArrivalV108(save.homeworld.locationV77,save.createdAt,save.homeworld.cargoV108,{cartographyV104:save.homeworld.cartographyV104,cartographyV105:save.homeworld.cartographyV105,archiveV106:save.homeworld.archiveV106,archiveComparisonV107:save.homeworld.archiveComparisonV107}));
  const [upgradeRecoveryPendingV112,setUpgradeRecoveryPendingV112]=useState(()=>!initialLocationV77.migrationBackup&&homeworldGeometryRecoveryRequiredV112(save.homeworld.locationV77,save.createdAt,homeworldGeometryRecoveryLedgersV112(save.homeworld)));
  const upgradeRecoveryPendingRefV112=useRef(upgradeRecoveryPendingV112);
  const upgradeRecoveryOwnerRefV112=useRef(save.createdAt);
  const upgradeRecoverySubmittedRefV112=useRef<HomeworldGeometryRecoveryPlanV112|null>(null);
  const upgradeRecoveryFinishRefV112=useRef<(proposal:HomeworldGeometryRecoveryPlanV112,progress:HomeworldProgress)=>boolean>(()=>false);
  const [upgradeRecoveryPlanV112,setUpgradeRecoveryPlanV112]=useState<HomeworldGeometryRecoveryPlanV112|null>(null);
  const [upgradeRecoveryMessageV112,setUpgradeRecoveryMessageV112]=useState('');
  const [upgradeRecoveryWriteRefusedV112,setUpgradeRecoveryWriteRefusedV112]=useState(false);
  const [cargoMigrationOnlyPendingV108,setCargoMigrationPendingV108]=useState(!!initialLocationV77.migrationBackup);
  const cargoMigrationPendingV108=cargoMigrationOnlyPendingV108||upgradeRecoveryPendingV112;
  const cargoMigrationPendingRefV108=useRef(cargoMigrationPendingV108);
  const cargoMigrationWriteReadyRefV108=useRef(!initialLocationV77.migrationBackup&&!upgradeRecoveryPendingV112);
  const cargoMigrationAttemptedRefV108=useRef(false);
  const [cargoMigrationMessageV108,setCargoMigrationMessageV108]=useState(initialLocationV77.cargoRecoveryMessage);
  const [actor, setActor] = useState(() => initialLocationV77.actor);
  const [levelIdV77, setLevelIdV77] = useState<HomeworldLevelV77>(initialLocationV77.levelId);
  const levelRefV77 = useRef(levelIdV77);
  const [elevationV77, setElevationV77] = useState(homeworldLevelV77(levelIdV77).elevation as number);
  const transitRefV77 = useRef<HomeworldTransitV77 | null>(null);
  const [transitV77, setTransitV77] = useState<HomeworldTransitV77 | null>(null);
  const [liftStateV83, setLiftStateV83] = useState<HomeworldLiftStationV83>(() => createHomeworldLiftStationV83(save.createdAt));
  const [liftSessionOwnerV83, setLiftSessionOwnerV83] = useState<string | null>(null);
  const liftRefV83 = useRef(liftStateV83);
  const liftSessionReadyRefV83 = useRef(false);
  const skiffRefV77 = useRef<HomeworldSkiffV77 | null>(null);
  const [skiffV77, setSkiffV77] = useState<HomeworldSkiffV77 | null>(null);
  const actorRef = useRef(actor);
  const [youthMotionV74, setYouthMotionV74] = useState({ direction: 's' as HomeworldYouthDirectionV74, distanceWorld: 0, velocity: { x: 0, y: 0 } });
  const youthMotionRefV74 = useRef(youthMotionV74);
  const [interiorId, setInteriorId] = useState<string | null>(initialLocationV77.interiorId);
  const interiorRef = useRef<HomeworldInteriorV64 | null>(initialLocationV77.interiorId ? homeworldInteriorForBuildingV64(initialLocationV77.interiorId) : null);
  const exteriorAnchorRef = useRef(initialLocationV77.exterior);
  const [phase, setPhase] = useState(0);
  const [dreadAngles, setDreadAngles] = useState<number[]>(() => HUNTER_DREAD_STRANDS_V63.map(() => 0));
  const dreadMotionRef = useRef<DreadMotion>({ angles: dreadAngles, velocities: HUNTER_DREAD_STRANDS_V63.map(() => 0) });
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 580 });
  const [paused, setPaused] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [spatialCodexOpen, setSpatialCodexOpen] = useState(false);
  const spatialCodexOpenRef = useRef(false);
  const [wayfindingOpenV75, setWayfindingOpenV75] = useState(false);
  const wayfindingOpenRefV75 = useRef(false);
  const [wayfindingRequestV75, setWayfindingRequestV75] = useState<{ id: string; nonce: number } | null>(null);
  const [dialog, setDialog] = useState<{ point: HomeworldPoint | null; message?: string; navigation?: boolean; residentV110?: {id:string;owner:string}; recoveryV111?: {owner:string}; streetContactV100?:{id:string;owner:string}; archivePlaqueV109?:{owner:string}; cargoV108?:{owner:string}; archiveComparisonV107?:{owner:string;at:'post'|'table'}; archiveV106?:{owner:string}; cartographyV104?:{owner:string}; cartographyObservationV105?:{owner:string}; cntlipSiteId?:CntlipSiteIdV77 } | null>(null);
  const [announcement, setAnnouncement] = useState(initialLocationV77.cargoRecoveryMessage);
  const viewportRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<string>());
  const touch = useRef({ left: false, right: false, up: false, down: false, jump: false, sprint: false });
  const [touchRunningV81, setTouchRunningV81] = useState(false);
  const progressRef = useRef(save.homeworld);
  const cartographyDraftRefV104=useRef(normalizeHomeworldCartographyV104(initialLocationV77.migratedLedgers.cartographyV104??save.homeworld.cartographyV104)??defaultHomeworldCartographyV104(save.createdAt));
  const cartographyWritePausedRefV104=useRef(false);
  const [cartographyWritePausedV104,setCartographyWritePausedV104]=useState(false);
  const [cartographyMessageV104,setCartographyMessageV104]=useState('');
  const cartographyDraftRefV105=useRef(normalizeHomeworldCartographyV105(initialLocationV77.migratedLedgers.cartographyV105??save.homeworld.cartographyV105)??defaultHomeworldCartographyV105(save.createdAt));
  const cartographyWritePausedRefV105=useRef(false);
  const [cartographyWritePausedV105,setCartographyWritePausedV105]=useState(false);
  const [cartographyMessageV105,setCartographyMessageV105]=useState('');
  const [archiveViewV106,setArchiveViewV106]=useState(()=>normalizeHomeworldArchiveV106(initialLocationV77.migratedLedgers.archiveV106??save.homeworld.archiveV106)??defaultHomeworldArchiveV106(save.createdAt));
  const archiveDraftRefV106=useRef(archiveViewV106);
  const archiveWritePausedRefV106=useRef(false);
  const [archiveWritePausedV106,setArchiveWritePausedV106]=useState(false);
  const [archiveMessageV106,setArchiveMessageV106]=useState('');
  const [comparisonViewV107,setComparisonViewV107]=useState(()=>normalizeHomeworldArchiveComparisonV107(initialLocationV77.migratedLedgers.archiveComparisonV107??save.homeworld.archiveComparisonV107)??defaultHomeworldArchiveComparisonV107(save.createdAt));
  const comparisonDraftRefV107=useRef(comparisonViewV107);
  const comparisonWritePausedRefV107=useRef(false);
  const [comparisonWritePausedV107,setComparisonWritePausedV107]=useState(false);
  const [comparisonMessageV107,setComparisonMessageV107]=useState('');
  const [cargoViewV108,setCargoViewV108]=useState(()=>normalizeHomeworldCargoV108(save.homeworld.cargoV108)??defaultHomeworldCargoV108(save.createdAt));
  const cargoDraftRefV108=useRef(cargoViewV108);
  const cargoWritePausedRefV108=useRef(false);
  const [cargoWritePausedV108,setCargoWritePausedV108]=useState(false);
  const [cargoMessageV108,setCargoMessageV108]=useState('');
  const [plaqueViewV109,setPlaqueViewV109]=useState(()=>normalizeHomeworldArchivePlaqueV109(save.homeworld.archivePlaqueV109)??defaultHomeworldArchivePlaqueV109(save.createdAt));
  const plaqueDraftRefV109=useRef(plaqueViewV109),plaqueWritePausedRefV109=useRef(false);
  const [plaqueWritePausedV109,setPlaqueWritePausedV109]=useState(false),[plaqueMessageV109,setPlaqueMessageV109]=useState('');
  const [continuationViewV111,setContinuationViewV111]=useState(()=>normalizeHomeworldArchiveContinuationV111(save.homeworld.archiveContinuationV111,save.homeworld.archivePlaqueV109)??defaultHomeworldArchiveContinuationV111(save.createdAt));
  const continuationDraftRefV111=useRef(continuationViewV111);
  const plaqueEffectiveViewV111=archiveContinuationViewV111(continuationViewV111)??plaqueViewV109;
  const deferredPlaqueV111=!!archiveContinuationBaseV111(plaqueViewV109);
  const [recoveryPlanV111,setRecoveryPlanV111]=useState<HomeworldArrivalRecoveryPlanV111|null>(null);
  const [recoveryMessageV111,setRecoveryMessageV111]=useState('');
  const [recoveryWriteRefusedV111,setRecoveryWriteRefusedV111]=useState(false);
  const saveRef = useRef(save);
  const suspendedRef = useRef(suspended);
  const pausedRef = useRef(paused || inactive || spatialCodexOpen || wayfindingOpenV75 || cargoMigrationPendingV108);
  const dialogStateRef = useRef(dialog);
  const cityClockV68 = useRef(0);
  const visitedAttempt = useRef<string | null>(null);
  const pendingVisitsRef = useRef(new Set<string>());
  const pendingVisitOwnerRef = useRef(save.createdAt);
  const [pendingVisitCount, setPendingVisitCount] = useState(0);
  const gamepadStateRef = useRef(createHomeworldGamepadState());
  const bindings = save.settings.controlBindings;
  const interior = interiorId ? homeworldInteriorForBuildingV64(interiorId) : null;
  const currentBuilding = interiorId ? HOMEWORLD_BUILDINGS_V77.find(building => building.id === interiorId) : null;
  const district = currentBuilding ? HOMEWORLD_DISTRICTS_V77.find(entry => entry.id === currentBuilding.districtId) : districtAtHomeworldActorV77(levelIdV77, actor);
  const nearest = pointInCurrentSpace(actor, interior, levelIdV77);
  const nearestDoor = interior ? null : nearestHomeworldDoorV77(levelIdV77, actor);
  const indoorTarget = interior ? nearestHomeworldInteriorTargetV64(interior, actor) : null;
  const sceneWidth = interior?.width ?? HOMEWORLD_WORLD_V77.width;
  const sceneDepth = interior?.depth ?? HOMEWORLD_WORLD_V77.height;
  const projectedActor = interior ? homeworldProjectGroundV64(actor) : projectHomeworldWorldV77(actor, levelIdV77, elevationV77);
  const camera = interior ? homeworldCameraV72({ actor, viewport: viewportSize, width: sceneWidth, depth: sceneDepth, interior: true }) : homeworldCameraWorldV77(actor, levelIdV77, viewportSize, elevationV77, transitV77);
  const { x: cameraX, y: cameraY, zoom } = camera;
  const progress = save.homeworld;
  const youthWelcome = usesHomeworldYouthAppearanceV69(save);
  const reducedMotionV77 = useHomeworldReducedMotionV77();
  const motionAssetsV74 = useHomeworldMotionAssetsV74({ youth: youthWelcome, additionalSources:sceneSourcesV77 });
  const residentAdmissionRefV110=useRef({owner:save.createdAt,active:false});
  useLayoutEffect(()=>{
    residentAdmissionRefV110.current={owner:save.createdAt,active:!cargoMigrationPendingV108&&!suspended&&!paused&&!inactive&&!spatialCodexOpen&&!wayfindingOpenV75&&motionAssetsV74.ready};
  },[save.createdAt,cargoMigrationPendingV108,suspended,paused,inactive,spatialCodexOpen,wayfindingOpenV75,motionAssetsV74.ready]);
  const villagesOpenV69 = canVisitHomeworldVillagesV69(save);
  const blocked = cargoMigrationPendingV108 || suspended || paused || inactive || !!dialog || spatialCodexOpen || wayfindingOpenV75 || !!transitV77 || !!skiffV77 || !motionAssetsV74.ready || liftSessionOwnerV83 !== save.createdAt || cartographyWritePausedV104 || cartographyWritePausedV105 || archiveWritePausedV106 || (archiveViewV106.receipt?.phase==='interrupted'&&!!archiveViewV106.receipt.carrier) || comparisonWritePausedV107 || (comparisonViewV107.receipt?.phase==='interrupted'&&comparisonViewV107.receipt.evidence.place==='carried') || cargoWritePausedV108 || (cargoViewV108.receipt?.phase==='interrupted'&&!!cargoViewV108.receipt.carrier) || plaqueWritePausedV109 || (plaqueEffectiveViewV111.receipt?.phase==='interrupted'&&!!plaqueEffectiveViewV111.receipt.carrier);
  const appliedArrivalV67 = useRef<string | null>(null);
  useEffect(() => {
    if (upgradeRecoveryPendingV112 || !arrivalV67 || appliedArrivalV67.current === arrivalV67.requestId) return;
    const point = HOMEWORLD_POINTS.find(item => item.id === arrivalV67.pointId && item.kind === "region");
    if (!point?.regionId) return;
    const expectedOwner=save.createdAt;
    const frame = requestAnimationFrame(() => {
      if(saveRef.current.createdAt!==expectedOwner||appliedArrivalV67.current===arrivalV67.requestId)return;
      const arriving = homeworldWorldArrivalV110(point.regionId!,cargoDraftRefV108.current,saveRef.current.createdAt);
      if(!arriving){appliedArrivalV67.current=arrivalV67.requestId;const message='Le retour est encombré. Position sûre conservée ; dégage le passage avant de refaire la traversée.';setAnnouncement(message);onNotify(message);return;}
      appliedArrivalV67.current = arrivalV67.requestId;
      held.current.clear(); touch.current = { left: false, right: false, up: false, down: false, jump: false, sprint: false }; setTouchRunningV81(false);
      actorRef.current = arriving.actor; setActor(arriving.actor); exteriorAnchorRef.current = arriving.actor; interiorRef.current = null; setInteriorId(null);
      levelRefV77.current = arriving.levelId; setLevelIdV77(arriving.levelId); setElevationV77(homeworldLevelV77(arriving.levelId).elevation); transitRefV77.current = null; setTransitV77(null);
      youthMotionRefV74.current = { ...youthMotionRefV74.current, direction: 's' };
      setYouthMotionV74(youthMotionRefV74.current);
      setDialog(null); setPaused(false); setInactive(false);
      wayfindingOpenRefV75.current = false; setWayfindingOpenV75(false); setWayfindingRequestV75(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [arrivalV67,save.createdAt,onNotify,upgradeRecoveryPendingV112]);

  const finishUpgradeRecoveryV112=useCallback((proposal:HomeworldGeometryRecoveryPlanV112,durable:HomeworldProgress)=>{
    if(!upgradeRecoveryPendingRefV112.current||saveRef.current.createdAt!==proposal.ownerCreatedAt
      ||upgradeRecoveryOwnerRefV112.current!==proposal.ownerCreatedAt
      ||!homeworldGeometryRecoverySaveMatchesV112(proposal,proposal.ownerCreatedAt,durable))return false;
    progressRef.current=durable;
    cartographyDraftRefV104.current=normalizeHomeworldCartographyV104(durable.cartographyV104)??defaultHomeworldCartographyV104(proposal.ownerCreatedAt);
    cartographyDraftRefV105.current=normalizeHomeworldCartographyV105(durable.cartographyV105)??defaultHomeworldCartographyV105(proposal.ownerCreatedAt);
    archiveDraftRefV106.current=normalizeHomeworldArchiveV106(durable.archiveV106)??defaultHomeworldArchiveV106(proposal.ownerCreatedAt);setArchiveViewV106(archiveDraftRefV106.current);
    comparisonDraftRefV107.current=normalizeHomeworldArchiveComparisonV107(durable.archiveComparisonV107)??defaultHomeworldArchiveComparisonV107(proposal.ownerCreatedAt);setComparisonViewV107(comparisonDraftRefV107.current);
    cargoDraftRefV108.current=normalizeHomeworldCargoV108(durable.cargoV108)??defaultHomeworldCargoV108(proposal.ownerCreatedAt);setCargoViewV108(cargoDraftRefV108.current);
    plaqueDraftRefV109.current=normalizeHomeworldArchivePlaqueV109(durable.archivePlaqueV109)??defaultHomeworldArchivePlaqueV109(proposal.ownerCreatedAt);setPlaqueViewV109(plaqueDraftRefV109.current);
    continuationDraftRefV111.current=normalizeHomeworldArchiveContinuationV111(durable.archiveContinuationV111,durable.archivePlaqueV109)??defaultHomeworldArchiveContinuationV111(proposal.ownerCreatedAt);setContinuationViewV111(continuationDraftRefV111.current);
    if(proposal.movesActor&&proposal.checkpoint){
      const restored={...actorRef.current,...proposal.checkpoint.exterior,vx:0,vy:0};
      actorRef.current=restored;exteriorAnchorRef.current=restored;interiorRef.current=null;levelRefV77.current=proposal.checkpoint.levelId;
      setActor(restored);setInteriorId(null);setLevelIdV77(proposal.checkpoint.levelId);setElevationV77(homeworldLevelV77(proposal.checkpoint.levelId).elevation);
    }
    upgradeRecoverySubmittedRefV112.current=null;
    upgradeRecoveryPendingRefV112.current=false;setUpgradeRecoveryPendingV112(false);
    cargoMigrationWriteReadyRefV108.current=!cargoMigrationOnlyPendingV108;
    cargoMigrationPendingRefV108.current=cargoMigrationOnlyPendingV108;
    pausedRef.current=paused||inactive||spatialCodexOpenRef.current||wayfindingOpenRefV75.current||!motionAssetsV74.ready||cargoMigrationOnlyPendingV108;
    return true;
  },[cargoMigrationOnlyPendingV108,paused,inactive,motionAssetsV74.ready]);
  useLayoutEffect(()=>{upgradeRecoveryFinishRefV112.current=finishUpgradeRecoveryV112;},[finishUpgradeRecoveryV112]);
  useEffect(() => {
    // GameClient also keys this component by createdAt. Keep the local queue
    // isolated even if another caller reuses the instance for a different save.
    if (pendingVisitOwnerRef.current !== save.createdAt) {
      pendingVisitsRef.current.clear(); pendingVisitOwnerRef.current = save.createdAt;
      visitedAttempt.current = null; setPendingVisitCount(0);
      wayfindingOpenRefV75.current = false; setWayfindingOpenV75(false); setWayfindingRequestV75(null);
    }
    const submitted=upgradeRecoverySubmittedRefV112.current;
    if(upgradeRecoveryPendingRefV112.current&&submitted&&homeworldGeometryRecoverySaveMatchesV112(submitted,save.createdAt,save.homeworld)
      &&homeworldGeometryRecoveryBackupConfirmedV112(submitted,localStorage)){
      // The player's confirmation already happened. The host has now read back
      // those exact bytes after an earlier uncertain storage acknowledgement.
      saveRef.current=save;
      if(upgradeRecoveryFinishRefV112.current(submitted,save.homeworld)){
        setUpgradeRecoveryPlanV112(null);setUpgradeRecoveryWriteRefusedV112(false);
        const message='La restauration locale est maintenant enregistrée. Reprends volontairement ton étude depuis les points conservés.';
        setUpgradeRecoveryMessageV112(message);setAnnouncement(message);
      }
    }
    progressRef.current = save.homeworld; saveRef.current = save;
    const incoming=normalizeHomeworldCartographyV104(save.homeworld.cartographyV104)??defaultHomeworldCartographyV104(save.createdAt);
    if(cartographyDraftRefV104.current.ownerCreatedAt!==save.createdAt){cartographyWritePausedRefV104.current=false;setCartographyWritePausedV104(false);setCartographyMessageV104('');}
    if(cartographyDraftRefV104.current.ownerCreatedAt!==save.createdAt||incoming.revision>cartographyDraftRefV104.current.revision)cartographyDraftRefV104.current=incoming;
    const incomingV105=normalizeHomeworldCartographyV105(save.homeworld.cartographyV105)??defaultHomeworldCartographyV105(save.createdAt);
    if(cartographyDraftRefV105.current.ownerCreatedAt!==save.createdAt){cartographyWritePausedRefV105.current=false;setCartographyWritePausedV105(false);setCartographyMessageV105('');}
    if(cartographyDraftRefV105.current.ownerCreatedAt!==save.createdAt||incomingV105.revision>cartographyDraftRefV105.current.revision)cartographyDraftRefV105.current=incomingV105;
    const incomingArchiveV106=normalizeHomeworldArchiveV106(save.homeworld.archiveV106)??defaultHomeworldArchiveV106(save.createdAt);
    if(archiveDraftRefV106.current.ownerCreatedAt!==save.createdAt){archiveWritePausedRefV106.current=false;setArchiveWritePausedV106(false);setArchiveMessageV106('');}
    if(archiveDraftRefV106.current.ownerCreatedAt!==save.createdAt||incomingArchiveV106.revision>archiveDraftRefV106.current.revision){archiveDraftRefV106.current=incomingArchiveV106;setArchiveViewV106(incomingArchiveV106);}
    const incomingComparisonV107=normalizeHomeworldArchiveComparisonV107(save.homeworld.archiveComparisonV107)??defaultHomeworldArchiveComparisonV107(save.createdAt);
    if(comparisonDraftRefV107.current.ownerCreatedAt!==save.createdAt){comparisonWritePausedRefV107.current=false;setComparisonWritePausedV107(false);setComparisonMessageV107('');}
    if(comparisonDraftRefV107.current.ownerCreatedAt!==save.createdAt||incomingComparisonV107.revision>comparisonDraftRefV107.current.revision){comparisonDraftRefV107.current=incomingComparisonV107;setComparisonViewV107(incomingComparisonV107);}
    const incomingPlaqueV109=normalizeHomeworldArchivePlaqueV109(save.homeworld.archivePlaqueV109)??defaultHomeworldArchivePlaqueV109(save.createdAt);
    if(plaqueDraftRefV109.current.ownerCreatedAt!==save.createdAt){plaqueWritePausedRefV109.current=false;setPlaqueWritePausedV109(false);setPlaqueMessageV109('');}
    if(plaqueDraftRefV109.current.ownerCreatedAt!==save.createdAt||incomingPlaqueV109.revision>plaqueDraftRefV109.current.revision){plaqueDraftRefV109.current=incomingPlaqueV109;setPlaqueViewV109(incomingPlaqueV109);}
    const incomingContinuationV111=normalizeHomeworldArchiveContinuationV111(save.homeworld.archiveContinuationV111,save.homeworld.archivePlaqueV109)??defaultHomeworldArchiveContinuationV111(save.createdAt);
    if(continuationDraftRefV111.current.ownerCreatedAt!==save.createdAt||incomingContinuationV111.revision>continuationDraftRefV111.current.revision){continuationDraftRefV111.current=incomingContinuationV111;setContinuationViewV111(incomingContinuationV111);}
    const incomingCargoV108=normalizeHomeworldCargoV108(save.homeworld.cargoV108)??defaultHomeworldCargoV108(save.createdAt);
    if(cargoDraftRefV108.current.ownerCreatedAt!==save.createdAt){cargoWritePausedRefV108.current=false;setCargoWritePausedV108(false);setCargoMessageV108('');}
    if(cargoDraftRefV108.current.ownerCreatedAt!==save.createdAt||incomingCargoV108.revision>cargoDraftRefV108.current.revision){cargoDraftRefV108.current=incomingCargoV108;setCargoViewV108(incomingCargoV108);}
  }, [save]);
  useEffect(() => {
    // This side state belongs to the campaign identity, not its current floor.
    // Restore only when mounting/changing identity, never after onProgress.
    const owner = save.createdAt;
    liftSessionReadyRefV83.current = false;
    const frame = requestAnimationFrame(() => {
      // The campaign may have changed while browser hydration was queued.
      // Never read or publish a previous owner's station into this session.
      if (saveRef.current.createdAt !== owner) return;
      const state = restoreHomeworldLiftStationV83(owner);
      liftRefV83.current = state; liftSessionReadyRefV83.current = true;
      setLiftStateV83(state); setLiftSessionOwnerV83(owner);
      transitRefV77.current = null; setTransitV77(null);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (liftSessionReadyRefV83.current && liftRefV83.current.ownerCreatedAt === owner) rememberHomeworldLiftStationV83(liftRefV83.current, true);
      liftSessionReadyRefV83.current = false;
    };
  }, [save.createdAt]);
  const updateLiftStationV83 = useCallback((next: HomeworldLiftStationV83) => {
    if (!liftSessionReadyRefV83.current || next.ownerCreatedAt !== saveRef.current.createdAt) return;
    liftRefV83.current = next; setLiftStateV83(next); rememberHomeworldLiftStationV83(next);
  }, []);
  useEffect(() => { suspendedRef.current = suspended; }, [suspended]);
  useEffect(() => { pausedRef.current = paused || inactive || spatialCodexOpen || wayfindingOpenV75 || !motionAssetsV74.ready || cargoMigrationPendingV108; }, [paused, inactive, spatialCodexOpen, wayfindingOpenV75, motionAssetsV74.ready,cargoMigrationPendingV108]);
  useEffect(() => { dialogStateRef.current = dialog; }, [dialog]);

  const onProgress = useCallback((next: HomeworldProgress) => {
    if (!cargoMigrationWriteReadyRefV108.current || saveRef.current.createdAt !== save.createdAt || transitRefV77.current || skiffRefV77.current) return false;
    if(progressRef.current.arrivalRecoveryV111?.receipt&&JSON.stringify(next.arrivalRecoveryV111)!==JSON.stringify(progressRef.current.arrivalRecoveryV111))return false;
    if(next.arrivalRecoveryV111&&(!normalizeHomeworldArrivalRecoveryV111(next.arrivalRecoveryV111)||next.arrivalRecoveryV111.ownerCreatedAt!==save.createdAt))return false;
    const locationV77 = createHomeworldCheckpointV77(save.createdAt, levelRefV77.current, actorRef.current, interiorRef.current?.buildingId ?? null, exteriorAnchorRef.current);
    // Carry the sampled walk into every ordinary city save, including visit
    // and location checkpoints. A reload never pairs a newer position with
    // an older walk endpoint. Explicit dialogue actions supply their own ledger.
    let cartographyV104=next.cartographyV104;
    const draft=cartographyDraftRefV104.current;
    if((cartographyV104?.revision??0)<(progressRef.current.cartographyV104?.revision??0))return false;
    if((cartographyV104?.revision??0)===(progressRef.current.cartographyV104?.revision??0)&&draft.ownerCreatedAt===save.createdAt&&draft.receipt&&JSON.stringify(draft)!==JSON.stringify(cartographyV104)){
      cartographyV104={...draft,revision:draft.revision+1};
    }
    if(cartographyV104&&(!normalizeHomeworldCartographyV104(cartographyV104)||cartographyV104.ownerCreatedAt!==save.createdAt))return false;
    let cartographyV105=next.cartographyV105;
    const draftV105=cartographyDraftRefV105.current;
    if((cartographyV105?.revision??0)<(progressRef.current.cartographyV105?.revision??0))return false;
    if((cartographyV105?.revision??0)===(progressRef.current.cartographyV105?.revision??0)&&draftV105.ownerCreatedAt===save.createdAt&&draftV105.receipt&&JSON.stringify(draftV105)!==JSON.stringify(cartographyV105))cartographyV105={...draftV105,revision:draftV105.revision+1};
    if(cartographyV105&&(!normalizeHomeworldCartographyV105(cartographyV105)||cartographyV105.ownerCreatedAt!==save.createdAt))return false;
    let archiveV106=next.archiveV106;
    const archiveDraft=archiveDraftRefV106.current;
    if((archiveV106?.revision??0)<(progressRef.current.archiveV106?.revision??0))return false;
    if((archiveV106?.revision??0)===(progressRef.current.archiveV106?.revision??0)&&archiveDraft.ownerCreatedAt===save.createdAt&&archiveDraft.receipt&&JSON.stringify(archiveDraft)!==JSON.stringify(archiveV106))archiveV106={...archiveDraft,revision:archiveDraft.revision+1};
    if(archiveV106&&(!normalizeHomeworldArchiveV106(archiveV106)||archiveV106.ownerCreatedAt!==save.createdAt))return false;
    if(archiveActiveV106(archiveV106)&&(cartographyActiveV105(cartographyV105)||!!cartographyV104?.receipt&&cartographyV104.receipt.phase!=='completed'))return false;
    let archiveComparisonV107=next.archiveComparisonV107;const comparisonDraft=comparisonDraftRefV107.current;
    if((archiveComparisonV107?.revision??0)<(progressRef.current.archiveComparisonV107?.revision??0))return false;
    if((archiveComparisonV107?.revision??0)===(progressRef.current.archiveComparisonV107?.revision??0)&&comparisonDraft.ownerCreatedAt===save.createdAt&&comparisonDraft.receipt&&JSON.stringify(comparisonDraft)!==JSON.stringify(archiveComparisonV107))archiveComparisonV107={...comparisonDraft,revision:comparisonDraft.revision+1};
    if(archiveComparisonV107&&(!normalizeHomeworldArchiveComparisonV107(archiveComparisonV107)||archiveComparisonV107.ownerCreatedAt!==save.createdAt||archiveComparisonV107.receipt&&!archiveComparisonBaseReadyV107(archiveV106,save.createdAt)))return false;
    if(archiveComparisonActiveV107(archiveComparisonV107)&&(archiveActiveV106(archiveV106)||cartographyActiveV105(cartographyV105)||!!cartographyV104?.receipt&&cartographyV104.receipt.phase!=='completed'))return false;
    let cargoV108=next.cargoV108;const cargoDraft=cargoDraftRefV108.current;
    if((cargoV108?.revision??0)<(progressRef.current.cargoV108?.revision??0))return false;
    if((cargoV108?.revision??0)===(progressRef.current.cargoV108?.revision??0)&&cargoDraft.ownerCreatedAt===save.createdAt&&cargoDraft.receipt&&JSON.stringify(cargoDraft)!==JSON.stringify(cargoV108))cargoV108={...cargoDraft,revision:cargoDraft.revision+1};
    if(cargoV108&&(!normalizeHomeworldCargoV108(cargoV108)||cargoV108.ownerCreatedAt!==save.createdAt))return false;
    if(cargoActiveV108(cargoV108)&&(archiveComparisonActiveV107(archiveComparisonV107)||archiveActiveV106(archiveV106)||cartographyActiveV105(cartographyV105)||!!cartographyV104?.receipt&&cartographyV104.receipt.phase!=='completed'))return false;
    let archivePlaqueV109=next.archivePlaqueV109;const plaqueDraft=plaqueDraftRefV109.current;
    if((archivePlaqueV109?.revision??0)<(progressRef.current.archivePlaqueV109?.revision??0))return false;
    if((archivePlaqueV109?.revision??0)===(progressRef.current.archivePlaqueV109?.revision??0)&&plaqueDraft.ownerCreatedAt===save.createdAt&&plaqueDraft.receipt&&JSON.stringify(plaqueDraft)!==JSON.stringify(archivePlaqueV109))archivePlaqueV109={...plaqueDraft,revision:plaqueDraft.revision+1};
    if(archivePlaqueV109&&(!normalizeHomeworldArchivePlaqueV109(archivePlaqueV109)||archivePlaqueV109.ownerCreatedAt!==save.createdAt))return false;
    if(archivePlaqueActiveV109(archivePlaqueV109)&&(cargoActiveV108(cargoV108)||archiveComparisonActiveV107(archiveComparisonV107)||archiveActiveV106(archiveV106)||cartographyActiveV105(cartographyV105)||!!cartographyV104?.receipt&&cartographyV104.receipt.phase!=='completed'))return false;
    let archiveContinuationV111=next.archiveContinuationV111;const continuationDraft=continuationDraftRefV111.current;
    if((archiveContinuationV111?.revision??0)<(progressRef.current.archiveContinuationV111?.revision??0))return false;
    if((archiveContinuationV111?.revision??0)===(progressRef.current.archiveContinuationV111?.revision??0)&&continuationDraft.ownerCreatedAt===save.createdAt&&continuationDraft.receipt&&JSON.stringify(continuationDraft)!==JSON.stringify(archiveContinuationV111))archiveContinuationV111={...continuationDraft,revision:continuationDraft.revision+1};
    if(archiveContinuationV111&&(!normalizeHomeworldArchiveContinuationV111(archiveContinuationV111,archivePlaqueV109)||archiveContinuationV111.ownerCreatedAt!==save.createdAt))return false;
    if(archiveContinuationActiveV111(archiveContinuationV111)&&(archivePlaqueActiveV109(archivePlaqueV109)||cargoActiveV108(cargoV108)||archiveComparisonActiveV107(archiveComparisonV107)||archiveActiveV106(archiveV106)||cartographyActiveV105(cartographyV105)||!!cartographyV104?.receipt&&cartographyV104.receipt.phase!=='completed'))return false;
    const durable = { ...next, locationV77,...(archiveContinuationV111?{archiveContinuationV111}:{}),...(archivePlaqueV109?{archivePlaqueV109}:{}),...(cargoV108?{cargoV108}:{}),...(archiveComparisonV107?{archiveComparisonV107}:{}),...(archiveV106?{archiveV106}:{}),...(cartographyV104?{cartographyV104}:{}),...(cartographyV105?{cartographyV105}:{}) };
    if(next.arrivalRecoveryV111?.receipt&&!progressRef.current.arrivalRecoveryV111?.receipt){
      const receipt=next.arrivalRecoveryV111.receipt;
      if(receipt.originalCheckpointJson!==JSON.stringify(progressRef.current.locationV77)||receipt.originalLedgersJson!==JSON.stringify(homeworldArrivalRecoveryLedgersV111(durable))||JSON.stringify(receipt.restoredCheckpoint)!==JSON.stringify(locationV77))return false;
    }
    if (!persistProgress(durable)) return false;
    progressRef.current = durable;
    if(archiveContinuationV111){continuationDraftRefV111.current=archiveContinuationV111;setContinuationViewV111(archiveContinuationV111);}
    if(archivePlaqueV109){plaqueDraftRefV109.current=archivePlaqueV109;setPlaqueViewV109(archivePlaqueV109);}
    plaqueWritePausedRefV109.current=false;setPlaqueWritePausedV109(false);
    if(cargoV108){cargoDraftRefV108.current=cargoV108;setCargoViewV108(cargoV108);}
    cargoWritePausedRefV108.current=false;setCargoWritePausedV108(false);
    if(archiveComparisonV107){comparisonDraftRefV107.current=archiveComparisonV107;setComparisonViewV107(archiveComparisonV107);}
    comparisonWritePausedRefV107.current=false;setComparisonWritePausedV107(false);
    if(archiveV106){archiveDraftRefV106.current=archiveV106;setArchiveViewV106(archiveV106);}
    archiveWritePausedRefV106.current=false;setArchiveWritePausedV106(false);
    if(cartographyV104)cartographyDraftRefV104.current=cartographyV104;
    if(cartographyV105)cartographyDraftRefV105.current=cartographyV105;
    cartographyWritePausedRefV104.current=false;setCartographyWritePausedV104(false);
    cartographyWritePausedRefV105.current=false;setCartographyWritePausedV105(false);
    return true;
  }, [persistProgress, save.createdAt]);
  const recordLocationV77 = useCallback(() => {
    if (transitRefV77.current || skiffRefV77.current || suspendedRef.current) return false;
    const ok = onProgress(progressRef.current);
    if (!ok) { setAnnouncement('Position non enregistrée. Réessaie ici avant de quitter la cité.'); onNotify('Position non enregistrée.'); }
    return ok;
  }, [onProgress, onNotify]);
  const clearInputs = useCallback(() => {
    held.current.clear();
    gamepadStateRef.current = createHomeworldGamepadState();
    touch.current = { left: false, right: false, up: false, down: false, jump: false, sprint: false };
    setTouchRunningV81(false);
  }, []);
  const cartographyContextV104=useCallback((active=true)=>({
    ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:saveRef.current.createdAt,actor:{x:actorRef.current.x,y:actorRef.current.y},levelId:levelRefV77.current,
    visitedDistrictIds:progressRef.current.visitedDistrictIds,interiorId:interiorRef.current?.buildingId,inTransit:!!transitRefV77.current||!!skiffRefV77.current,
    active:active&&!suspendedRef.current&&!pausedRef.current&&!document.hidden&&document.hasFocus(),
  }),[save.createdAt]);
  const cartographyWriteRefusedV104=useCallback((message:string)=>{
    cartographyWritePausedRefV104.current=true;setCartographyWritePausedV104(true);setCartographyMessageV104(message);clearInputs();
  },[clearInputs]);
  const submitCartographyV104=useCallback((action:CartographyActionV104,expectedRevision:number)=>{
    if((archivePlaqueActiveV109(plaqueDraftRefV109.current)||archiveContinuationActiveV111(continuationDraftRefV111.current))){setCartographyMessageV104('Termine l’étude K-17 avant un autre relevé.');return false;}
    if(cargoActiveV108(cargoDraftRefV108.current)){setCartographyMessageV104('Termine la répartition des lots avant un autre relevé.');return false;}
    if(archiveComparisonActiveV107(comparisonDraftRefV107.current)){setCartographyMessageV104('Termine l’étude située avant un autre relevé.');return false;}
    if(archiveActiveV106(archiveDraftRefV106.current)){setCartographyMessageV104('Termine les dossiers séparés avant un autre relevé.');return false;}
    if(cartographyActiveV105(cartographyDraftRefV105.current)){setCartographyMessageV104('Termine le relevé du point haut avant une autre approche.');return false;}
    const transaction=createCartographyTransactionV104(()=>cartographyDraftRefV104.current,cartographyContextV104,next=>onProgress({...progressRef.current,cartographyV104:next}));
    const result=transaction(action,expectedRevision);
    if(!result.ok){if(result.message.startsWith('Le relevé n’a pas été enregistré'))cartographyWriteRefusedV104(result.message);else setCartographyMessageV104(result.message);return false;}
    setCartographyMessageV104(result.message);return true;
  },[cartographyContextV104,onProgress,cartographyWriteRefusedV104]);
  const interruptCartographyV104=useCallback(()=>{
    const draft=cartographyDraftRefV104.current;
    return !draft.receipt||!['walking','return'].includes(draft.receipt.phase)||submitCartographyV104('interrupt',draft.revision);
  },[submitCartographyV104]);
  const sampleCartographyV104=useCallback((before:{x:number;y:number},after:{x:number;y:number},seconds:number)=>{
    if(cartographyWritePausedRefV104.current)return;
    const result=sampleCartographyWalkV104(cartographyDraftRefV104.current,before,after,seconds,cartographyContextV104());
    if(result.invalid){interruptCartographyV104();return;}
    cartographyDraftRefV104.current=result.ledger;
    if(result.checkpoint){
      if(onProgress(progressRef.current))setCartographyMessageV104(result.ledger.receipt?.nextWaypoint===2?'Les deux repères sont enregistrés. Reviens à pied au pupitre.':'Premier repère enregistré. Rejoins maintenant la lampe de la cour.');
      else cartographyWriteRefusedV104('Le repère parcouru n’a pas été enregistré. Réessaie ici avant de poursuivre.');
    }
  },[cartographyContextV104,interruptCartographyV104,onProgress,cartographyWriteRefusedV104]);
  const retryCartographyV104=()=>{
    if(onProgress(progressRef.current))setCartographyMessageV104(!cartographyDraftRefV104.current.receipt||['choice','ready'].includes(cartographyDraftRefV104.current.receipt.phase)?'L’enregistrement est disponible. Reprends ta demande auprès du cartographe.':'Le relevé est enregistré. Tu peux reprendre la marche.');
    else cartographyWriteRefusedV104('L’enregistrement reste indisponible ; le relevé est conservé ici.');
  };
  const cartographyContextV105=useCallback(()=>({...cartographyContextV104(),otherOperationActive:(archivePlaqueActiveV109(plaqueDraftRefV109.current)||archiveContinuationActiveV111(continuationDraftRefV111.current))||cargoActiveV108(cargoDraftRefV108.current)||archiveComparisonActiveV107(comparisonDraftRefV107.current)||archiveActiveV106(archiveDraftRefV106.current)||!!progressRef.current.cartographyV104?.receipt&&progressRef.current.cartographyV104.receipt.phase!=='completed'}),[cartographyContextV104]);
  const cartographyWriteRefusedV105=useCallback((message:string)=>{cartographyWritePausedRefV105.current=true;setCartographyWritePausedV105(true);setCartographyMessageV105(message);clearInputs();},[clearInputs]);
  const submitCartographyV105=useCallback((action:CartographyActionV105,revision:number)=>{
    const transaction=createCartographyTransactionV105(()=>cartographyDraftRefV105.current,cartographyContextV105,next=>onProgress({...progressRef.current,cartographyV105:next}));
    const result=transaction(action,revision);
    if(!result.ok){if(result.writeRefused)cartographyWriteRefusedV105(result.message);else setCartographyMessageV105(result.message);return false;}
    setCartographyMessageV105(result.message);return true;
  },[cartographyContextV105,onProgress,cartographyWriteRefusedV105]);
  const interruptCartographyV105=useCallback(()=>{const r=cartographyDraftRefV105.current;return !r.receipt||!['walking','observing','return'].includes(r.receipt.phase)||submitCartographyV105('interrupt',r.revision);},[submitCartographyV105]);
  const sampleCartographyV105=useCallback((before:{x:number;y:number},after:{x:number;y:number},seconds:number)=>{
    if(cartographyWritePausedRefV105.current)return;
    const result=sampleCartographyWalkV105(cartographyDraftRefV105.current,before,after,seconds,cartographyContextV105());
    if(result.invalid){interruptCartographyV105();return;}
    cartographyDraftRefV105.current=result.ledger;
    if(result.checkpoint){if(onProgress(progressRef.current))setCartographyMessageV105('Point haut atteint. Compare les deux repères, puis date ton observation.');else cartographyWriteRefusedV105('Le point haut n’a pas été enregistré. Réessaie ici avant de poursuivre.');}
  },[cartographyContextV105,interruptCartographyV105,onProgress,cartographyWriteRefusedV105]);
  const recordCartographyTransitV105=useCallback((ride:HomeworldTransitV77,after:{x:number;y:number},seconds:number)=>{
    const result=sampleCartographyTransitV105(cartographyDraftRefV105.current,ride,{...after,levelId:levelRefV77.current as '0'|'+1'},seconds,cartographyContextV105());
    if(result.invalid){interruptCartographyV105();return false;}
    cartographyDraftRefV105.current=result.ledger;return true;
  },[cartographyContextV105,interruptCartographyV105]);
  const retryCartographyV105=()=>{viewportRef.current?.focus({preventScroll:true});if(onProgress(progressRef.current)){setCartographyMessageV105('Enregistrement disponible. Reprends la demande ou le parcours depuis son dernier point confirmé.');requestAnimationFrame(()=>viewportRef.current?.focus({preventScroll:true}));}else cartographyWriteRefusedV105('L’enregistrement du point haut reste indisponible. Le relevé est conservé ici.');};
  const openObservationV105=useCallback(()=>{
    if(cartographyWritePausedRefV105.current||!cartographyHighPointReachedV105(cartographyContextV105())||cartographyDraftRefV105.current.receipt?.phase!=='observing')return false;
    clearInputs();viewportRef.current?.focus({preventScroll:true});if(!onProgress(progressRef.current)){cartographyWriteRefusedV105('La position d’observation n’a pas été enregistrée. Réessaie ici.');return false;}
    const next={point:null,cartographyObservationV105:{owner:saveRef.current.createdAt}};dialogStateRef.current=next;setDialog(next);return true;
  },[cartographyContextV105,clearInputs,onProgress,cartographyWriteRefusedV105]);
  const archiveContextV106=useCallback(()=>({...cartographyContextV104(),otherOperationActive:(archivePlaqueActiveV109(plaqueDraftRefV109.current)||archiveContinuationActiveV111(continuationDraftRefV111.current))||cargoActiveV108(cargoDraftRefV108.current)||cartographyActiveV105(cartographyDraftRefV105.current)||!!cartographyDraftRefV104.current.receipt&&cartographyDraftRefV104.current.receipt.phase!=='completed'}),[cartographyContextV104]);
  const archiveWriteRefusedV106=useCallback((message:string)=>{archiveWritePausedRefV106.current=true;setArchiveWritePausedV106(true);setArchiveMessageV106(message);clearInputs();},[clearInputs]);
  const submitArchiveV106=useCallback((action:ArchiveActionV106,revision:number)=>{
    const transaction=createArchiveTransactionV106(()=>archiveDraftRefV106.current,archiveContextV106,next=>onProgress({...progressRef.current,archiveV106:next}));
    const result=transaction(action,revision);
    if(!result.ok){if(result.writeRefused)archiveWriteRefusedV106(result.message);else setArchiveMessageV106(result.message);return false;}
    setArchiveMessageV106(result.message);return true;
  },[archiveContextV106,onProgress,archiveWriteRefusedV106]);
  const interruptArchiveV106=useCallback(()=>{const r=archiveDraftRefV106.current;return !r.receipt||!['working','return'].includes(r.receipt.phase)||submitArchiveV106('interrupt',r.revision);},[submitArchiveV106]);
  const sampleArchiveV106=useCallback((before:HomeworldActor,after:HomeworldActor,seconds:number)=>{
    if(archiveWritePausedRefV106.current)return false;
    const result=sampleArchiveWalkV106(archiveDraftRefV106.current,before,after,seconds,archiveContextV106());
    if(result.invalid){
      // The motor proposal is not yet accepted: restore the complete prior
      // actor before an interruption/checkpoint can persist its carried case.
      const stopped={...before,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);clearInputs();
      interruptArchiveV106();return false;
    }
    archiveDraftRefV106.current=result.ledger;return true;
  },[archiveContextV106,interruptArchiveV106,clearInputs]);
  const retryArchiveV106=()=>{viewportRef.current?.focus({preventScroll:true});if(onProgress(progressRef.current))setArchiveMessageV106('Dossiers et dernier point enregistrés. Reprends l’action ici.');else archiveWriteRefusedV106('L’enregistrement reste indisponible. Les dossiers sont conservés ici.');};
  const actArchiveFromWorldV106=(action:ArchiveActionV106,revision:number)=>{viewportRef.current?.focus({preventScroll:true});clearInputs();return submitArchiveV106(action,revision);};
  const comparisonContextV107=useCallback(()=>({...cartographyContextV104(),legacyArchive:archiveDraftRefV106.current,otherOperationActive:(archivePlaqueActiveV109(plaqueDraftRefV109.current)||archiveContinuationActiveV111(continuationDraftRefV111.current))||cargoActiveV108(cargoDraftRefV108.current)||archiveActiveV106(archiveDraftRefV106.current)||cartographyActiveV105(cartographyDraftRefV105.current)||!!cartographyDraftRefV104.current.receipt&&cartographyDraftRefV104.current.receipt.phase!=='completed'}),[cartographyContextV104]);
  const comparisonWriteRefusedV107=useCallback((message:string)=>{comparisonWritePausedRefV107.current=true;setComparisonWritePausedV107(true);setComparisonMessageV107(message);clearInputs();},[clearInputs]);
  const submitComparisonV107=useCallback((action:ArchiveComparisonActionV107,revision:number)=>{
    const tx=createArchiveComparisonTransactionV107(()=>comparisonDraftRefV107.current,comparisonContextV107,next=>onProgress({...progressRef.current,archiveComparisonV107:next})),out=tx(action,revision);
    if(!out.ok){if(out.writeRefused)comparisonWriteRefusedV107(out.message);else setComparisonMessageV107(out.message);return false;}
    setComparisonMessageV107(out.message);return true;
  },[comparisonContextV107,onProgress,comparisonWriteRefusedV107]);
  const interruptComparisonV107=useCallback(()=>{const l=comparisonDraftRefV107.current;return !l.receipt||!['search','carrying','compare','return'].includes(l.receipt.phase)||submitComparisonV107('interrupt',l.revision);},[submitComparisonV107]);
  const sampleComparisonV107=useCallback((before:HomeworldActor,after:HomeworldActor,seconds:number)=>{
    if(comparisonWritePausedRefV107.current)return false;
    const out=sampleArchiveComparisonV107(comparisonDraftRefV107.current,before,after,seconds,comparisonContextV107());
    if(out.invalid){const stopped={...before,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);clearInputs();interruptComparisonV107();return false;}
    comparisonDraftRefV107.current=out.ledger;return true;
  },[comparisonContextV107,interruptComparisonV107,clearInputs]);
  const actComparisonFromWorldV107=(action:ArchiveComparisonActionV107,revision:number)=>{viewportRef.current?.focus({preventScroll:true});clearInputs();return submitComparisonV107(action,revision);};
  const retryComparisonV107=()=>{viewportRef.current?.focus({preventScroll:true});if(onProgress(progressRef.current))setComparisonMessageV107('Étude et dernier point enregistrés. Reprends l’action ici.');else comparisonWriteRefusedV107('L’enregistrement reste indisponible ; l’objet et les relevés sont conservés.');};
  const cargoContextV108=useCallback(()=>({...cartographyContextV104(),otherOperationActive:(archivePlaqueActiveV109(plaqueDraftRefV109.current)||archiveContinuationActiveV111(continuationDraftRefV111.current))||archiveComparisonActiveV107(comparisonDraftRefV107.current)||archiveActiveV106(archiveDraftRefV106.current)||cartographyActiveV105(cartographyDraftRefV105.current)||!!cartographyDraftRefV104.current.receipt&&cartographyDraftRefV104.current.receipt.phase!=='completed'}),[cartographyContextV104]);
  const cargoWriteRefusedV108=useCallback((message:string)=>{cargoWritePausedRefV108.current=true;setCargoWritePausedV108(true);setCargoMessageV108(message);clearInputs();},[clearInputs]);
  const submitCargoV108=useCallback((action:CargoActionV108,revision:number)=>{
    const tx=createCargoTransactionV108(()=>cargoDraftRefV108.current,cargoContextV108,next=>onProgress({...progressRef.current,cargoV108:next})),out=tx(action,revision);
    if(!out.ok){if(out.writeRefused)cargoWriteRefusedV108(out.message);else setCargoMessageV108(out.message);return false;}
    setCargoMessageV108(out.message);return true;
  },[cargoContextV108,onProgress,cargoWriteRefusedV108]);
  const interruptCargoV108=useCallback(()=>{const l=cargoDraftRefV108.current;return !l.receipt||!['working','return'].includes(l.receipt.phase)||submitCargoV108('interrupt',l.revision);},[submitCargoV108]);
  const sampleCargoV108=useCallback((before:HomeworldActor,after:HomeworldActor,seconds:number)=>{
    if(cargoWritePausedRefV108.current)return false;
    const out=sampleCargoWalkV108(cargoDraftRefV108.current,before,after,seconds,cargoContextV108());
    if(out.invalid){const stopped={...before,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);clearInputs();interruptCargoV108();return false;}
    cargoDraftRefV108.current=out.ledger;return true;
  },[cargoContextV108,interruptCargoV108,clearInputs]);
  const actCargoFromWorldV108=(action:CargoActionV108,revision:number)=>{viewportRef.current?.focus({preventScroll:true});clearInputs();return submitCargoV108(action,revision);};
  const retryCargoV108=()=>{viewportRef.current?.focus({preventScroll:true});if(onProgress(progressRef.current))setCargoMessageV108('Lots et dernier point enregistrés. Reprends l’action ici.');else cargoWriteRefusedV108('L’enregistrement reste indisponible ; chaque lot garde sa place et son propriétaire.');};
  const plaqueContextV109=useCallback(()=>({...cartographyContextV104(),artAvailable:motionAssetsV74.ready&&archivePlaqueArtAdmittedV109(),cargo:cargoDraftRefV108.current,otherOperationActive:cargoActiveV108(cargoDraftRefV108.current)||archiveComparisonActiveV107(comparisonDraftRefV107.current)||archiveActiveV106(archiveDraftRefV106.current)||cartographyActiveV105(cartographyDraftRefV105.current)||!!cartographyDraftRefV104.current.receipt&&cartographyDraftRefV104.current.receipt.phase!=='completed'}),[cartographyContextV104,motionAssetsV74.ready]);
  const plaqueWriteRefusedV109=useCallback((message:string)=>{plaqueWritePausedRefV109.current=true;setPlaqueWritePausedV109(true);setPlaqueMessageV109(message);clearInputs();},[clearInputs]);
  const continuationContextV111=useCallback(()=>({...plaqueContextV109(),currentOwnerCreatedAt:residentAdmissionRefV110.current.owner,active:plaqueContextV109().active&&residentAdmissionRefV110.current.active,basePlaque:plaqueDraftRefV109.current}),[plaqueContextV109]);
  const submitContinuationV111=useCallback((action:ArchiveContinuationActionV111,revision:number)=>{
    if(plaqueWritePausedRefV109.current)return false;
    const tx=createArchiveContinuationTransactionV111(()=>continuationDraftRefV111.current,continuationContextV111,next=>onProgress({...progressRef.current,archiveContinuationV111:next})),out=tx(action,revision);
    if(!out.ok){if(out.writeRefused)plaqueWriteRefusedV109(out.message);else setPlaqueMessageV109(out.message);return false;}
    setPlaqueMessageV109(out.message);return true;
  },[continuationContextV111,onProgress,plaqueWriteRefusedV109]);
  const actContinuationFromWorldV111=(action:ArchiveContinuationActionV111,revision:number)=>{viewportRef.current?.focus({preventScroll:true});clearInputs();return submitContinuationV111(action,revision);};
  const submitPlaqueV109=useCallback((action:ArchivePlaqueActionV109,revision:number)=>{
    if(plaqueWritePausedRefV109.current)return false;
    if(continuationDraftRefV111.current.receipt)return false;
    const tx=createArchivePlaqueTransactionV109(()=>plaqueDraftRefV109.current,plaqueContextV109,next=>onProgress({...progressRef.current,archivePlaqueV109:next})),out=tx(action,revision);
    if(!out.ok){if(out.writeRefused)plaqueWriteRefusedV109(out.message);else setPlaqueMessageV109(out.message);return false;}
    setPlaqueMessageV109(out.message);return true;
  },[plaqueContextV109,onProgress,plaqueWriteRefusedV109]);
  const submitEffectivePlaqueV111=useCallback((action:ArchivePlaqueActionV109,revision:number)=>{
    const continuation=continuationDraftRefV111.current;
    if(continuation.receipt?.phase==='active')return action!=='choose-b'&&revision===continuation.receipt.study?.revision&&submitContinuationV111(action,continuation.revision);
    return submitPlaqueV109(action,revision);
  },[submitContinuationV111,submitPlaqueV109]);
  const interruptPlaqueV109=useCallback(()=>{const l=archiveContinuationViewV111(continuationDraftRefV111.current)??plaqueDraftRefV109.current;return !l.receipt||!['working','return'].includes(l.receipt.phase)||submitEffectivePlaqueV111('interrupt',l.revision);},[submitEffectivePlaqueV111]);
  const samplePlaqueV109=useCallback((before:HomeworldActor,after:HomeworldActor,seconds:number)=>{
    if(plaqueWritePausedRefV109.current)return false;
    if(continuationDraftRefV111.current.receipt?.phase==='active'){
      const out=sampleArchiveContinuationWalkV111(continuationDraftRefV111.current,before,after,seconds,continuationContextV111());
      if(out.invalid){const stopped={...before,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);clearInputs();interruptPlaqueV109();return false;}
      continuationDraftRefV111.current=out.ledger;return true;
    }
    const out=sampleArchivePlaqueWalkV109(plaqueDraftRefV109.current,before,after,seconds,plaqueContextV109());
    if(out.invalid){const stopped={...before,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);clearInputs();interruptPlaqueV109();return false;}
    plaqueDraftRefV109.current=out.ledger;return true;
  },[plaqueContextV109,continuationContextV111,interruptPlaqueV109,clearInputs]);
  const actPlaqueFromWorldV109=(action:ArchivePlaqueActionV109,revision:number)=>{viewportRef.current?.focus({preventScroll:true});clearInputs();return submitPlaqueV109(action,revision);};
  const retryPlaqueV109=()=>{viewportRef.current?.focus({preventScroll:true});if(onProgress(progressRef.current))setPlaqueMessageV109('Pièces et dernier point K-17 enregistrés.');else plaqueWriteRefusedV109('L’enregistrement reste indisponible ; les pièces sont conservées.');};
  const commitCargoArrivalV108=useCallback(()=>{
    const backup=initialLocationV77.migrationBackup;if(!backup||!cargoMigrationPendingRefV108.current)return true;
    if(upgradeRecoveryPendingRefV112.current)return false;
    if(backup.ownerCreatedAt!==save.createdAt||backup.ownerCreatedAt!==saveRef.current.createdAt)return false;
    try{
      const bytes=JSON.stringify(backup),old=localStorage.getItem(initialLocationV77.migrationBackupKey);
      if(old!==null&&old!==bytes)throw Error('La copie de l’ancien point doit être conservée.');
      if(old===null)localStorage.setItem(initialLocationV77.migrationBackupKey,bytes);
      if(localStorage.getItem(initialLocationV77.migrationBackupKey)!==bytes)throw Error('La copie de l’ancien point n’a pas été confirmée.');
      cargoMigrationWriteReadyRefV108.current=true;
    }catch{setCargoMigrationMessageV108('La copie de l’ancien point n’a pas été enregistrée. Réessaie avant de reprendre.');return false;}
    if(!onProgress(progressRef.current)){setCargoMigrationMessageV108('Le point libre et les charges conservées n’ont pas été enregistrés. Réessaie ici.');return false;}
    const upgrade=homeworldGeometryRecoveryRequiredV112(progressRef.current.locationV77,save.createdAt,homeworldGeometryRecoveryLedgersV112(progressRef.current));
    upgradeRecoveryPendingRefV112.current=upgrade;setUpgradeRecoveryPendingV112(upgrade);cargoMigrationWriteReadyRefV108.current=!upgrade;
    cargoMigrationPendingRefV108.current=upgrade;setCargoMigrationPendingV108(false);setCargoMigrationMessageV108(initialLocationV77.cargoRecoveryMessage);return true;
  },[initialLocationV77,onProgress,save.createdAt]);
  useEffect(()=>{if(initialLocationV77.migrationBackup&&!cargoMigrationAttemptedRefV108.current){cargoMigrationAttemptedRefV108.current=true;commitCargoArrivalV108();}},[initialLocationV77,commitCargoArrivalV108]);
  const upgradeRecoveryContextV112=useCallback(()=>({
    ownerCreatedAt:upgradeRecoveryOwnerRefV112.current,currentOwnerCreatedAt:saveRef.current.createdAt,
    checkpoint:saveRef.current.homeworld.locationV77,ledgers:homeworldGeometryRecoveryLedgersV112(saveRef.current.homeworld),
    actor:{x:actorRef.current.x,y:actorRef.current.y},levelId:levelRefV77.current,interiorId:interiorRef.current?.buildingId??null,
    inTransit:!!transitRefV77.current||!!skiffRefV77.current,
    active:!suspendedRef.current&&!paused&&!inactive&&motionAssetsV74.ready&&!document.hidden&&document.hasFocus(),
  }),[paused,inactive,motionAssetsV74.ready]);
  const prepareUpgradeRecoveryV112=()=>{
    if(!upgradeRecoveryPendingRefV112.current)return;
    clearInputs();
    const submitted=upgradeRecoverySubmittedRefV112.current;
    if(submitted&&homeworldGeometryRecoverySaveMatchesV112(submitted,saveRef.current.createdAt,saveRef.current.homeworld)){
      setUpgradeRecoveryPlanV112(submitted);setUpgradeRecoveryWriteRefusedV112(true);
      setUpgradeRecoveryMessageV112('La restauration a été écrite. Réessaie pour confirmer la lecture de sa copie conservée avant de reprendre.');return;
    }
    const inspected=planHomeworldGeometryRecoveryV112(upgradeRecoveryContextV112());
    setUpgradeRecoveryPlanV112(inspected.plan);setUpgradeRecoveryMessageV112(inspected.reason);setUpgradeRecoveryWriteRefusedV112(false);
  };
  const confirmUpgradeRecoveryV112=(key:string)=>{
    if(!upgradeRecoveryPendingRefV112.current)return;
    clearInputs();
    const submitted=upgradeRecoverySubmittedRefV112.current;
    if(submitted&&key===submitted.key&&homeworldGeometryRecoverySaveMatchesV112(submitted,saveRef.current.createdAt,saveRef.current.homeworld)){
      if(homeworldGeometryRecoveryBackupConfirmedV112(submitted,localStorage)&&finishUpgradeRecoveryV112(submitted,saveRef.current.homeworld)){
        setUpgradeRecoveryPlanV112(null);setUpgradeRecoveryWriteRefusedV112(false);
        setUpgradeRecoveryMessageV112('La restauration locale est enregistrée.');setAnnouncement('La restauration locale est enregistrée.');
      }else{setUpgradeRecoveryWriteRefusedV112(true);setUpgradeRecoveryMessageV112('La copie conservée ne peut pas encore être relue. Réessaie avant de reprendre.');}
      return;
    }
    const transaction=createHomeworldGeometryRecoveryTransactionV112(upgradeRecoveryContextV112,
      proposal=>storeHomeworldGeometryRecoveryBackupV112(proposal,localStorage),proposal=>{
        if(saveRef.current.createdAt!==proposal.ownerCreatedAt||upgradeRecoveryOwnerRefV112.current!==proposal.ownerCreatedAt)return false;
        const current=saveRef.current.homeworld;
        const durable={...current,...proposal.ledgers,...(proposal.checkpoint?{locationV77:proposal.checkpoint}:{})};
        // No live actor/draft ref or React setter changes before acknowledgement.
        // False/throw therefore retains the exact prior local state as well as
        // the untouched original checkpoint/documents in the durable backup.
        upgradeRecoverySubmittedRefV112.current=proposal;
        if(!persistProgress(durable))return false;
        if(saveRef.current.createdAt!==proposal.ownerCreatedAt)return false;
        return finishUpgradeRecoveryV112(proposal,durable);
      });
    const out=transaction(key);
    setUpgradeRecoveryWriteRefusedV112(!!out.writeRefused);setUpgradeRecoveryMessageV112(out.message);setAnnouncement(out.message);
    if(out.ok){setUpgradeRecoveryPlanV112(null);viewportRef.current?.focus({preventScroll:true});}
    else if(out.stale)setUpgradeRecoveryPlanV112(null);
  };
  const cntlipV77=useHomeworldCntlipV77({save,actor,room:interior,sceneReady:!cargoMigrationPendingV108&&!suspended&&!paused&&!inactive&&!transitV77&&!skiffV77&&motionAssetsV74.ready,saveRef,progressRef,actorRef,interiorRef,onProgress,clearInputs,onNotify,
    sceneAvailable:()=>!suspendedRef.current&&!pausedRef.current&&!transitRefV77.current&&!skiffRefV77.current&&!document.hidden});
  const {open:openCntlipV77,leave:leaveCntlipV77}=cntlipV77;
  const cntlipMovementRefV77=useRef(1);
  useEffect(()=>{cntlipMovementRefV77.current=cntlipV77.effects.movementMultiplier;},[cntlipV77.effects.movementMultiplier]);

  const changeWayfindingOpenV75 = useCallback((open: boolean) => {
    clearInputs();
    wayfindingOpenRefV75.current = false;
    spatialCodexOpenRef.current = open; setSpatialCodexOpen(open);
    if (open) {
      // One modal owns keyboard and gamepad. Do not leave an old dialogue or
      // atlas focus trap running under the physical destination finder.
      dialogStateRef.current = null; setDialog(null);
      spatialCodexOpenRef.current = true; setSpatialCodexOpen(true);
    }
    pausedRef.current = paused || inactive || open || (open ? false : spatialCodexOpen) || !motionAssetsV74.ready;
    setWayfindingOpenV75(false);
    if (!open) requestAnimationFrame(() => {
      if (!wayfindingOpenRefV75.current && !spatialCodexOpenRef.current && !dialogStateRef.current)
        viewportRef.current?.focus({ preventScroll: true });
    });
  }, [clearInputs, paused, inactive, spatialCodexOpen, motionAssetsV74.ready]);

  const requestLandmarkV75 = useCallback((id: string) => {
    if (suspendedRef.current || inactive || !motionAssetsV74.ready) return;
    setWayfindingRequestV75(current => ({ id, nonce: (current?.nonce ?? 0) + 1 }));
    changeWayfindingOpenV75(true);
  }, [changeWayfindingOpenV75, inactive, motionAssetsV74.ready]);

  const residentContextV110 = useCallback(() => ({
    ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:residentAdmissionRefV110.current.owner,
    actor:actorRef.current,levelId:levelRefV77.current,seconds:cityClockV68.current,
    interiorId:interiorRef.current?.buildingId,inTransit:!!transitRefV77.current||!!skiffRefV77.current,
    active:residentAdmissionRefV110.current.active&&!suspendedRef.current&&!pausedRef.current&&!document.hidden&&document.hasFocus(),
    cargo:cargoDraftRefV108.current,
  }),[save.createdAt]);

  const recoveryContextV111=useCallback(()=>({ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:residentAdmissionRefV110.current.owner,
    checkpoint:progressRef.current.locationV77,ledgers:homeworldArrivalRecoveryLedgersV111(progressRef.current),actor:actorRef.current,
    levelId:levelRefV77.current,interiorId:interiorRef.current?.buildingId??null,inTransit:!!transitRefV77.current||!!skiffRefV77.current,
    active:residentAdmissionRefV110.current.active&&!suspendedRef.current&&!pausedRef.current&&!document.hidden&&document.hasFocus(),
  }),[save.createdAt]);
  const prepareRecoveryV111=()=>{
    const dialog=dialogStateRef.current?.recoveryV111;if(!dialog||dialog.owner!==saveRef.current.createdAt)return;
    const ledger=progressRef.current.arrivalRecoveryV111??defaultHomeworldArrivalRecoveryV111(saveRef.current.createdAt);
    const inspected=planHomeworldArrivalRecoveryV111(ledger,recoveryContextV111());
    setRecoveryPlanV111(inspected.plan);setRecoveryMessageV111(inspected.reason);setRecoveryWriteRefusedV111(false);
  };
  const confirmRecoveryV111=(key:string)=>{
    const dialog=dialogStateRef.current?.recoveryV111;if(!dialog||dialog.owner!==saveRef.current.createdAt)return;
    const transaction=createHomeworldArrivalRecoveryTransactionV111(()=>progressRef.current.arrivalRecoveryV111??defaultHomeworldArrivalRecoveryV111(saveRef.current.createdAt),recoveryContextV111,proposal=>{
      const previous={actor:actorRef.current,exterior:exteriorAnchorRef.current,room:interiorRef.current,level:levelRefV77.current};
      const restored={...previous.actor,...proposal.checkpoint.exterior,vx:0,vy:0};let acknowledged=false;
      actorRef.current=restored;exteriorAnchorRef.current=restored;interiorRef.current=null;levelRefV77.current=proposal.checkpoint.levelId;
      try{
        acknowledged=onProgress({...progressRef.current,arrivalRecoveryV111:proposal.ledger});
        if(acknowledged){setActor(restored);setInteriorId(null);setLevelIdV77(proposal.checkpoint.levelId);setElevationV77(homeworldLevelV77(proposal.checkpoint.levelId).elevation);}
        return acknowledged;
      }finally{
        if(!acknowledged){actorRef.current=previous.actor;exteriorAnchorRef.current=previous.exterior;interiorRef.current=previous.room;levelRefV77.current=previous.level;}
      }
    });
    const result=transaction(key);setRecoveryMessageV111(result.message);setRecoveryWriteRefusedV111(!!result.writeRefused);
    if(result.ok){dialogStateRef.current=null;setDialog(null);clearInputs();setRecoveryPlanV111(null);setAnnouncement(result.message);onNotify(result.message);requestAnimationFrame(()=>viewportRef.current?.focus({preventScroll:true}));}
    else if(result.stale)setRecoveryPlanV111(null);
  };
  const enterInterior = useCallback((buildingId: string) => {
    const building = nearestHomeworldDoorV77(levelRefV77.current, actorRef.current);
    if (interiorRef.current || transitRefV77.current || suspendedRef.current || pausedRef.current || dialogStateRef.current || building?.id !== buildingId) return;
    const room = homeworldInteriorForBuildingV64(buildingId);
    if (!room) return;
    const entry=actorRef.current;
    if(!homeworldExteriorArrivalAllowedV110(levelRefV77.current,entry,cargoDraftRefV108.current,saveRef.current.createdAt)){
      const message='L’entrée est encombrée. Rejoins un point libre devant la porte avant de réessayer.';setAnnouncement(message);onNotify(message);return;
    }
    clearInputs();
    // Preserve the real supported entrance. Snapping to the authored centre
    // could save an exterior anchor inside a lot approached from the side.
    exteriorAnchorRef.current = { ...entry, vx: 0, vy: 0 };
    const next = { ...actorRef.current, ...room.spawn, vx: 0, vy: 0, facing: 1 as const };
    youthMotionRefV74.current = { ...youthMotionRefV74.current, direction: 'n' };
    setYouthMotionV74(youthMotionRefV74.current);
    interiorRef.current = room; actorRef.current = next;
    setInteriorId(room.buildingId); setActor(next); recordLocationV77();
    setAnnouncement(`Entrée dans ${room.title}. Approche les personnages ou rejoins la sortie au sud.`);
    requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true }));
  }, [clearInputs, recordLocationV77,onNotify]);

  const exitInterior = useCallback(() => {
    const room = interiorRef.current;
    if (!room || suspendedRef.current || pausedRef.current || dialogStateRef.current
      || nearestHomeworldInteriorTargetV64(room, actorRef.current)?.kind !== "exit") return;
    clearInputs();
    const next = homeworldInteriorExitV110(levelRefV77.current,exteriorAnchorRef.current,cargoDraftRefV108.current,saveRef.current.createdAt);
    if (!next) {
      const message='Le seuil extérieur est occupé. Tu peux consulter un ancien point extérieur conservé.';setAnnouncement(message);onNotify(message);
      const inspection=planHomeworldArrivalRecoveryV111(progressRef.current.arrivalRecoveryV111??defaultHomeworldArrivalRecoveryV111(saveRef.current.createdAt),recoveryContextV111());
      if(inspection.plan){setRecoveryPlanV111(null);setRecoveryMessageV111('');setRecoveryWriteRefusedV111(false);const next={point:null,recoveryV111:{owner:saveRef.current.createdAt}};dialogStateRef.current=next;setDialog(next);}
      else {setAnnouncement(inspection.reason);onNotify(inspection.reason);}
      return;
    }
    interiorRef.current = null; actorRef.current = next;
    setInteriorId(null); setActor(next); recordLocationV77(); setAnnouncement("Retour au seuil extérieur.");
    requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true }));
  }, [clearInputs, recordLocationV77,onNotify,recoveryContextV111]);

  const persistAction = useCallback((action: HomeworldAction, announce = true) => {
    const currentSave = saveRef.current;
    const result = applyHomeworldAction(progressRef.current, action, { rankId: currentSave.profile.rankId, ownedTrophyCount: currentSave.trophies.length });
    if (result.changed && !onProgress(result.progress)) {
      const message = "Sauvegarde impossible : cette action n’a pas été enregistrée. Réessaie avant de quitter la cité.";
      setAnnouncement(message);
      onNotify(message);
      return { ok: false, message };
    }
    // onProgress has already acknowledged the same result with its physical checkpoint.
    if (announce) { setAnnouncement(result.message); onNotify(result.message); }
    return { ok: result.ok, message: result.message };
  }, [onNotify, onProgress]);

  // Only IDs reached by the actual city actor enter this retry queue. Failed
  // writes do not alter local progression, and no frame retries storage by itself.
  const persistVisit = useCallback((districtId: string) => {
    if (pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt) return false;
    const result = persistAction({ type: "visit", districtId }, false);
    if (result.ok) pendingVisitsRef.current.delete(districtId);
    else pendingVisitsRef.current.add(districtId);
    setPendingVisitCount(pendingVisitsRef.current.size);
    return result.ok;
  }, [persistAction, save.createdAt]);

  const retryPendingVisits = useCallback(() => {
    if (suspendedRef.current || pendingVisitsRef.current.size === 0
      || pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt) return;
    clearInputs();
    // Recompute each visit against the latest acknowledged progress. Stop after
    // the first refusal; keep it and the remaining visits available for retry.
    for (const districtId of [...pendingVisitsRef.current]) {
      if (!persistVisit(districtId)) return;
    }
    const message = "Visites de quartiers enregistrées.";
    setAnnouncement(message); onNotify(message);
    // The retry button disappears after success: retain useful keyboard/pad focus.
    (dialogStateRef.current ? dialogRef.current : viewportRef.current)?.focus({ preventScroll: true });
  }, [clearInputs, onNotify, persistVisit, save.createdAt]);

  const enterYouthTraining = useCallback(() => {
    if (suspendedRef.current || !onYouthTraining
      || pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt) return;
    clearInputs();
    // The youth screen unmounts this city. Keep its unacknowledged visit queue
    // alive until an explicit retry has durably stored every reached district.
    if (pendingVisitsRef.current.size > 0) {
      const message = "Des visites de quartiers restent non enregistrées. Réessaie leur enregistrement ici avant de rejoindre le maître ; ta progression reste conservée dans la cité.";
      setAnnouncement(message); onNotify(message);
      setDialog(current => current ? { ...current, message } : current);
      return;
    }
    if (!onYouthTraining()) setDialog(current => current ? { ...current, message: "L’entrée au dojo n’a pas pu être sauvegardée. Réessaie ici ; aucun exercice n’a été accordé." } : current);
  }, [clearInputs, onNotify, onYouthTraining, save.createdAt]);

  const closeDialog = useCallback(() => {
    leaveCntlipV77();
    dialogStateRef.current=null;
    setDialog(null);
    clearInputs();
    // Hand input back before React removes the focused dialog control. The
    // next city frame must not mistake that DOM replacement for window blur.
    viewportRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true }));
  }, [clearInputs,leaveCntlipV77]);

  const interact = useCallback(() => {
    if (cargoMigrationPendingRefV108.current || suspendedRef.current || pausedRef.current || dialogStateRef.current || transitRefV77.current || skiffRefV77.current) return;
    viewportRef.current?.focus({preventScroll:true});
    const room = interiorRef.current;
    if(cartographyWritePausedRefV104.current||cartographyWritePausedRefV105.current||archiveWritePausedRefV106.current||comparisonWritePausedRefV107.current||cargoWritePausedRefV108.current||plaqueWritePausedRefV109.current)return;
    if(!room){
      const effectivePlaque=archiveContinuationViewV111(continuationDraftRefV111.current)??plaqueDraftRefV109.current;
      const plaqueAction=archivePlaqueNearbyV109(effectivePlaque,plaqueContextV109());
      if(plaqueAction){clearInputs();submitEffectivePlaqueV111(plaqueAction.action,effectivePlaque.revision);return;}
      if(archivePlaquePostReachedV109(plaqueContextV109())){clearInputs();if(!plaqueDraftRefV109.current.receipt){if(!submitPlaqueV109('open',plaqueDraftRefV109.current.revision))return;}else if(!onProgress(progressRef.current)){plaqueWriteRefusedV109('Le point de l’étude K-17 n’a pas été enregistré. Réessaie ici.');return;}const stopped={...actorRef.current,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);const next={point:null,archivePlaqueV109:{owner:saveRef.current.createdAt}};dialogStateRef.current=next;setDialog(next);return;}
      const cargoAction=cargoNearbyV108(cargoDraftRefV108.current,cargoContextV108());
      if(cargoAction){clearInputs();submitCargoV108(cargoAction.action,cargoDraftRefV108.current.revision);return;}
      if(cargoPostReachedV108(cargoContextV108(),cargoDraftRefV108.current)){clearInputs();if(!onProgress(progressRef.current)){cargoWriteRefusedV108('La position des lots n’a pas été enregistrée. Réessaie ici.');return;}const stopped={...actorRef.current,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);const next={point:null,cargoV108:{owner:saveRef.current.createdAt}};dialogStateRef.current=next;setDialog(next);return;}
      const comparisonAction=archiveComparisonNearbyV107(comparisonDraftRefV107.current,comparisonContextV107());
      if(comparisonAction&&comparisonAction.action!=='compare'){clearInputs();submitComparisonV107(comparisonAction.action,comparisonDraftRefV107.current.revision);return;}
      const comparisonAt=comparisonAction?.action==='compare'?'table':archiveComparisonPostReachedV107(comparisonContextV107())?'post':null;
      if(comparisonAt){clearInputs();if(!onProgress(progressRef.current)){comparisonWriteRefusedV107('Le point de l’étude n’a pas été enregistré. Réessaie ici.');return;}const stopped={...actorRef.current,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);const next={point:null,archiveComparisonV107:{owner:saveRef.current.createdAt,at:comparisonAt as 'post'|'table'}};dialogStateRef.current=next;setDialog(next);return;}
      const archiveAction=archiveNearbyActionV106(archiveDraftRefV106.current,archiveContextV106());
      if(archiveAction){clearInputs();submitArchiveV106(archiveAction.action,archiveDraftRefV106.current.revision);return;}
      if(archivePostReachedV106(archiveContextV106())){
        clearInputs();if(!onProgress(progressRef.current)){archiveWriteRefusedV106('La position des dossiers n’a pas été enregistrée. Réessaie ici.');return;}
        const stopped={...actorRef.current,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);
        const next={point:null,archiveV106:{owner:saveRef.current.createdAt}};dialogStateRef.current=next;setDialog(next);return;
      }
    }
    if((archiveContinuationViewV111(continuationDraftRefV111.current)??plaqueDraftRefV109.current).receipt?.carrier){setPlaqueMessageV109('Dépose la pièce, ou interromps et conserve-la au sol avant une autre activité.');clearInputs();return;}
    if(!interruptPlaqueV109())return;
    if(cargoDraftRefV108.current.receipt?.carrier){setCargoMessageV108('Dépose le lot à sa place, ou interromps et pose-le au sol avant une autre activité.');clearInputs();return;}
    if(!interruptCargoV108())return;
    if(comparisonDraftRefV107.current.receipt?.evidence.place==='carried'){setComparisonMessageV107('Dépose C au pupitre, ou interromps et pose-le dans un passage visible avant une autre activité.');clearInputs();return;}
    if(!interruptComparisonV107())return;
    if(archiveDraftRefV106.current.receipt?.carrier){setArchiveMessageV106('Dépose le dossier sur son support, ou interromps et pose-le au sol avant une autre activité.');clearInputs();return;}
    if(!interruptArchiveV106())return;
    const reportingAtPost=!room&&cartographyDraftRefV104.current.receipt?.phase==='return'&&cartographyPostReachedV104(cartographyContextV104());
    if(!reportingAtPost&&!interruptCartographyV104())return;
    const nearA=!room?nearestHomeworldConnectorV77(levelRefV77.current,actorRef.current):null;
    const continuingA=!room&&(nearA?.connector.id===HOMEWORLD_CARTOGRAPHY_V105.connectorId||cartographyPostReachedV104(cartographyContextV104())||cartographyHighPointReachedV105(cartographyContextV105()));
    if(!continuingA&&!interruptCartographyV105())return;
    if(!room&&openObservationV105())return;
    if (!room) {
      const near = nearestHomeworldConnectorV77(levelRefV77.current, actorRef.current);
      let liftReady = true;
      if (near?.connector.kind === 'lift') {
        if (!liftSessionReadyRefV83.current || liftRefV83.current.ownerCreatedAt !== saveRef.current.createdAt) return;
        liftReady = homeworldLiftAtSocketV83(liftRefV83.current, near.connector.id, near.reverse);
        if (!liftReady) {
          clearInputs();
          const called = callHomeworldLiftV83(liftRefV83.current, near.connector, near.reverse);
          updateLiftStationV83(called);
          setAnnouncement(called.journey?.to === (near.reverse ? 1 : 0)
            ? 'Cabine appelée à ce palier. Attends son arrivée, puis interagis à nouveau pour embarquer.'
            : 'La cabine termine un appel à l’autre palier. Tu pourras la rappeler après son arrivée.');
          return;
        }
      }
      const transit = beginHomeworldTransitV77(levelRefV77.current, actorRef.current, liftReady);
      if (transit) {
        const connector = near?.connector;
        clearInputs();
        if (connector?.kind === 'lift') updateLiftStationV83(homeworldLiftPassengerV83(liftRefV83.current, transit, connector));
        transitRefV77.current = transit; setTransitV77(transit);
        setAnnouncement('Passage physique : ' + connector?.name); return;
      }
    }
    if (room && nearestHomeworldInteriorTargetV64(room, actorRef.current)?.kind === "exit") { exitInterior(); return; }
    const socialHost=homeworldCntlipEligibleV77(saveRef.current)?homeworldCntlipReachedV77(room,actorRef.current):null;
    if(socialHost&&openCntlipV77(socialHost.siteId)){
      setActor(actorRef.current);const next={point:null,cntlipSiteId:socialHost.siteId};dialogStateRef.current=next;setDialog(next);return;
    }
    if(!room&&cartographyPostReachedV104(cartographyContextV104())){
      clearInputs();const stopped={...actorRef.current,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);
      const next={point:null,cartographyV104:{owner:saveRef.current.createdAt}};dialogStateRef.current=next;setDialog(next);return;
    }
    const door = room ? null : nearestHomeworldDoorV77(levelRefV77.current, actorRef.current);
    if (door) { enterInterior(door.id); return; }
    const point = pointInCurrentSpace(actorRef.current, room, levelRefV77.current);
    if (!point) {
      const resident = !room && nearestHomeworldResidentContactV110(residentContextV110());
      if (resident) {
        clearInputs();const stopped={...actorRef.current,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);
        setPhase(cityClockV68.current);
        const next={point:null,residentV110:{id:resident.id,owner:saveRef.current.createdAt}};dialogStateRef.current=next;setDialog(next);return;
      }
      const streetContact = !room && nearestHomeworldStreetContactV100({actor:actorRef.current,levelId:levelRefV77.current,seconds:cityClockV68.current,inTransit:!!transitRefV77.current||!!skiffRefV77.current,suspended:suspendedRef.current});
      if (streetContact) {
        clearInputs();
        const stopped={...actorRef.current,vx:0,vy:0};actorRef.current=stopped;setActor(stopped);
        const next={point:null,streetContactV100:{id:streetContact.id,owner:saveRef.current.createdAt}};
        dialogStateRef.current=next;setDialog(next);
      }
      return;
    }
    clearInputs();
    let message: string | undefined;
    if (point.npcId && !(youthWelcome && point.npcId === "terrace-instructor" && !progressRef.current.greetedNpcIds.includes("hunt-king"))) {
      const greeting = persistAction({ type: "greet", npcId: point.npcId }, false);
      // Youth has its own greeting above; keep failure feedback, not adult service notices.
      message = youthWelcome && greeting.ok ? undefined : greeting.message;
      if (!greeting.ok) { setDialog({ point, message }); return; }
    }
    if (!youthWelcome && point.kind === "evidence" && point.evidenceId) message = persistAction({ type: "inspect", evidenceId: point.evidenceId }).message;
    setDialog({ point, message });
  }, [clearInputs, enterInterior, exitInterior, persistAction, residentContextV110, youthWelcome,openCntlipV77,updateLiftStationV83,interruptCartographyV104,cartographyContextV104,cartographyContextV105,interruptCartographyV105,openObservationV105,archiveContextV106,submitArchiveV106,interruptArchiveV106,onProgress,archiveWriteRefusedV106,comparisonContextV107,submitComparisonV107,interruptComparisonV107,comparisonWriteRefusedV107,cargoContextV108,submitCargoV108,interruptCargoV108,cargoWriteRefusedV108,plaqueContextV109,submitPlaqueV109,submitEffectivePlaqueV111,interruptPlaqueV109,plaqueWriteRefusedV109]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setViewportSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!blocked) return;
    // The motor is already gated by its modal/suspension refs. Defer only the
    // tactile button's React state reset, avoiding a cascading effect render.
    const frame = requestAnimationFrame(clearInputs);
    return () => cancelAnimationFrame(frame);
  }, [blocked, clearInputs]);

  useEffect(() => {
    const blur = () => { clearInputs(); setInactive(true); };
    const visibility = () => { if (document.hidden) blur(); };
    const keyup = (event: globalThis.KeyboardEvent) => held.current.delete(event.code);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keyup", keyup);
    return () => { window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("keyup", keyup); };
  }, [clearInputs]);

  useEffect(() => {
    if (!dialog) return;
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [dialog]);

  // One clock drives movement. Keys, pointer holds and the gamepad share the
  // same collision model; no input can advance a hidden or suspended surface.
  useEffect(() => {
    let request = 0;
    let previous = 0;
    let renderedAt = 0;
    let jumpWasPressed = false;
    let clock = cityClockV68.current;
    const keyboardHeld = (action: ControlActionId) => [...held.current].some(code => matchesControlAction(action, code, bindings));
    const frame = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 1000, 1 / 30) : 0;
      previous = time;
      if(upgradeRecoveryPendingRefV112.current){jumpWasPressed=false;request=requestAnimationFrame(frame);return;}
      const ownsFocus = !!rootRef.current?.contains(document.activeElement) && document.hasFocus();
      const active = ownsFocus && !document.hidden && !suspendedRef.current && !spatialCodexOpenRef.current && !wayfindingOpenRefV75.current;
      const guideOptionsV111=rootRef.current?.querySelector?.<HTMLDetailsElement>('[data-homeworld-guide-options-v111][open]')??null;
      const guideOptionsFocusedV111=!!guideOptionsV111?.contains(document.activeElement);
      const context = !active ? "inactive" : dialogStateRef.current||guideOptionsFocusedV111 ? "dialog" : pausedRef.current ? "paused" : "world";
      let pad: Gamepad | null = null;
      if (active) {
        try { pad = [...(navigator.getGamepads?.() ?? [])].find(value => value?.connected) ?? null; }
        catch { /* A denied controller API must not stop keyboard/touch or the city clock. */ }
      }
      const gamepad = stepHomeworldGamepad(gamepadStateRef.current, pad, context);
      gamepadStateRef.current = gamepad.state;
      if (gamepad.actions.pause) {
        setPaused(!pausedRef.current); setInactive(false); clearInputs();
      }
      if (!suspendedRef.current && (!pausedRef.current || dialogStateRef.current || guideOptionsFocusedV111)) {
        if (dialogStateRef.current) {
          const choices = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled),summary") ?? [])].filter(choice=>!choice.getClientRects||choice.getClientRects().length>0);
          if (gamepad.actions.menuDirection && choices.length) {
            const selected = choices.indexOf(document.activeElement as HTMLElement);
            choices[nextHomeworldDialogChoice(selected, choices.length, gamepad.actions.menuDirection)]?.focus();
          }
          if (gamepad.actions.cancel) closeDialog();
          else if (gamepad.actions.confirm) {
            const selected = choices.find(choice => choice === document.activeElement);
            (selected ?? choices[0])?.click();
          }
        } else if(guideOptionsFocusedV111&&guideOptionsV111){
          const summary=guideOptionsV111.querySelector<HTMLElement>('summary');
          const choices=[...(summary?[summary]:[]),...guideOptionsV111.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
          if(gamepad.actions.menuDirection&&choices.length){const selected=choices.indexOf(document.activeElement as HTMLElement);choices[nextHomeworldDialogChoice(selected,choices.length,gamepad.actions.menuDirection)]?.focus();}
          if(gamepad.actions.cancel){guideOptionsV111.open=false;clearInputs();viewportRef.current?.focus({preventScroll:true});}
          else if(gamepad.actions.confirm){const selected=choices.find(choice=>choice===document.activeElement);(selected??choices[0])?.click();}
        } else if (gamepad.actions.confirm) interact();
      }
      // Context-changing actions cannot move the actor in the same frame.
      const handledAction = gamepad.actions.pause || gamepad.actions.confirm || gamepad.actions.cancel;
      const plaqueLiveV111=continuationDraftRefV111.current.receipt?.study?.receipt??plaqueDraftRefV109.current.receipt;
      if (active && !suspendedRef.current && !pausedRef.current && !dialogStateRef.current && !guideOptionsFocusedV111 && !document.hidden && !handledAction && !cartographyWritePausedRefV104.current && !cartographyWritePausedRefV105.current && !archiveWritePausedRefV106.current && !(archiveDraftRefV106.current.receipt?.phase==='interrupted'&&archiveDraftRefV106.current.receipt.carrier) && !comparisonWritePausedRefV107.current && !(comparisonDraftRefV107.current.receipt?.phase==='interrupted'&&comparisonDraftRefV107.current.receipt.evidence.place==='carried') && !cargoWritePausedRefV108.current && !(cargoDraftRefV108.current.receipt?.phase==='interrupted'&&cargoDraftRefV108.current.receipt.carrier) && !plaqueWritePausedRefV109.current && !(plaqueLiveV111?.phase==='interrupted'&&plaqueLiveV111.carrier)) {
        // Empty machinery and passengers share this focus/modal-gated clock.
        // An empty arrival never boards the hunter or writes a campaign save.
        if (liftSessionReadyRefV83.current && liftRefV83.current.ownerCreatedAt === saveRef.current.createdAt) {
          const called = stepHomeworldLiftCallV83(liftRefV83.current, dt);
          if (called.state !== liftRefV83.current) updateLiftStationV83(called.state);
          if (called.arrived) setAnnouncement('La cabine est arrivée au palier ' + (called.state.position === 1 ? '+1' : '0') + '. Rejoins son seuil et interagis pour embarquer.');
        }
        const left = keyboardHeld("hunt.moveLeft") || touch.current.left || gamepad.movement.left;
        const right = keyboardHeld("hunt.moveRight") || touch.current.right || gamepad.movement.right;
        const up = keyboardHeld("hunt.moveUp") || touch.current.up || gamepad.movement.up;
        const down = keyboardHeld("hunt.moveDown") || touch.current.down || gamepad.movement.down;
        const jump = keyboardHeld("hunt.jump") || touch.current.jump || gamepad.movement.jump;
        const sprinting = keyboardHeld("hunt.aim") || touch.current.sprint || gamepad.movement.sprint;
        const controls = { moveX: (Number(right) - Number(left))*cntlipMovementRefV77.current, climb: (Number(down) - Number(up))*cntlipMovementRefV77.current, jumpPressed: jump && !jumpWasPressed, sprinting };
        const room = interiorRef.current;
        const before = actorRef.current;
        const walkingTransitV77 = !!transitRefV77.current && !room && !skiffRefV77.current;
        let next;
        if (skiffRefV77.current && !room) {
          const ride = skiffRefV77.current;
          const moving = stepHomeworldSkiffV77(ride, before, dt);
          next = moving.actor; skiffRefV77.current = moving.ride; setSkiffV77(moving.ride);
          if (moving.done) {
            // The visual ride ends first. Access is then rechecked against the
            // current save; a refused callback returns to the supported dock.
            next = { ...before, ...ride.source, vx: 0, vy: 0 }; actorRef.current = next;
            if (!canEnterHomeworldRegionV68(saveRef.current, ride.regionId).allowed || !onRegionV68?.(ride.regionId)) {
              setAnnouncement('Traversée non confirmée : retour au quai, aucun accès ni gain accordé.');
            }
          }
        } else if (transitRefV77.current && !room) {
          const ride = transitRefV77.current;
          const moving = stepHomeworldTransitV110(ride, before, dt,cargoDraftRefV108.current,false,saveRef.current.createdAt);
          const liftConnector = HOMEWORLD_CONNECTORS_V77.find(connector => connector.id === ride.connectorId && connector.kind === 'lift');
          if (liftConnector) updateLiftStationV83(moving.error
            ? returnHomeworldLiftAfterRefusalV83(liftRefV83.current, ride, liftConnector)
            : homeworldLiftPassengerV83(liftRefV83.current, moving.transit ?? ride, liftConnector, moving.done));
          next = moving.actor; transitRefV77.current = moving.transit; setTransitV77(moving.transit);
          setElevationV77(moving.elevation); levelRefV77.current = moving.levelId; setLevelIdV77(moving.levelId);
          if (moving.error) {setAnnouncement(moving.error);onNotify(moving.error);}
          if (moving.done) { actorRef.current = next; exteriorAnchorRef.current = next; recordCartographyTransitV105(ride,next,dt); if(!recordLocationV77()&&cartographyActiveV105(cartographyDraftRefV105.current))cartographyWriteRefusedV105('Le passage d’escalier n’a pas été enregistré. Réessaie sur ce palier avant de poursuivre.'); setAnnouncement('Arrivée · ' + homeworldLevelV77(moving.levelId).name); }
        } else next = room ? stepHomeworldActorOnFloor(before, controls, dt,
          point => isHomeworldInteriorWalkableV64(room, point), () => ({ ...createHomeworldActor(), ...room.spawn }))
          : stepHomeworldCargoActorV108(before, controls, dt, levelRefV77.current,cargoDraftRefV108.current);
        jumpWasPressed = jump;
        actorRef.current = next;
        if(!samplePlaqueV109(before,next,dt))next=actorRef.current;
        if(!sampleCargoV108(before,next,dt))next=actorRef.current;
        if(!sampleComparisonV107(before,next,dt))next=actorRef.current;
        if(!sampleArchiveV106(before,next,dt))next=actorRef.current;
        sampleCartographyV104(before,next,dt);
        if(!walkingTransitV77&&!skiffRefV77.current)sampleCartographyV105(before,next,dt);
        // Advance native walk poses only by real travel, never by a doorway
        // teleport or a separate animation clock. Collision stops the cycle.
        const travelled = Math.hypot(next.x - before.x, next.y - before.y);
        const boundedTravel = Number.isFinite(travelled) && travelled <= Math.max(HOMEWORLD_ACTOR.walkSpeed, HOMEWORLD_ACTOR.depthSpeed) * dt * 2;
        // Stairs/ramps resolve their real XY with zero motor velocity. Only the
        // native pose uses this measured travel; lift and boat passengers idle.
        const nativeVelocity = walkingTransitV77 && boundedTravel && dt > 0
          ? { x: (next.x - before.x) / dt, y: (next.y - before.y) / dt }
          : { x: next.vx, y: next.vy };
        youthMotionRefV74.current = {
          direction: homeworldYouthDirectionV74(nativeVelocity, youthMotionRefV74.current.direction, Math.hypot(nativeVelocity.x, nativeVelocity.y) > 5),
          distanceWorld: youthMotionRefV74.current.distanceWorld + (boundedTravel ? travelled : 0),
          velocity: nativeVelocity,
        };
        // Same bounded springs as the hunt renderer, advanced only by this
        // active simulation clock: braking settles, pause freezes every strand.
        dreadMotionRef.current = stepHunterDreadsV63(dreadMotionRef.current, dt, next.vx * next.facing, next.vy);
        clock += dt;
        cityClockV68.current = clock;
        const entered = room || transitRefV77.current || skiffRefV77.current ? null : districtAtHomeworldActorV77(levelRefV77.current, next);
        if (entered && visitedAttempt.current !== entered.id) {
          visitedAttempt.current = entered.id;
          persistVisit(entered.id);
        }
        if (time - renderedAt >= 1000 / 30) { setPlaqueViewV109(plaqueDraftRefV109.current); setContinuationViewV111(continuationDraftRefV111.current); setCargoViewV108(cargoDraftRefV108.current); setComparisonViewV107(comparisonDraftRefV107.current); setArchiveViewV106(archiveDraftRefV106.current); setActor(next); setPhase(clock); setYouthMotionV74(youthMotionRefV74.current); setDreadAngles(dreadMotionRef.current.angles); renderedAt = time; }
      } else {
        jumpWasPressed = false;
        if(!plaqueWritePausedRefV109.current&&(!active||suspendedRef.current||pausedRef.current||dialogStateRef.current&&!dialogStateRef.current.archivePlaqueV109||document.hidden)&&['working','return'].includes((archiveContinuationViewV111(continuationDraftRefV111.current)??plaqueDraftRefV109.current).receipt?.phase??''))interruptPlaqueV109();
        if(!cargoWritePausedRefV108.current&&(!active||suspendedRef.current||pausedRef.current||dialogStateRef.current&&!dialogStateRef.current.cargoV108||document.hidden)&&['working','return'].includes(cargoDraftRefV108.current.receipt?.phase??''))interruptCargoV108();
        if(!comparisonWritePausedRefV107.current&&(!active||suspendedRef.current||pausedRef.current||dialogStateRef.current&&!dialogStateRef.current.archiveComparisonV107||document.hidden)&&['search','carrying','compare','return'].includes(comparisonDraftRefV107.current.receipt?.phase??''))interruptComparisonV107();
        if(!archiveWritePausedRefV106.current&&(!active||suspendedRef.current||pausedRef.current||dialogStateRef.current&&!dialogStateRef.current.archiveV106||document.hidden)&&['working','return'].includes(archiveDraftRefV106.current.receipt?.phase??''))interruptArchiveV106();
        if(!cartographyWritePausedRefV104.current&&(!active||suspendedRef.current||pausedRef.current||dialogStateRef.current&&!dialogStateRef.current.cartographyV104||document.hidden)&&['walking','return'].includes(cartographyDraftRefV104.current.receipt?.phase??''))interruptCartographyV104();
        if(!transitRefV77.current&&!cartographyWritePausedRefV105.current&&(!active||suspendedRef.current||pausedRef.current||dialogStateRef.current&&!dialogStateRef.current.cartographyV104&&!dialogStateRef.current.cartographyObservationV105||document.hidden)&&['walking','observing','return'].includes(cartographyDraftRefV105.current.receipt?.phase??''))interruptCartographyV105();
      }
      request = requestAnimationFrame(frame);
    };
    request = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(request);
  }, [bindings, clearInputs, closeDialog, interact, persistVisit, recordLocationV77, onNotify, onRegionV68, updateLiftStationV83,sampleCartographyV104,interruptCartographyV104,sampleCartographyV105,interruptCartographyV105,recordCartographyTransitV105,cartographyWriteRefusedV105,sampleArchiveV106,interruptArchiveV106,sampleComparisonV107,interruptComparisonV107,sampleCargoV108,interruptCargoV108,samplePlaqueV109,interruptPlaqueV109]);

  const onWorldKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== viewportRef.current || blocked || event.altKey || event.ctrlKey || event.metaKey) return;
    const movement: ControlActionId[] = ["hunt.moveLeft", "hunt.moveRight", "hunt.moveUp", "hunt.moveDown", "hunt.aim"];
    if (movement.some(action => matchesControlAction(action, event.nativeEvent, bindings))) {
      event.preventDefault(); event.stopPropagation(); held.current.add(event.code);
    } else if (matchesControlAction("hunt.interact", event.nativeEvent, bindings)) {
      event.preventDefault(); event.stopPropagation(); if (!event.repeat) interact();
    }
  };

  const touchButton = (key: keyof typeof touch.current, label: string, glyph: string) => {
    const release = (event: PointerEvent<HTMLButtonElement>) => {
      touch.current[key] = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };
    return <button type="button" aria-label={label} disabled={blocked}
      onPointerDown={event => { event.preventDefault(); if (blocked) return; event.currentTarget.setPointerCapture(event.pointerId); touch.current[key] = true; }}
      onPointerUp={release} onPointerCancel={release} onLostPointerCapture={() => { touch.current[key] = false; }}
      onKeyDown={event => { if (event.code === "Space" || event.code === "Enter") { event.preventDefault(); touch.current[key] = true; } }}
      onKeyUp={event => { if (event.code === "Space" || event.code === "Enter") { event.preventDefault(); touch.current[key] = false; } }}
      onBlur={() => { touch.current[key] = false; }}>{glyph}</button>;
  };

  const dialogKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeDialog(); return; }
    if (event.key !== "Tab") return;
    const buttons = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled),summary") ?? [])].filter(choice=>!choice.getClientRects||choice.getClientRects().length>0);
    if (!buttons.length) { event.preventDefault(); return; }
    const first = buttons[0]; const last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
  };

  const chooseWitness = (choice: HomeworldWitnessChoice) => {
    const result = persistAction({ type: "choose-witness", choice });
    setDialog(current => current ? { ...current, message: result.message } : current);
  };

  const submitInquiry = useCallback((action: HomeworldInquiryAction) => {
    if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt) return;
    const point = dialogStateRef.current?.point;
    const nearby = pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current);
    // A stale dialog or remote call cannot submit a different NPC's evidence.
    if (!point?.npcId || nearby?.id !== point.id) return;
    const offered = homeworldInquiryDialogue(progressRef.current, point.npcId)?.options ?? [];
    if (!offered.some(option => JSON.stringify(option.action) === JSON.stringify(action))) return;
    clearInputs();
    const result = persistAction({ type: "counter-inquiry", action });
    setDialog(current => current ? { ...current, message: result.message } : current);
    requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }));
  }, [clearInputs, persistAction, save.createdAt]);

  const inquiryJournal = homeworldInquiryJournal(progress);
  // Revalidate the actual room and save owner at submission, then acknowledge the
  // durable write before displaying any narrative consequence.
  const submitNarrativeV66 = (kind: "side" | "npc", action: HomeworldSideStoryV66Action | NpcMissionActionV66) => {
    const point = dialogStateRef.current?.point;
    const nearby = pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current);
    if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || !point || nearby?.id !== point.id) {
      return { ok: false, message: "Rejoins ton interlocuteur avant de poursuivre cet échange." };
    }
    const current = saveRef.current;
    const eligible = !current.prologue || ["blooded", "elite", "elder", "ancient"].includes(getChronicleRank(current.prologue.chronicle) ?? "");
    const result = kind === "side"
      ? applyHomeworldSideStoryV66(progressRef.current.sideStoryV66, action as HomeworldSideStoryV66Action, { pointId: point.id, eligible })
      : applyNpcMissionsV66(progressRef.current.npcMissionsV66, action as NpcMissionActionV66, {
        autonomousHunter: eligible, interiorId: interiorRef.current?.buildingId ?? null, pointId: point.id, npcId: point.npcId ?? null, actor: actorRef.current,
      });
    let response = { ok: result.ok, message: result.message };
    if (result.ok && result.changed) {
      const next = { ...progressRef.current, [kind === "side" ? "sideStoryV66" : "npcMissionsV66"]: result.state } as HomeworldProgress;
      if (!onProgress(next)) response = { ok: false, message: "Écriture non confirmée. Aucun échange n’a été validé ; réessaie ici." };
    }
    clearInputs(); setAnnouncement(response.message); onNotify(response.message);
    setDialog(current => current ? { ...current, message: response.message } : current);
    return response;
  };
  const sideStoryJournalV66 = homeworldSideStoryV66Journal(progress.sideStoryV66, !youthWelcome);
  const submitContractV68 = (action: ContractActionV68) => {
    const point = dialogStateRef.current?.point, nearby = pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current);
    if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || !point?.npcId || nearby?.id !== point.id) return;
    clearInputs();
    const result = applyHomeworldContractV68(progressRef.current.contractsV68, action, { eligible: canVisitHomeworldVillagesV69(saveRef.current),
      interiorId: interiorRef.current?.buildingId ?? null, pointId: point.id, npcId: point.npcId, actor: actorRef.current });
    let message = result.message;
    if (result.changed) {
      const next = { ...progressRef.current, contractsV68: result.state };
      if (!onProgress(next)) message = "Le registre n’a pas été sauvegardé. Réessaie ici ; aucune remise n’a été annoncée.";
    }
    setAnnouncement(message); onNotify(message); setDialog(current => current ? { ...current, message } : current);
  };
  const selectedPoint = dialog?.point;
  const residentRenderContextV110={ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:save.createdAt,actor,levelId:levelIdV77,seconds:phase,interiorId,inTransit:!!transitV77||!!skiffV77,active:true,cargo:cargoViewV108};
  const selectedResidentV68 = homeworldResidentDialogueContactV110(dialog?.residentV110,residentRenderContextV110);
  const selectedResidentRoutineV84 = selectedResidentV68 ? homeworldCivilianRoutineV84(selectedResidentV68) : null;
  const selectedResidentPoseV84 = selectedResidentV68 ? homeworldResidentPoseV77(selectedResidentV68, phase) : null;
  const nearbyResidentV68 = !interior ? nearestHomeworldResidentContactV110(residentRenderContextV110) : null;
  const streetContextV100={actor,levelId:levelIdV77,seconds:phase,interiorId,inTransit:!!transitV77||!!skiffV77};
  const selectedStreetContactV100=dialog?.streetContactV100?.owner===save.createdAt
    ?homeworldStreetContactReachedV100(dialog.streetContactV100.id,streetContextV100):null;
  const nearbyStreetContactV100=!nearbyResidentV68&&!interior?nearestHomeworldStreetContactV100(streetContextV100):null;
  const plaqueRenderContextV109={ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:save.createdAt,actor,levelId:levelIdV77,visitedDistrictIds:progress.visitedDistrictIds,interiorId,inTransit:!!transitV77||!!skiffV77,active:true,artAvailable:motionAssetsV74.ready&&archivePlaqueArtAdmittedV109(),cargo:cargoViewV108};
  const nearbyPlaqueHostV109=archivePlaquePostReachedV109(plaqueRenderContextV109);
  const nearbyPlaqueActionV109=archivePlaqueNearbyV109(plaqueEffectiveViewV111,plaqueRenderContextV109);
  const cargoRenderContextV108={ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:save.createdAt,actor,levelId:levelIdV77,visitedDistrictIds:progress.visitedDistrictIds,interiorId,inTransit:!!transitV77||!!skiffV77,active:true};
  const nearbyCargoHostV108=cargoPostReachedV108(cargoRenderContextV108,cargoViewV108);
  const nearbyCargoActionV108=cargoNearbyV108(cargoViewV108,cargoRenderContextV108);
  const comparisonRenderContextV107={ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:save.createdAt,actor,levelId:levelIdV77,visitedDistrictIds:progress.visitedDistrictIds,interiorId,inTransit:!!transitV77||!!skiffV77,active:true,legacyArchive:progress.archiveV106};
  const nearbyComparisonHostV107=archiveComparisonPostReachedV107(comparisonRenderContextV107);
  const nearbyComparisonActionV107=archiveComparisonNearbyV107(comparisonViewV107,comparisonRenderContextV107);
  const comparisonTableV107=archiveComparisonTableReachedV107(comparisonRenderContextV107);
  const nearbyArchivistV106=archivePostReachedV106({ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:save.createdAt,actor,levelId:levelIdV77,visitedDistrictIds:progress.visitedDistrictIds,interiorId,inTransit:!!transitV77||!!skiffV77,active:true});
  const nearbyArchiveActionV106=archiveNearbyActionV106(archiveViewV106,{ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:save.createdAt,actor,levelId:levelIdV77,visitedDistrictIds:progress.visitedDistrictIds,interiorId,inTransit:!!transitV77||!!skiffV77,active:true});
  const nearbyCartographerV104=cartographyPostReachedV104({ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:save.createdAt,actor,levelId:levelIdV77,
    visitedDistrictIds:progress.visitedDistrictIds,interiorId,inTransit:!!transitV77||!!skiffV77,active:true});
  const cartographyDialogV104=dialog?.cartographyV104?.owner===save.createdAt&&nearbyCartographerV104;
  const highPointAvailableV105=cartographyHighPointReachedV105({ownerCreatedAt:save.createdAt,currentOwnerCreatedAt:save.createdAt,actor:{x:actor.x,y:actor.y},levelId:levelIdV77,
    visitedDistrictIds:progress.visitedDistrictIds,interiorId,inTransit:!!transitV77||!!skiffV77,active:!suspended&&!paused&&!inactive});
  const streetDialogueInvalidV100=!!dialog?.streetContactV100&&!selectedStreetContactV100;
  useEffect(()=>{
    if(!streetDialogueInvalidV100)return;
    const expected=dialog?.streetContactV100;
    const frame=requestAnimationFrame(()=>{
      if(dialogStateRef.current?.streetContactV100!==expected)return;
      dialogStateRef.current=null;setDialog(null);
      setAnnouncement('La conversation est interrompue : rejoins cet habitant sur son passage.');
      viewportRef.current?.focus({preventScroll:true});
    });
    return()=>cancelAnimationFrame(frame);
  },[streetDialogueInvalidV100,dialog?.streetContactV100]);
  const residentDialogueInvalidV110=!!dialog?.residentV110&&!selectedResidentV68;
  useEffect(()=>{
    if(!residentDialogueInvalidV110)return;
    const expected=dialog?.residentV110;
    const frame=requestAnimationFrame(()=>{
      if(dialogStateRef.current?.residentV110!==expected)return;
      dialogStateRef.current=null;setDialog(null);
      setAnnouncement('La conversation est interrompue : rejoins cet habitant sur son passage.');
      viewportRef.current?.focus({preventScroll:true});
    });
    return()=>cancelAnimationFrame(frame);
  },[residentDialogueInvalidV110,dialog?.residentV110]);
  const expectedResidentDialogueV110=dialog?.residentV110;
  const requestResidentLandmarkV110=(id:string)=>{
    if(dialogStateRef.current?.residentV110!==expectedResidentDialogueV110)return;
    requestHomeworldResidentLandmarkV110(expectedResidentDialogueV110,id,residentContextV110(),progressRef.current,requestLandmarkV75);
  };
  const requestStreetLandmarkV100=(id:string)=>{
    const current=dialogStateRef.current?.streetContactV100;
    if(!current||current.owner!==saveRef.current.createdAt||suspendedRef.current||pausedRef.current||inactive||!motionAssetsV74.ready)return;
    const contact=homeworldStreetContactReachedV100(current.id,{actor:actorRef.current,levelId:levelRefV77.current,seconds:cityClockV68.current,interiorId:interiorRef.current?.buildingId,inTransit:!!transitRefV77.current||!!skiffRefV77.current});
    if(!contact||!homeworldStreetPlacesV100(contact,progressRef.current).some(place=>place.id===id))return;
    requestLandmarkV75(id);
  };
  const selectedNpc = HOMEWORLD_NPCS.find(npc => npc.id === selectedPoint?.npcId);
  const inquiryDialogue = homeworldInquiryDialogue(progress, selectedPoint?.npcId);
  const selectedRegion = HOMEWORLD_REGIONS.find(region => region.id === selectedPoint?.regionId);
  const canChoose = progress.evidenceIds.length === HOMEWORLD_EVIDENCE.length && !progress.witnessChoice;
  const youthChiefMet = progress.greetedNpcIds.includes("hunt-king");
  const youthMentorMet = progress.greetedNpcIds.includes("terrace-instructor");
  const youthObjective = !youthChiefMet ? "Rejoins le chef du clan à la Citadelle, au nord-est de la cité, et parle-lui."
    : !youthMentorMet ? "Rejoins l’instructeur des terrasses, au centre de la cité, et parle-lui."
    : save.soloV90?.status === "completed" ? "La préparation de triade est rapportée. Le clan conserve les observations et les blessures de cet entraînement ; l’épreuve Quatza-Rij et le rite Blooded restent à accomplir."
    : save.soloV70?.status === "completed" ? "Le premier acte du Temple des Trois Ombres est rapporté. Rejoins le maître pour une préparation de triade au combat de seuil ; elle ne remplace pas l’épreuve Quatza-Rij ni le rite Blooded."
    : save.soloV69?.status === "completed" ? "Les Seuils du Premier Sang sont attestés. Rejoins le maître pour ouvrir le premier acte du Temple des Trois Ombres avec ta triade. Les villages et leurs contrats restent accessibles ; tu es encore Young Blood."
    : save.soloV68?.status === "completed" ? "Le clan a reconnu ta cohorte Young Blood. Rejoins le maître pour préparer Les Seuils du Premier Sang ; le rite Blooded reste distinct."
    : save.soloV67?.status === "completed" ? "La Piste sans guide est rapportée. Rejoins le maître pour rassembler la Cohorte des Aspirants."
    : save.soloV66?.status === "completed" ? "Les Premières Pistes sont rapportées. Rejoins le maître pour La Piste sans guide ; les villages ordinaires et leurs relevés sont aussi accessibles."
    : youthCampaignObjective(save.youthTraining);
  const youthProgressTitle = save.soloV90?.status === "completed" ? "Young Blood · Préparation de triade rapportée"
    : save.soloV70?.status === "completed" ? "Young Blood · Temple, acte I rapporté"
    : save.soloV69?.status === "completed" ? "Young Blood · Seuils maîtrisés"
    : save.soloV68?.status === "completed" ? "Young Blood · Cohorte reconnue"
    : save.soloV67?.status === "completed" ? "Unblooded · Piste rapportée"
    : save.soloV66?.status === "completed" ? "Unblooded · Premières Pistes accomplies"
    : save.youthTraining?.status === "completed" ? "Formation accomplie · Premier réveil"
    : "Apprentissage Unblooded · Auprès du clan";
  const youthGreeting: Record<string, string> = {
    "hunt-king": `${save.profile.hunterName}, ton arrivée a été annoncée. La force seule ne suffit pas à servir le clan. Observe, écoute, puis rends-toi auprès de l’instructeur des terrasses. Ton apprentissage commence.`,
    "terrace-instructor": save.soloV68?.status === "completed" ? "Tu as rapporté la piste et ramené tes compagnons. Cette reconnaissance Young Blood appartient à ton parcours. Elle ne remplace pas la chasse de Premier Sang ; garde ta maîtrise et écoute les récits de la gardienne." : save.youthTraining?.status === "completed" ? "Les gestes, le parcours et le duel sont accomplis. Garde la maîtrise que tu as apprise. Nous pouvons reprendre les sorties du clan. Observe le terrain, franchis les roches et reviens avec le groupe." : youthChiefMet ? "Le chef t’a accueilli. Avant de chasser, tu apprendras à te placer, à retenir un coup et à reconnaître une proie digne. Entre dans le dojo et exécute mes démonstrations. Ta première lame se mérite par les gestes ; l’armurerie et les épreuves du camp suivront." : "Présente-toi d’abord au chef du clan, dans la Citadelle au nord-est. Reviens me voir après cet accueil : nous parlerons de ta formation.",
    "dock-officer": "Ces appareils appartiennent au clan. Ta route commence dans la cité : le chef t’attend à la Citadelle, au nord-est.",
    "market-artisan": save.youthTraining?.equipment.biomask ? "Ton premier biomask est conservé pour la sortie. Le lien porte la teinte choisie ; les exercices du clan se font encore à visage découvert." : "Ton premier équipement viendra avec la formation. Observe les outils ; ils ne deviennent pas tiens par une simple visite.",
    "forge-artisan": "Une parure ne remplace pas l’apprentissage. Les commandes attendront les étapes de ta formation.",
    "clan-healer": "L’accueil vient d’abord. Pour l’instant, observe les lieux de soin du clan ; aucune infirmerie de vaisseau ne t’est attribuée.",
    "undercity-witness": "Les galeries relient les quartiers du clan. Prends le temps d’écouter leurs habitants avant de te croire prêt à chasser.",
    "memory-keeper": "Ici reposent les récits du clan. Les lire ne t’en attribue pas les exploits ; ta propre histoire commence seulement.",
    "enforcer-captain": "Les règles du clan s’apprennent avec la maîtrise. Le chef et l’instructeur guideront tes premiers pas.",
    "rite-keeper": "La nurserie est derrière toi. Aucun autre rite ne sera reconnu avant les épreuves qui lui appartiennent.",
    "arena-steward": "Le temps des arènes viendra après ta formation. Présente-toi d’abord au chef, puis à l’instructeur.",
  };
  const youthServiceLocked = youthWelcome && !!selectedPoint?.service && ["armory", "customization", "training", "medbay", "pit"].includes(selectedPoint.service);
  const title = dialog?.recoveryV111 ? 'Restaurer un point extérieur conservé' : dialog?.archivePlaqueV109 ? HOMEWORLD_ARCHIVE_PLAQUE_V109.npcName : dialog?.cargoV108 ? 'Intendante · lots et passage du quai' : dialog?.archiveComparisonV107 ? dialog.archiveComparisonV107.at==='table'?'Comparaison · objet C et contexte':'Archiviste · étude située' : dialog?.archiveV106 ? HOMEWORLD_ARCHIVE_V106.npcName : dialog?.cartographyObservationV105 ? 'Relevé depuis le point haut' : dialog?.cartographyV104 ? HOMEWORLD_CARTOGRAPHY_V104.npcName : dialog?.cntlipSiteId ? 'C’ntlip · réception originale du clan' : dialog?.navigation ? "Navigation de la cité" : selectedStreetContactV100?.role ?? selectedResidentV68?.role ?? (youthWelcome && selectedNpc?.id === "hunt-king" ? "Accueil du chef du clan" : youthWelcome && selectedPoint?.kind === "ship" ? "Quais du clan" : selectedNpc?.name ?? selectedPoint?.label ?? "La Couronne de Cendres");
  const heroPlate = youthWelcome ? HOMEWORLD_YOUTH_PLATE_V69 : homeworldHeroPlate(save.appearance.presetId);
  const actorSpeed = Math.hypot(actor.vx, actor.vy);
  const youthSpeedV74 = Math.hypot(youthMotionV74.velocity.x, youthMotionV74.velocity.y);
  const heroBob = !youthWelcome && actorSpeed > 5 ? Math.sin(phase * 11) * 1.5 : 0;
  const activeDoorId = nearestDoor?.id ?? null;
  const civicNeighborhoodV80=homeworldCivicNeighborhoodV80(levelIdV77,actor);
  const nearbyConnectorV77 = !interior ? nearestHomeworldConnectorV77(levelIdV77, actor) : null;
  const nearbyCntlipHostV77=homeworldCntlipEligibleV77(save)?homeworldCntlipReachedV77(interior,actor):null;
  const connectorLabelV83 = nearbyConnectorV77?.connector.kind === 'lift'
    ? homeworldLiftAtSocketV83(liftStateV83, nearbyConnectorV77.connector.id, nearbyConnectorV77.reverse)
      ? 'Embarquer · Ascenseur des délégations'
      : liftStateV83.journey ? 'Cabine en déplacement · Ascenseur des délégations' : 'Appeler la cabine · Ascenseur des délégations'
    : nearbyConnectorV77?.connector.name;
  const interactionLabel = nearbyPlaqueActionV109?nearbyPlaqueActionV109.label:nearbyPlaqueHostV109?'Archiviste · plaque K-17':nearbyCargoActionV108?nearbyCargoActionV108.label:nearbyCargoHostV108?'Intendante · répartir les lots':nearbyComparisonActionV107?nearbyComparisonActionV107.label:nearbyComparisonHostV107?'Archiviste · preuve située':nearbyArchiveActionV106?nearbyArchiveActionV106.label:nearbyArchivistV106?'Archiviste · dossiers séparés':nearbyConnectorV77 ? connectorLabelV83 : indoorTarget?.kind === "exit" ? "Sortir vers la cité" : highPointAvailableV105&&progress.cartographyV105?.receipt?.phase==='observing'?'Comparer les repères du viaduc':nearbyCntlipHostV77?`Halte · ${nearbyCntlipHostV77.name}` : nearbyCartographerV104?'Cartographe · liaison du port':nearestDoor ? `Entrer · ${nearestDoor.label}` : nearest?.label ?? (nearbyResidentV68 ? `Parler · ${nearbyResidentV68.role}` : nearbyStreetContactV100?`Parler · ${nearbyStreetContactV100.role}`:null);
  const heroPlacement = !youthWelcome && heroPlate.status === "custom-modular-body"
    ? homeworldModularPlacementV64(save.appearance.bodyMorphId, save.appearance.headStyleId)
    : homeworldPortraitPlacementV64(heroPlate.plateId, heroPlate.src, youthWelcome ? HOMEWORLD_YOUTH_PLATE_V69.physicalHeight : 100);

  const archivistPausedV111=cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready;
  const archivistSequenceV111=save.createdAt+':'+(continuationViewV111.receipt?.lineIds.at(-1)??plaqueEffectiveViewV111.receipt?.lineIds.at(-1)??'')+':'+(continuationViewV111.receipt?.phase??plaqueEffectiveViewV111.receipt?.phase??'')+':'+String(continuationViewV111.receipt?.ownerConsent??plaqueEffectiveViewV111.receipt?.ownerConsent);

  return <section ref={rootRef} className={styles.hub} style={suspended ? { display: "none" } : undefined}
    aria-label="Homeworld — Cité des Premiers Trophées" data-homeworld-hub="true" data-homeworld-motion-ready={motionAssetsV74.ready} data-homeworld-interior-id={interior?.buildingId} data-homeworld-level-v77={levelIdV77} data-homeworld-elevation-v77={elevationV77.toFixed(3)} data-homeworld-transit-v77={transitV77?.connectorId} data-homeworld-skiff-v77={skiffV77?.regionId} data-homeworld-lift-position-v83={liftStateV83.position.toFixed(4)} data-homeworld-lift-motion-v83={liftStateV83.journey?.kind ?? 'docked'}>
    <header className={styles.header}>
      <div><div className={styles.eyebrow}>Yautja Prime · {interior ? "Intérieur parcourable" : "Monde natal"}</div><h2>{interior?.title ?? "La Cité des Premiers Trophées"}</h2><p>{interior?.description ?? (youthWelcome ? "Ton parcours Unblooded : accueil du clan, dojo, premier équipement et camp. Aucun vaisseau personnel avant le rite Blooded." : "Une cité de clans et de serments. Ton vaisseau reste ta demeure.")}</p></div>
      <div className={styles.hudActionsV64}><button type="button" disabled={cargoMigrationPendingV108 || suspended || paused || inactive || !!dialog || spatialCodexOpen || wayfindingOpenV75 || !motionAssetsV74.ready} onClick={() => changeWayfindingOpenV75(true)}>Repères</button>
      <button type="button" disabled={cargoMigrationPendingV108 || wayfindingOpenV75 || spatialCodexOpen} onClick={() => { clearInputs(); setDialog({ point: null, navigation: true }); }}>Navigation</button>
      <button type="button" disabled={cargoMigrationPendingV108 || wayfindingOpenV75 || spatialCodexOpen} onClick={() => { clearInputs(); if (!paused && !transitRefV77.current) recordLocationV77(); setPaused(value => !value); if (paused) requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true })); }}>{paused ? "Reprendre" : "Pause"}</button><button type="button" disabled={cargoMigrationPendingV108 || suspended || !!transitV77} onClick={recordLocationV77}>Enregistrer la position</button></div>
    </header>
    {upgradeRecoveryPendingV112&&<HomeworldUpgradeRecoveryV112 plan={upgradeRecoveryPlanV112} message={upgradeRecoveryMessageV112} writeRefused={upgradeRecoveryWriteRefusedV112} disabled={suspended||paused||inactive||!motionAssetsV74.ready} onPrepare={prepareUpgradeRecoveryV112} onConfirm={confirmUpgradeRecoveryV112} onCancel={()=>{setUpgradeRecoveryPlanV112(null);setUpgradeRecoveryWriteRefusedV112(false);setUpgradeRecoveryMessageV112('Restauration non confirmée. Le point de sauvegarde et les documents d’origine restent conservés ; la partie reste en pause.');}}/>}
    <div ref={viewportRef} className={styles.viewport} tabIndex={0} role="group" aria-label={interior ? `Intérieur parcourable · ${interior.title}` : "Cité jouable en perspective 2.5D"} aria-describedby="homeworld-controls" data-homeworld-viewport="true" data-homeworld-space={interior ? "interior" : "city"} data-city-seconds={phase.toFixed(2)}
      data-homeworld-active-door={activeDoorId ?? undefined}
      onKeyDown={onWorldKey} onBlur={clearInputs} onPointerDown={event => { if (event.target === event.currentTarget || event.target instanceof HTMLElement && !event.target.closest("button,[data-homeworld-spatial-codex]")) viewportRef.current?.focus({ preventScroll: true }); }}>
      <HomeworldWorldMapV77 save={save} actor={actor} interiorId={interiorId} levelId={levelIdV77} open={spatialCodexOpen} targetId={wayfindingRequestV75?.id} targetNonce={wayfindingRequestV75?.nonce}
        interactionShortcut={controlActionShortcut('hunt.interact', bindings)}
        routeSuspended={cargoMigrationPendingV108 || suspended || paused || inactive || !!dialog || !!transitV77 || !!skiffV77 || !motionAssetsV74.ready}
        disabled={cargoMigrationPendingV108 || suspended || paused || inactive || !!dialog || !!transitV77 || !motionAssetsV74.ready}
        onOpenChange={open => { clearInputs(); spatialCodexOpenRef.current = open; pausedRef.current = paused || inactive || open || !motionAssetsV74.ready; setSpatialCodexOpen(open);
          if (!open) requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true })); }} />
      {!interior && <div className={styles.sky} aria-hidden="true" />}
      <div className={styles.world} aria-hidden="true" data-homeworld-camera-mode={camera.mode} data-homeworld-camera-zoom={zoom.toFixed(3)} style={{ pointerEvents: 'none', width: sceneWidth, height: sceneDepth * HOMEWORLD_GEOMETRY_V64.depthScale, transform: `translate(${-cameraX * zoom}px,${-cameraY * zoom}px) scale(${zoom})` }}>
        {interior ? <HomeworldInteriorSurface room={interior} actorPosition={actor} activePointId={nearest?.id ?? null} trophies={save.trophies} />
          : <HomeworldWorldSceneV77 archivistActiveV111={!!dialog?.archivePlaqueV109&&dialog.archivePlaqueV109.owner===save.createdAt&&nearbyPlaqueHostV109} archivistPausedV111={archivistPausedV111} archivistSequenceV111={archivistSequenceV111} archivePlaqueV109={progress.visitedDistrictIds.includes('port')&&motionAssetsV74.ready?plaqueEffectiveViewV111:undefined} cargoV108={cargoViewV108} comparisonV107={comparisonViewV107} archiveV106={archiveViewV106} archiveActiveV106={nearbyArchivistV106} actor={actor} levelId={levelIdV77} camera={camera} seconds={phase} activeDoorId={activeDoorId} activePointId={nearest?.id ?? null} activeCartographyV104={nearbyCartographerV104} cartographyHighPointV105={cartographyActiveV105(progress.cartographyV105)} activeStreetContactV100={!nearbyConnectorV77&&!nearestDoor&&!nearest&&!nearbyCntlipHostV77&&!nearbyCartographerV104?nearbyStreetContactV100?.id:null} youthWelcome={youthWelcome} skiffActive={!!skiffV77} reducedMotion={reducedMotionV77} transit={transitV77} liftStateV83={liftSessionOwnerV83 === save.createdAt ? liftStateV83 : null} />}
        <div className={styles.hero} data-homeworld-actor="true" data-homeworld-depth-layer-v81="1" data-homeworld-level-v77={levelIdV77} data-homeworld-elevation-v77={elevationV77.toFixed(3)} data-x={Math.round(actor.x)} data-y={Math.round(actor.y)} data-moving={(youthWelcome ? youthSpeedV74 : actorSpeed) > 5} data-homeworld-running-v81={!blocked && Math.hypot(actor.vx / HOMEWORLD_ACTOR.walkSpeed, actor.vy / HOMEWORLD_ACTOR.depthSpeed) > 1.01} data-facing={actor.facing} data-youth-distance-v74={youthWelcome ? youthMotionV74.distanceWorld.toFixed(3) : undefined} style={{ transform: `translate(${projectedActor.x}px,${projectedActor.y + heroBob}px)`, zIndex: interior ? Math.round(actor.y) : homeworldSceneDepthV78(actor.y,elevationV77) }}>
          <span className={styles.heroVisual} style={youthWelcome ? { transform: "none" } : undefined}>
          {youthWelcome ? (motionAssetsV74.ready ? <HomeworldYouthMotionV74 seconds={phase} moving={youthSpeedV74 > 5} velocity={youthMotionV74.velocity} lastDirection={youthMotionV74.direction} distanceWorld={youthMotionV74.distanceWorld} height={HOMEWORLD_YOUTH_PLATE_V69.physicalHeight} /> : <HomeworldYouthMotionV72 seconds={0} moving={false} facing={actor.facing} height={HOMEWORLD_YOUTH_PLATE_V69.physicalHeight} />) : heroPlate.status === "custom-modular-body" ? <HomeworldModularHunter className={styles.heroPlate}
            style={heroPlacement ? { inset: "auto", ...heroPlacement } : undefined} morphId={save.appearance.bodyMorphId} dreadStyleId={save.appearance.dreadStyleId} appearance={save.appearance} dreadAngles={dreadAngles}
            showArmor armorId={save.loadout.armorId} hasWristblades={save.loadout.weaponIds.includes("wristblades")} /> : <img
            className={styles.heroPlate}
            style={heroPlacement ? { inset: "auto", ...heroPlacement } : undefined}
            src={heroPlate.src}
            alt=""
            draggable={false}
            data-whole-character-plate="true"
            data-exact-preset={heroPlate.exactPreset}
            data-plate-id={heroPlate.plateId}
            data-asset-status={heroPlate.status}
            data-provenance-status={heroPlate.provenanceStatus}
          />}
          </span>
          <i className={styles.heroMark} />
        </div>
      </div>
      {!interior && <div className={styles.haze} aria-hidden="true" />}
      <div className={styles.location} data-homeworld-neighborhood-v80={interior?undefined:civicNeighborhoodV80.id}><strong>{levelIdV77} · {interior?district?.name??homeworldLevelV77(levelIdV77).name:civicNeighborhoodV80.label}</strong><span>{interior ? "Rejoins le seuil au sud pour ressortir. Les personnages et objets se rencontrent à pied." : youthWelcome && district?.id === "port" ? "Les convois et les navettes du clan animent les quais." : youthWelcome && district?.id === "forges" ? "Les artisans préparent les armes et les parures du clan." : civicNeighborhoodV80.detail}</span></div>
      {!interior && <div className={styles.minimap} role="img" aria-label={`Plan de la cité : ${progress.visitedDistrictIds.length} quartiers visités sur ${HOMEWORLD_DISTRICTS.length}. Position : ${district?.name ?? "liaison"}.`}>
        {HOMEWORLD_DISTRICTS_V77.filter(entry => entry.levelId === levelIdV77).map(entry => <i key={entry.id} className={styles.mapDistrict} data-visited={progress.visitedDistrictIds.includes(entry.id)} style={{ left: `${entry.x / HOMEWORLD_WORLD_V77.width * 100}%`, top: `${entry.y / HOMEWORLD_WORLD_V77.height * 100}%`, width: `${entry.width / HOMEWORLD_WORLD_V77.width * 100}%`, height: `${entry.height / HOMEWORLD_WORLD_V77.height * 100}%` }} />)}
        <i className={styles.mapActor} style={{ left: `${actor.x / HOMEWORLD_WORLD_V77.width * 100}%`, top: `${actor.y / HOMEWORLD_WORLD_V77.height * 100}%` }} />
      </div>}
      {interactionLabel && !blocked && <button className={styles.prompt} type="button" onClick={interact} data-homeworld-door-id={nearestDoor?.id} data-homeworld-interior-target={indoorTarget?.kind}><kbd>{controlActionShortcut("hunt.interact", bindings)} / A</kbd>{youthWelcome && nearest?.kind === "ship" && !nearestDoor ? "Quais du clan" : interactionLabel}</button>}
      {cntlipV77.effects.peripheralOpacity>0&&<div aria-hidden="true" data-cntlip-sensory-v77={cntlipV77.ledger.state.activeDoses}
        style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:4,opacity:cntlipV77.effects.peripheralOpacity,background:'radial-gradient(ellipse at center,transparent 38%,#96714b 100%)'}}/>}
      {!motionAssetsV74.ready && <div className={styles.pause} data-homeworld-motion-loading-v74 role={motionAssetsV74.error ? "alert" : "status"} aria-live="polite">
        <strong>{motionAssetsV74.error ? "Sprites indisponibles" : "Préparation de la cité"}</strong>
        <span>{motionAssetsV74.error ?? `Animations : ${motionAssetsV74.loaded} / ${motionAssetsV74.total}`}</span>
        {motionAssetsV74.error && <button type="button" onClick={motionAssetsV74.retry}>Réessayer les animations</button>}
      </div>}
      {motionAssetsV74.ready && (paused || inactive || suspended) && !dialog && <div className={styles.pause}><strong>{suspended ? "Cité suspendue" : "Exploration en pause"}</strong>{!suspended && <button type="button" onClick={() => { setPaused(false); setInactive(false); viewportRef.current?.focus({ preventScroll: true }); }}>Reprendre l’exploration</button>}</div>}
    </div>
    <div className={styles.touch} aria-label="Commandes tactiles">
      <div className={styles.touchGroup}>{touchButton("left", "Marcher à gauche", "←")}{touchButton("right", "Marcher à droite", "→")}</div>
      <button type="button" className={sprintStylesV81.run} data-homeworld-run-toggle-v81
        aria-label="Course dans la cité" aria-pressed={touchRunningV81} disabled={blocked}
        title={`Course : maintenir ${controlActionShortcut("hunt.aim", bindings)} ou L3. Sur écran tactile : activer Course, puis une direction.`}
        onPointerDown={event => event.preventDefault()}
        onClick={() => { if (blocked) return; const running = !touch.current.sprint; touch.current.sprint = running; setTouchRunningV81(running); }}>Course {touchRunningV81 ? "●" : "○"}</button>
      <div className={styles.touchGroup}>{touchButton("up", "Marcher vers le fond", "↑")}{touchButton("down", "Marcher vers l’avant", "↓")}<button type="button" aria-label="Interagir avec le point proche" disabled={blocked || !interactionLabel} onClick={interact}>◉</button></div>
    </div>
    {youthWelcome && <section className={styles.youthHudV64} aria-label="Objectif d’accueil Unblooded" data-unblooded-objective={!youthChiefMet ? "chief" : !youthMentorMet ? "mentor" : save.youthTraining?.checkpoint.phase === "cage-complete" ? "cage-returned" : save.youthTraining?.checkpoint.phase.startsWith("cage-") ? "cage-active" : save.youthTraining?.checkpoint.phase === "patrol-complete" ? "patrol-returned" : save.youthTraining?.checkpoint.phase.startsWith("patrol-") ? "patrol-active" : save.youthTraining?.checkpoint.phase === "desert-complete" ? "desert-returned" : save.youthTraining?.status === "completed" ? "desert-ready" : "training"}>
      <strong>{save.soloV68?.status === "completed" ? "Young Blood" : "Accueil du clan"}</strong><p>{youthObjective}</p>
    </section>}
    <footer className={styles.footer}><div className={styles.progress}><strong>{youthWelcome ? youthProgressTitle : inquiryJournal.step === "complete" ? "Contre-enquête remise à la cité" : inquiryJournal.step !== "locked" ? "Contre-enquête du convoi · " + inquiryJournal.completed + "/5" : progress.audienceOutcome ? "Première audience accomplie" : "Dossier introductif · Le trophée contesté"}</strong><span>{progress.visitedDistrictIds.length}/{HOMEWORLD_DISTRICTS.length} quartiers · {!youthWelcome && <>{progress.evidenceIds.length}/{HOMEWORLD_EVIDENCE.length} preuves · </>}{progress.greetedNpcIds.length} rencontres · {save.profile.clanMarks} marques{progress.expeditions["ash-marches"] ? " · Convoi retrouvé" : ""}{progress.expeditions["glass-desert"] ? " · Détournement documenté" : ""}</span></div>
      <button type="button" disabled={cargoMigrationPendingV108} onClick={() => { clearInputs(); setDialog({ point: null }); }}>{youthWelcome ? "Journal de l’accueil" : "Journal de la cité"}</button>
    </footer>
    {!youthWelcome && inquiryJournal.step !== "locked" && <div className={styles.help} data-homeworld-inquiry-step={inquiryJournal.step}><strong>{inquiryJournal.label}</strong> · {inquiryJournal.objective}</div>}
    {pendingVisitCount > 0 && <div className={styles.notice} role="status">
      <p>{pendingVisitCount} {pendingVisitCount === 1 ? "visite de quartier non enregistrée" : "visites de quartiers non enregistrées"}. Ces visites restent en attente tant que la cité reste ouverte.</p>
      <button type="button" className="ghost-button small" disabled={suspended} onClick={retryPendingVisits}>Réessayer l’enregistrement des visites</button>
    </div>}
    <div id="homeworld-controls" className={styles.srOnly}>Clique dans la cité pour jouer. Marche libre <kbd>{controlActionShortcut("hunt.moveLeft", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveRight", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveUp", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveDown", bindings)}</kbd> · Course en maintenant <kbd>{controlActionShortcut("hunt.aim", bindings)}</kbd> · Interaction <kbd>{controlActionShortcut("hunt.interact", bindings)}</kbd>. Manette : stick / croix, maintenir L3 pour courir, A interaction, B fermer. Sur écran tactile, active Course puis une direction ; désactive Course pour marcher. Les services publics sont reliés au sol : aucun saut ni ascenseur obligatoire. {youthWelcome ? "Présente-toi au chef puis au mentor. Son dialogue ouvre les exercices du dojo, l’armurerie et le camp. Après le premier repos, reviens auprès du maître pour la reconnaissance accompagnée du désert." : "Les dix routes rejoignent des villages de clan. Reçois les contrats à l’armurerie du marché et auprès des commanditaires ; consigne les preuves sur le terrain avant de les remettre."}</div>
    <div className={styles.srOnly} aria-live="polite" aria-atomic="true">{announcement}</div>
    {cargoMigrationMessageV108&&<aside className={cargoStylesV108.migration} role={cargoMigrationPendingV108?'alert':'status'} data-cargo-arrival-recovery-v108><strong>Reprise du point d’arrivée</strong><p>{cargoMigrationMessageV108}</p>{cargoMigrationPendingV108&&<button onClick={()=>{viewportRef.current?.focus({preventScroll:true});commitCargoArrivalV108();}}>Réessayer la reprise du point d’arrivée</button>}</aside>}
    {!upgradeRecoveryPendingV112&&<>
    {!dialog&&deferredPlaqueV111&&<HomeworldArchiveContinuationJournalV111 ledger={continuationViewV111} base={plaqueViewV109} actor={actor} actorInStudySpace={levelIdV77==='0'&&!interiorId&&!transitV77&&!skiffV77} blocked={cargoMigrationPendingV108||suspended||paused||inactive||spatialCodexOpen||wayfindingOpenV75||!motionAssetsV74.ready} writePaused={plaqueWritePausedV109} message={plaqueMessageV109} onAction={actContinuationFromWorldV111} onRetry={retryPlaqueV109} onGuide={requestLandmarkV75}/>}
    {!dialog&&!deferredPlaqueV111&&<HomeworldArchivePlaqueJournalV109 ledger={plaqueViewV109} actor={actor} actorInStudySpace={levelIdV77==='0'&&!interiorId&&!transitV77&&!skiffV77} blocked={cargoMigrationPendingV108||suspended||paused||inactive||spatialCodexOpen||wayfindingOpenV75||!motionAssetsV74.ready} writePaused={plaqueWritePausedV109} message={plaqueMessageV109} onAction={actPlaqueFromWorldV109} onRetry={retryPlaqueV109} onGuide={requestLandmarkV75}/>}
    {!dialog&&<HomeworldCargoJournalV108 ledger={cargoViewV108} actor={actor} blocked={cargoMigrationPendingV108||suspended||paused||inactive||spatialCodexOpen||wayfindingOpenV75||!motionAssetsV74.ready} message={cargoMessageV108} writePaused={cargoWritePausedV108} onAction={actCargoFromWorldV108} onRetry={retryCargoV108}/>}
    {!dialog&&<HomeworldArchiveComparisonJournalV107 ledger={comparisonViewV107} actor={actor} blocked={cargoMigrationPendingV108||suspended||paused||inactive||spatialCodexOpen||wayfindingOpenV75||!motionAssetsV74.ready} message={comparisonMessageV107} writePaused={comparisonWritePausedV107} onAction={actComparisonFromWorldV107} onRetry={retryComparisonV107} onGuide={requestLandmarkV75}/>}
    {!dialog&&<HomeworldArchiveJournalV106 ledger={archiveViewV106} actor={actor} blocked={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready} message={archiveMessageV106} writePaused={archiveWritePausedV106} onAction={actArchiveFromWorldV106} onRetry={retryArchiveV106}/>}
    {!dialog&&<HomeworldCartographyJournalV104 ledger={progress.cartographyV104} blocked={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready||cartographyWritePausedV104} message={cartographyMessageV104} writePaused={cartographyWritePausedV104}
      onRetry={retryCartographyV104} onResume={()=>{if(submitCartographyV104('resume',cartographyDraftRefV104.current.revision))requestAnimationFrame(()=>viewportRef.current?.focus({preventScroll:true}));}}/>}
    {!dialog&&<HomeworldCartographyJournalV105 ledger={progress.cartographyV105} blocked={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready||cartographyWritePausedV105} message={cartographyMessageV105} writePaused={cartographyWritePausedV105}
      canObserve={highPointAvailableV105} onObserve={openObservationV105} onRetry={retryCartographyV105}
      onResume={()=>{viewportRef.current?.focus({preventScroll:true});if(submitCartographyV105('resume',cartographyDraftRefV105.current.revision))requestAnimationFrame(()=>viewportRef.current?.focus({preventScroll:true}));}}/>}
    </>}
    {dialog && <div className={styles.backdrop}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="homeworld-dialog-title" tabIndex={-1} onKeyDown={dialogKey}>
        <div className={styles.eyebrow}>{selectedNpc?.role ?? (selectedPoint?.kind === "region" ? selectedRegion?.status === "playable-introduction" ? selectedRegion.name + " · enquête régionale" : "Route vers le village de clan" : "La Couronne de Cendres")}</div>
        <h3 id="homeworld-dialog-title">{title}</h3>
        {dialog.recoveryV111 ? dialog.recoveryV111.owner===save.createdAt ? <HomeworldArrivalRecoveryV111 plan={recoveryPlanV111} message={recoveryMessageV111} writeRefused={recoveryWriteRefusedV111} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready} onPrepare={prepareRecoveryV111} onConfirm={confirmRecoveryV111} onClose={closeDialog}/> : <><p>Cette restauration appartient à une autre partie.</p><button onClick={closeDialog}>Revenir à la cité</button></>
        : dialog.archivePlaqueV109 ? dialog.archivePlaqueV109.owner===save.createdAt&&nearbyPlaqueHostV109 ? <><HomeworldArchivistPortraitV111 active={true} paused={archivistPausedV111} reducedMotion={reducedMotionV77} sequenceKey={archivistSequenceV111}/>{deferredPlaqueV111?<HomeworldArchiveContinuationV111 ledger={continuationViewV111} base={plaqueViewV109} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready||plaqueWritePausedV109} message={plaqueMessageV109} onAction={submitContinuationV111} onClose={closeDialog}/>: <HomeworldArchivePlaqueV111 ledger={plaqueViewV109} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready||plaqueWritePausedV109} message={plaqueMessageV109} onAction={submitPlaqueV109} onClose={closeDialog}/>}</> : <><p>Rejoins le poste K-17 pour cet échange.</p><button onClick={closeDialog}>Revenir au quai</button></>
        : dialog.cargoV108 ? dialog.cargoV108.owner===save.createdAt&&nearbyCargoHostV108 ? <HomeworldCargoV108 ledger={cargoViewV108} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready||cargoWritePausedV108} message={cargoMessageV108} onAction={submitCargoV108} onClose={closeDialog} reducedMotion={reducedMotionV77}/> : <><p>Rejoins l’intendante au poste de manutention.</p><button onClick={closeDialog}>Revenir au quai</button></>
        : dialog.archiveComparisonV107 ? dialog.archiveComparisonV107.owner===save.createdAt&&(dialog.archiveComparisonV107.at==='table'?comparisonTableV107:nearbyComparisonHostV107) ? <HomeworldArchiveComparisonV107 ledger={comparisonViewV107} mode={dialog.archiveComparisonV107.at} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready||comparisonWritePausedV107} message={comparisonMessageV107} onAction={submitComparisonV107} onClose={closeDialog} reducedMotion={reducedMotionV77} onLegacy={()=>{const next={point:null,archiveV106:{owner:save.createdAt}};dialogStateRef.current=next;setDialog(next);dialogRef.current?.focus({preventScroll:true});}}/> : <><p>Rejoins l’archiviste ou le pupitre de comparaison.</p><button onClick={closeDialog}>Revenir au quai</button></>
        : dialog.archiveV106 ? dialog.archiveV106.owner===save.createdAt&&nearbyArchivistV106 ? <HomeworldArchiveV106 ledger={archiveViewV106} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready||archiveWritePausedV106} message={archiveMessageV106} onAction={submitArchiveV106} onClose={closeDialog} reducedMotion={reducedMotionV77}/> : <><p>Rejoins l’archiviste au quai oriental.</p><button onClick={closeDialog}>Revenir au quai</button></>
        : dialog.cartographyObservationV105 ? dialog.cartographyObservationV105.owner===save.createdAt&&highPointAvailableV105 ? <HomeworldCartographyObservationV105 ledger={progress.cartographyV105} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready||cartographyWritePausedV105} message={cartographyMessageV105} onAction={submitCartographyV105} onClose={closeDialog} reducedMotion={reducedMotionV77}/>
          : <><p>Rejoins le point d’observation du viaduc pour comparer les repères.</p><button onClick={closeDialog}>Revenir à la cité</button></>
        : dialog.cartographyV104 ? cartographyDialogV104 ? <HomeworldCartographyV105 ledger={progress.cartographyV105} legacy={progress.cartographyV104} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready||cartographyWritePausedV104||cartographyWritePausedV105} message={cartographyMessageV105} legacyMessage={cartographyMessageV104} onAction={submitCartographyV105} onLegacyAction={submitCartographyV104} onClose={closeDialog} reducedMotion={reducedMotionV77}/>
          : <><p role="status">Rejoins le cartographe et son pupitre pour reprendre cette conversation.</p><button type="button" onClick={closeDialog}>Revenir à la cité</button></>
        : dialog.cntlipSiteId&&cntlipV77.siteId===dialog.cntlipSiteId ? <HomeworldCntlipV77 state={cntlipV77.ledger.state} context={cntlipV77.context}
          invited={dialog.cntlipSiteId!=='ship-mess'&&cntlipV77.ledger.invitedSiteIds.includes(dialog.cntlipSiteId)}
          writePaused={cntlipV77.writePaused} message={cntlipV77.message} onAction={cntlipV77.submit} onSit={cntlipV77.install} onLeave={closeDialog}
          canResumeScene={!suspended} onResumeScene={()=>{setPaused(false);setInactive(false);requestAnimationFrame(()=>dialogRef.current?.focus({preventScroll:true}));}}/>
        : dialog.navigation ? <>
          <p>{interior?.description ?? "Une cité de clans et de serments. Ouvre une destination ou reprends l’exploration à ta position actuelle."}</p>
          <div className={styles.navigationActionsV64} onClick={event => {
            if (event.target instanceof HTMLElement && event.target.closest("button:not(:disabled)")) closeDialog();
          }}>{navigation}</div>
          {welcome && <section className={styles.notice}>{welcome}</section>}
          <p>Marche : {controlActionShortcut("hunt.moveLeft", bindings)} / {controlActionShortcut("hunt.moveRight", bindings)} / {controlActionShortcut("hunt.moveUp", bindings)} / {controlActionShortcut("hunt.moveDown", bindings)}. Course : maintenir {controlActionShortcut("hunt.aim", bindings)} ou L3, ou activer le bouton Course sur écran tactile. Interaction : {controlActionShortcut("hunt.interact", bindings)}. Manette : stick ou croix, A interaction, B fermer, Start pause.</p>
          <button type="button" onClick={closeDialog}>Fermer la navigation</button>
        </> : <>
        {selectedPoint ? <>
          {selectedNpc && <p><YautjaTranslationV67 text={`« ${youthWelcome && youthGreeting[selectedNpc.id] ? youthGreeting[selectedNpc.id] : selectedNpc.greeting} »`} paused={suspended || paused || inactive} /></p>}
          {youthWelcome && ["hunt-king", "terrace-instructor"].includes(selectedNpc?.id ?? "") && <div className={styles.notice} data-unblooded-conversation={selectedNpc?.id}><p>{youthObjective}</p><p>Les exercices se jouent dans le dojo, puis au camp. Le maître attend ton retour pour reconnaître chaque épreuve.</p></div>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && youthChiefMet && youthMentorMet && onYouthTraining && <button type="button" data-youth-enter-dojo disabled={suspended} onClick={enterYouthTraining}>{save.youthTraining?.status === "completed" ? save.youthTraining.checkpoint.phase === "cage-complete" ? "Revoir le bilan de la petite Fosse" : save.youthTraining.checkpoint.phase.startsWith("cage-") ? "Reprendre la petite Fosse de jeunesse" : save.youthTraining.checkpoint.phase === "patrol-complete" ? "Préparer le premier duel de la Fosse" : save.youthTraining.checkpoint.phase.startsWith("patrol-") ? "Reprendre la patrouille accompagnée" : save.youthTraining.checkpoint.phase === "desert-complete" ? "Préparer la patrouille avec le maître" : "Rejoindre le maître pour la sortie du désert" : save.youthTraining ? "Reprendre la formation Unblooded" : "Entrer dans le dojo avec le maître"}</button>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV66 && canStartSoloV66(save) && save.soloV66?.status !== "completed" && <button type="button" data-solo-v66-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current)?.id !== "training-service") return;
            clearInputs();
            // Like the dojo departure, Solo unmounts the city: retain refused visits here until the player explicitly retries them.
            if (pendingVisitsRef.current.size > 0) {
              const message = "Des visites de quartiers restent non enregistrées. Réessaie leur enregistrement ici avant de rejoindre le maître ; ta progression reste conservée dans la cité.";
              setAnnouncement(message); onNotify(message);
              setDialog(current => current ? { ...current, message } : current);
              return;
            }
            if (!onSoloV66()) setDialog(current => current ? { ...current, message: "Départ non sauvegardé. Réessaie auprès du maître." } : current);
          }}>{save.soloV66 ? "Reprendre Les Premières Pistes" : "Préparer Les Premières Pistes avec le maître"}</button>}
          {save.soloV66?.status === "completed" && selectedNpc?.id === "terrace-instructor" && <p data-solo-v66-complete>Les Premières Pistes sont rapportées : ta lecture des traces et ton observation sont reconnues. Ton parcours se poursuit ; {save.soloV67?.status === "completed" ? "la Piste sans guide est également rapportée. La reconnaissance de la cohorte constitue l’étape suivante." : "la Piste sans guide est maintenant accessible auprès du maître."}</p>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV67 && canStartSoloV67(save) && save.soloV67?.status !== "completed" && <button type="button" data-solo-v67-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current)?.id !== "training-service") return;
            clearInputs();
            if (pendingVisitsRef.current.size > 0) {
              const message = "Des visites de quartiers attendent leur enregistrement. Réessaie ici avant de partir sans guide ; rien n’est abandonné.";
              setAnnouncement(message); onNotify(message); setDialog(current => current ? { ...current, message } : current); return;
            }
            if (!onSoloV67()) setDialog(current => current ? { ...current, message: "Départ non sauvegardé. Réessaie auprès du maître." } : current);
          }}>{save.soloV67 ? "Reprendre La Piste sans guide" : "Préparer La Piste sans guide"}</button>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV68 && canStartSoloV68(save) && save.soloV68?.status !== "completed" && <button type="button" data-solo-v68-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current)?.id !== "training-service") return;
            clearInputs();
            if (pendingVisitsRef.current.size > 0) { setDialog(current => current ? { ...current, message: "Enregistre les visites de quartier en attente avant de partir avec la cohorte." } : current); return; }
            if (!onSoloV68()) setDialog(current => current ? { ...current, message: "Départ non enregistré. Réessaie auprès du maître." } : current);
          }}>{save.soloV68 ? "Reprendre La Cohorte des Aspirants" : "Rejoindre La Cohorte des Aspirants"}</button>}
          {selectedNpc?.id === "terrace-instructor" && save.soloV68?.status === "completed" && <p data-solo-v68-complete>La cohorte est rentrée avec ses deux compagnons. Le clan a reconnu ton parcours Young Blood. Le rite Blooded demeure une chasse distincte.</p>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV69 && canStartSoloV69(save) && save.soloV69?.status !== "completed" && <button type="button" data-solo-v69-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current)?.id !== "training-service") return;
            clearInputs();
            if (pendingVisitsRef.current.size > 0) { setDialog(current => current ? { ...current, message: "Enregistre les visites en attente avant de rejoindre les seuils." } : current); return; }
            if (!onSoloV69()) setDialog(current => current ? { ...current, message: "Départ non enregistré. Réessaie auprès du maître." } : current);
          }}>{save.soloV69 ? "Reprendre Les Seuils du Premier Sang" : "Préparer Les Seuils du Premier Sang"}</button>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV70 && canStartSoloV70(save) && save.soloV70?.status !== "completed" && <button type="button" data-solo-v70-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current)?.id !== "training-service") return;
            clearInputs();
            if (pendingVisitsRef.current.size > 0) { setDialog(current => current ? { ...current, message: "Enregistre les visites en attente avant de rejoindre le temple." } : current); return; }
            if (!onSoloV70()) setDialog(current => current ? { ...current, message: "Départ non enregistré. Réessaie auprès du maître." } : current);
          }}>{save.soloV70 ? "Reprendre Le Temple des Trois Ombres · acte I" : "Le Temple des Trois Ombres · acte I"}</button>}
          {selectedNpc?.id === "terrace-instructor" && save.soloV70?.status === "completed" && <p data-solo-v70-complete>Le premier acte du temple est rapporté. Les salles profondes, la reine et le rite Blooded ne sont pas validés par cette ouverture.</p>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV90 && canStartSoloV90(save) && save.soloV90?.status !== "completed" && <button type="button" data-solo-v90-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current)?.id !== "training-service") return;
            clearInputs();
            if (pendingVisitsRef.current.size > 0) { setDialog(current => current ? { ...current, message: "Enregistre les visites en attente avant de rejoindre la préparation de triade." } : current); return; }
            if (!onSoloV90()) setDialog(current => current ? { ...current, message: "Préparation non enregistrée. Réessaie auprès du maître." } : current);
          }}>{save.soloV90 ? "Reprendre la préparation de triade" : "Préparation de triade · Combat de seuil"}</button>}
          {selectedNpc?.id === "terrace-instructor" && save.soloV90?.status === "completed" && <p data-solo-v90-complete>La triade a rapporté son entraînement et ses blessures. Cet exercice ne remplace ni l’épreuve Quatza-Rij, ni le marquage Blooded.</p>}
          {selectedNpc?.id === "terrace-instructor" && save.soloV69?.status === "completed" && <p data-solo-v69-complete>Les douze étapes de préparation sont attestées. Le jeune a rejoint le refuge et tu es revenu au maître. Ton rang reste Young Blood ; le Premier Sang attend sa propre expédition.</p>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && <p data-youth-equipment>{youthEquipmentSummary(save.youthTraining)}</p>}
          <p>{youthWelcome && selectedPoint.kind === "ship" ? "Appareils et transports du clan." : youthWelcome && selectedPoint.service ? "Lieu public du clan : les équipements et exercices sont remis aux étapes prévues de la formation." : youthWelcome && selectedPoint.npcId === "hunt-king" ? "Présente-toi au chef avant de rejoindre ton instructeur." : selectedPoint.evidenceId ? <YautjaTranslationV67 text={selectedPoint.description} paused={suspended || paused || inactive} /> : selectedPoint.description}</p>
          {selectedPoint.service === "customization" && <p data-homeworld-chromatic-station-v113>Ce comptoir donne accès à quatre travaux distincts : étude des chromatophores, ligatures des dreadlocks, teinturerie de l’étoffe et patine de l’armure. Les pigments et les échantillons sont une adaptation originale du clan, sans modifier ton rang ni accorder des équipements.</p>}
          {selectedPoint.kind === "ship" && <p>{youthWelcome ? "La navette de desserte relie les quais aux appareils du clan. Ton propre vaisseau sera acquis après le rite Blooded ; l’accueil et la formation sur le Homeworld viennent d’abord." : <>Le {shipForId(selectedShipId).name} reste en amarrage orbital. Cette console donne accès au transfert par la navette de desserte. L’armurerie, les trophées et les pièces de ton vaisseau personnel restent accessibles.</>}</p>}
          {selectedRegion && <><p>{selectedRegion.description}</p>{youthWelcome && <p>{villagesOpenV69 ? "Ta formation et les Premières Pistes sont attestées. Tu peux rejoindre les villages ordinaires à pied et réaliser leurs relevés. Les enquêtes sensibles et la Réserve conservent leurs conditions ; aucun départ orbital personnel n’est ouvert." : "La formation, le premier biomask et le repos aux baraquements précèdent les sorties de jeunesse. Après la formation et les Premières Pistes, les villages ordinaires ouvrent leurs routes."}</p>}<div className={styles.notice}>
            {selectedRegion.status === "playable-introduction"
              ? selectedRegion.id === "glass-desert"
                ? "Les plaques vitrifiées transmettent les vibrations. Rejoins le village des Citernes ou poursuis le dossier du convoi jusqu’au site abandonné et à sa balise de rabattage."
                : "La corniche relie la cité à la halte de clan. Rejoins ses habitants ou suis les pistes du convoi disparu pour poursuivre ton enquête."
              : "Un sentier continu rejoint le village de clan. Rencontre son guide, ses artisans et ses habitants, puis explore le terrain de pistage. Le rapport du guide et le retour auprès du commanditaire complètent une demande."}
            {selectedRegion.id === "ash-marches" && !progress.evidenceIds.includes("suspect-trophy") && <p>Inspecte d’abord le trophée du convoi dans le Contrôle d’amarrage, au Port des Chasses.</p>}
            {selectedRegion.id === "glass-desert" && !progress.expeditions["ash-marches"] && <p>Remets d’abord le rapport complet des Marches à sa navette. Le Désert exige ce rapport durable ; aucun résultat THE PIT n’est requis.</p>}
          </div></>}
          {!youthWelcome && selectedPoint.kind === "audience" && <p>Présente les trois preuves et prends position sur le sort du témoin avant l’audience. Cette première décision est conservée dans ta sauvegarde ; elle ne termine pas toute la campagne.</p>}
          {!youthWelcome && selectedPoint.evidenceId === "undercity-testimony" && canChoose && <><div className={styles.notice}>Les trois preuves sont réunies. Ta première position sur le témoin sera définitive pour cette introduction.</div>{HOMEWORLD_WITNESS_CHOICES.map(choice => <div key={choice.id}><p>{choice.description}</p><button type="button" onClick={() => chooseWitness(choice.id)}>{choice.label}</button></div>)}</>}
          <HomeworldSideStoryV66 progress={progress.sideStoryV66} pointId={selectedPoint.id} eligible={!youthWelcome} disabled={suspended || paused || inactive} onAction={action => submitNarrativeV66("side", action)} />
          <HomeworldNpcMissionsV66 value={progress.npcMissionsV66} npcId={selectedPoint.npcId} autonomousHunter={!youthWelcome} disabled={suspended || paused || inactive} onAction={action => { submitNarrativeV66("npc", action); }} />
          <HomeworldContractsV68 value={progress.contractsV68} npcId={selectedPoint.npcId} eligible={villagesOpenV69} disabled={suspended || paused || inactive} onAction={submitContractV68} />
          {!youthWelcome && inquiryDialogue && <section className={styles.notice} aria-label="Contre-enquête du convoi" data-homeworld-inquiry-dialog={inquiryJournal.step}>
            <h4>{inquiryDialogue.title}</h4><p><YautjaTranslationV67 text={inquiryDialogue.text} paused={suspended || paused || inactive} /></p>
            {inquiryDialogue.options.map((option, index) => <div key={index}>
              {option.consequence && <p>{option.consequence}</p>}
              <button type="button" disabled={suspended || paused || inactive} onClick={() => submitInquiry(option.action)}>{option.label}</button>
            </div>)}
          </section>}
        </> : selectedStreetContactV100 ? <HomeworldStreetConversationV100 key={selectedStreetContactV100.id} contact={selectedStreetContactV100} progress={progress} seconds={phase} youth={youthWelcome} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready} onLandmark={requestStreetLandmarkV100}/> : dialog.streetContactV100 ? <p role="status">La conversation est interrompue. Rejoins cet habitant sur son passage.</p> : selectedResidentV68 ? <>
          <p data-homeworld-civilian-routine-v84={selectedResidentPoseV84?.phase} data-homeworld-civilian-group-v84={selectedResidentRoutineV84?.groupId ?? undefined}>
            {selectedResidentPoseV84?.phaseLabel}{selectedResidentRoutineV84?.groupLabel ? ` · ${selectedResidentRoutineV84.groupLabel}` : ''}.
          </p>
          <HomeworldResidentConversationV75 key={selectedResidentV68.id} resident={selectedResidentV68} seconds={phase} paused={suspended || paused || inactive} disabled={cargoMigrationPendingV108||suspended||paused||inactive||!motionAssetsV74.ready} places={homeworldResidentContactPlacesV110(selectedResidentV68,progress)} onLandmark={requestResidentLandmarkV110} />
        </> : dialog.residentV110 ? <p role="status">La conversation est interrompue. Rejoins cet habitant sur son passage.</p> : youthWelcome ? <>
          <h4>Parcours Unblooded</h4><p>{youthObjective}</p><p>{youthEquipmentSummary(save.youthTraining)}</p>
          <ul><li>{youthChiefMet ? "✓" : "○"} Rencontre du chef à la Citadelle.</li><li>{youthMentorMet ? "✓" : "○"} Rencontre de l’instructeur après l’accueil du chef.</li></ul>
          <p>Ces échanges sont des rencontres réelles enregistrées dans cette cité. Le journal montre uniquement les étapes réellement jouées : aucune formation ni remise d’équipement n’est validée par sa lecture.</p>
          {villagesOpenV69 && <><HomeworldContractsJournalV68 value={progress.contractsV68} /><p data-homeworld-wallet-v69>Solde disponible : <strong>{save.profile.clanMarks} marques de clan</strong>. Rejoins physiquement le commanditaire indiqué pour accepter une demande ou lui remettre ses rapports.</p></>}
        </> : <>
          <p>Un trophée contesté est arrivé dans la cité. Examine sa provenance, consulte le registre des mémoires puis écoute le témoignage des Bas-Fonds.</p>
          {progress.expeditions["ash-marches"] && <p>✓ Rapport de terrain : vraie piste identifiée, fausse piste écartée, convoi retrouvé et passage rouvert.{progress.expeditions["ash-marches"].secretFound ? " Balise des Navigateurs découverte." : ""}</p>}
          {progress.expeditions["glass-desert"] && <p>✓ Rapport du Désert : journal de transit et balise de rabattage concordants. Traversée {progress.expeditions["glass-desert"].crossingRoute === "stepping-stones" ? "par les corniches" : "par diversion du fouisseur"} ; canal {progress.expeditions["glass-desert"].beaconDisposition === "preserve" ? "conservé pour l’enquête" : "coupé pour arrêter l’attraction locale"}.{progress.expeditions["glass-desert"].secretFound ? " Composant ancien documenté." : ""} Aucun coupable n’est encore désigné.</p>}
          <ul>{HOMEWORLD_EVIDENCE.map(evidence => <li key={evidence.id}>{progress.evidenceIds.includes(evidence.id) ? "✓ " : "○ "}{evidence.label}</li>)}</ul>
          <p>{progress.audienceOutcome ? "Ton audience a été enregistrée. Tu peux encore explorer la cité et rencontrer ses habitants." : progress.witnessChoice ? "Ta position sur le témoin est enregistrée. Rejoins la Citadelle pour la première audience." : canChoose ? "Retourne auprès du témoin des Bas-Fonds pour choisir ta position, puis rejoins la Citadelle." : "Les cours, passages et rampes obliques forment un seul réseau au sol. Approche les portes éclairées pour repérer leurs seuils."}</p>
          <section className={styles.notice} aria-label="Contre-enquête du convoi"><h4>Contre-enquête du convoi · {inquiryJournal.completed}/5</h4><p><strong>{inquiryJournal.label}</strong></p><p>{inquiryJournal.objective}</p><p>Suite originale adaptée du projet Homeworld : confrontations aux quais et aux archives, priorité chez les Enforcers, vérification puis audience complémentaire. Aucun acte complet, nouveau rang ou trophée n’est attribué.</p></section>
          <section className={styles.notice} aria-label="Journal de La marque empruntée" data-side-story-v66-journal><h4>La marque empruntée · {sideStoryJournalV66.completed}/{sideStoryJournalV66.total}</h4><p><strong>{sideStoryJournalV66.label}</strong></p><p>{sideStoryJournalV66.objective}</p></section>
          <HomeworldNpcMissionsJournalV66 value={progress.npcMissionsV66} autonomousHunter={!youthWelcome} />
          <HomeworldContractsJournalV68 value={progress.contractsV68} />
          <p data-homeworld-wallet-v68>Solde disponible : <strong>{save.profile.clanMarks} marques de clan</strong>. Les primes remises peuvent financer l’équipement à l’armurerie.</p>
          <p>Les villages accueillent les délégations et consignent les pistes de leurs territoires. L’artisane du marché tient le Tableau des chasses ; les demandes personnelles se reçoivent auprès de leurs commanditaires.</p>
        </>}
        {dialog.message && <div className={styles.notice} role="status">{dialog.message}</div>}
        <div className={styles.dialogActions}>
          {selectedRegion && onRegionV68 && isHomeworldRegionIdV68(selectedRegion.id) && <button type="button" className={styles.primary} data-homeworld-region-v68={selectedRegion.id}
            disabled={suspended || paused || inactive || !canEnterHomeworldRegionV68(save, selectedRegion.id).allowed} onClick={() => {
              const point = dialogStateRef.current?.point;
              if (suspendedRef.current || pausedRef.current || !point || pointInCurrentSpace(actorRef.current, interiorRef.current, levelRefV77.current)?.id !== point.id || !isHomeworldRegionIdV68(point.regionId)) return;
              if (pendingVisitsRef.current.size > 0) { setDialog(current => current ? { ...current, message: "Des visites attendent leur enregistrement. Réessaie ici avant de quitter les murs." } : current); return; }
              if (point.regionId === 'thermal-caves') {
                if (!canEnterHomeworldRegionV68(saveRef.current, point.regionId).allowed || !recordLocationV77()) return;
                const ride = beginHomeworldSkiffV77(levelRefV77.current, actorRef.current, true);
                if (!ride) { setDialog(current => current ? { ...current, message: 'Rejoins physiquement le quai du passeur avant la traversée.' } : current); return; }
                closeDialog(); skiffRefV77.current = ride; setSkiffV77(ride); setAnnouncement('Traversée progressive du canyon volcanique.');
              } else if (recordLocationV77() && onRegionV68(point.regionId)) closeDialog();
              else setDialog(current => current ? { ...current, message: "Départ non confirmé. La position et les demandes restent conservées." } : current);
            }}>{selectedRegion.id === 'thermal-caves' ? 'Embarquer · traversée du canyon' : 'Suivre le sentier vers le village'}</button>}
          {selectedRegion && !canEnterHomeworldRegionV68(save, selectedRegion.id).allowed && <p>{canEnterHomeworldRegionV68(save, selectedRegion.id).reason}</p>}
          {pendingVisitCount > 0 && <button type="button" disabled={suspended} onClick={retryPendingVisits}>Réessayer l’enregistrement des visites</button>}
          {selectedRegion?.id === "ash-marches" && onExpedition && <button type="button" className={styles.primary}
            disabled={youthWelcome || !progress.evidenceIds.includes("suspect-trophy")}
            onClick={() => { closeDialog(); onExpedition("ash-marches"); }}>Partir vers les Marches de Cendre</button>}
          {selectedRegion?.id === "glass-desert" && onExpedition && <button type="button" className={styles.primary}
            disabled={youthWelcome || !progress.expeditions["ash-marches"]}
            onClick={() => { closeDialog(); onExpedition("glass-desert"); }}>Partir vers le Désert de Verre</button>}
          {selectedPoint?.kind === "ship" && <button type="button" className={styles.primary} disabled={youthWelcome} onClick={() => { if (recordLocationV77()) onReturnShip(); }}>{youthWelcome ? "Vaisseau personnel : rite Blooded requis" : "Monter à bord"}</button>}
          {selectedPoint?.service && <button type="button" className={styles.primary} disabled={youthServiceLocked} onClick={() => { const service = selectedPoint.service; if (service) { closeDialog(); onService(service); } }}>{youthServiceLocked ? "Formation préalable requise" : "Accéder au service"}</button>}
          {!youthWelcome && selectedPoint?.kind === "audience" && !progress.audienceOutcome && <button type="button" className={styles.primary} onClick={() => { const result = persistAction({ type: "audience" }); setDialog(current => current ? { ...current, message: result.message } : current); }}>Présenter mon dossier</button>}
          <button type="button" onClick={closeDialog}>{interior ? "Revenir dans la salle" : "Revenir à la cité"}</button>
        </div>
        </>}
      </div>
    </div>}
  </section>;
}
