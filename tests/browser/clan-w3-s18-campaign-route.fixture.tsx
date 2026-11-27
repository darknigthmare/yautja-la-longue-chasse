import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import ClanWarBibleV6Panel from '../../app/game/ClanWarBibleV6Panel';
import SpaceRoutesPanelV159 from '../../app/game/SpaceRoutesPanelV159';
import {loadSaveWithStatus, SAVE_STORAGE_KEY, writeSaveWithStatus} from '../../app/game/save';
import {
  actSpaceRoutesV159, normalizeSpaceRoutesV159, spacePersonalShipV159,
  type SpaceRoutesActionV159, type SpaceRoutesResultV159,
} from '../../app/game/systems/spaceRoutesV159';

function RouteFixture() {
  const [save, setSave] = useState(() => {
    const result = loadSaveWithStatus(localStorage, SAVE_STORAGE_KEY);
    if (!result.loaded || !result.save) throw new Error('La recette exige une sauvegarde vérifiée.');
    return result.save;
  });
  function onAction(action: SpaceRoutesActionV159): SpaceRoutesResultV159 {
    const result = actSpaceRoutesV159(save.spaceRoutesV159, action,
      {ownerCreatedAt: save.createdAt, ship: spacePersonalShipV159(save)});
    if (!result.accepted || !result.changed) return result;
    const next = {...save, spaceRoutesV159: result.state};
    if (!writeSaveWithStatus(next, localStorage, SAVE_STORAGE_KEY).persisted) {
      return {accepted: false, changed: false, state: save.spaceRoutesV159 ?? null, message: 'Écriture refusée.'};
    }
    setSave(next);
    return result;
  }
  return <ClanWarBibleV6Panel campaignRoutesPanel={
    <SpaceRoutesPanelV159 ownerCreatedAt={save.createdAt}
      state={normalizeSpaceRoutesV159(save.spaceRoutesV159, save.createdAt)}
      ship={spacePersonalShipV159(save)} onAction={onAction}/>
  }/>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Point de montage absent.');
createRoot(root).render(<RouteFixture/>);
