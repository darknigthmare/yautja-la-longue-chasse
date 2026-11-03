import React from 'react';
import {createRoot} from 'react-dom/client';
import ClanSupplyRouteV109 from '../../app/game/ClanSupplyRouteV109';
import {DEFAULT_WAR_RULES_V6} from '../../app/game/systems/clanWarBibleV6';

// Component-only preflight; final admission uses the compiled application.
createRoot(document.getElementById('root')!).render(<ClanSupplyRouteV109 rules={DEFAULT_WAR_RULES_V6}/>);
