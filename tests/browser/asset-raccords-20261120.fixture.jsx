import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import GameClient from '../../app/game/GameClient';
import {SAVE_STORAGE_KEY} from '../../app/game/save';
import '../../app/globals.css';

// The runner seeds one disclosed campaign fixture before the document loads.
// No production module, callback, hook, serializer or storage method is replaced.
window.__assetRaccordsQa20261120 = {
  documentId: crypto.randomUUID(),
  campaign() { return JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY) ?? 'null'); },
};
createRoot(document.getElementById('root')).render(createElement(GameClient));
