export const W3_S14_CLIENT_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Duel W3-S14</title>
  <style>
    :root{color-scheme:dark;font:16px/1.5 system-ui,sans-serif;background:#101817;color:#eef1e9}
    *{box-sizing:border-box}
    [hidden]{display:none!important}
    body{margin:0;padding:clamp(1rem,4vw,3rem)}
    main{max-width:49rem;margin:auto}
    h1,h2,h3,p,dl,ol,ul{margin:0}
    h1{font-size:clamp(2rem,6vw,3.4rem);line-height:1.1;color:#f0cf91}
    h2{font-size:1.35rem}
    h3{font-size:1rem}
    header{display:grid;gap:.45rem;margin-bottom:1.4rem}
    #duel-arena{display:grid;gap:1rem}
    .panel,form{background:#182523;border:1px solid #415a51;border-radius:.75rem;padding:1rem}
    form{display:grid;gap:.5rem;max-width:28rem}
    #duel-feedback{min-height:1.5rem;margin:.85rem 0;color:#f0cf91}
    .toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem}
    .summary,.result{display:grid;gap:.55rem}
    .participants{list-style:none;padding:0;display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))}
    .participant{display:grid;gap:.25rem;border-left:3px solid #78928b;padding:.65rem .75rem;background:#1f302d;overflow-wrap:anywhere}
    .participant[data-you="true"]{border-color:#f0cf91}
    .participant p{font-size:.95rem}
    .muted{color:#c1ccc5}
    .actions{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))}
    .actions section{display:grid;align-content:start;gap:.65rem}
    button,input{min-height:44px;padding:.5rem .8rem;border:1px solid #78928b;border-radius:.4rem;background:#223532;color:inherit;font:inherit}
    button{cursor:pointer}
    button:disabled{opacity:.6;cursor:default}
    button:not(:disabled):hover{background:#334b45}
    button:focus-visible,input:focus-visible{outline:3px solid #f0cf91;outline-offset:3px}
    button[data-command="strike"],form button{background:#f0cf91;color:#19201b;border-color:#f0cf91;font-weight:650}
    button[data-command="strike"]:not(:disabled):hover,form button:not(:disabled):hover{background:#ffe5ad}
    input{width:100%;min-width:0}
    .pad{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}
    .result{border-color:#c5a877}
  </style>
  <script src="/client.js" defer></script>
</head>
<body>
  <main>
    <header>
      <h1>Duel W3-S14</h1>
      <p class="muted">Les deux participants doivent signer l’accord. Le poste consigne les touches et conserve le reçu.</p>
    </header>

    <form id="duel-session" method="post" autocomplete="off">
      <label for="duel-token">Jeton d’accès</label>
      <input id="duel-token" type="password" minlength="43" maxlength="128" required spellcheck="false" autocomplete="off">
      <button id="duel-join" type="submit">Rejoindre le duel</button>
    </form>
    <p id="duel-feedback" role="status" aria-live="polite" aria-atomic="true"></p>

    <section id="duel-arena" aria-label="Aire du duel" hidden>
      <section class="panel summary" aria-labelledby="duel-phase">
        <h2 id="duel-phase" tabindex="-1"></h2>
        <p id="duel-turn"></p>
        <p id="duel-distance" class="muted"></p>
        <ul class="participants" aria-label="Participants">
          <li class="participant" data-duel-participant="challenger">
            <h3>Défiant</h3>
            <p data-member></p>
            <p data-position></p>
            <p data-score></p>
            <p data-signature class="muted"></p>
          </li>
          <li class="participant" data-duel-participant="rival">
            <h3>Rival</h3>
            <p data-member></p>
            <p data-position></p>
            <p data-score></p>
            <p data-signature class="muted"></p>
          </li>
        </ul>
      </section>

      <div class="actions">
        <section class="panel" aria-labelledby="duel-move-label">
          <h2 id="duel-move-label">Déplacement</h2>
          <div class="pad">
            <button type="button" data-command="move" data-direction="north">Nord</button>
            <button type="button" data-command="move" data-direction="south">Sud</button>
            <button type="button" data-command="move" data-direction="west">Ouest</button>
            <button type="button" data-command="move" data-direction="east">Est</button>
          </div>
        </section>
        <section class="panel" aria-labelledby="duel-actions-label">
          <h2 id="duel-actions-label">Ordres de duel</h2>
          <div class="toolbar">
            <button type="button" data-command="sign">Signer l’accord</button>
            <button type="button" data-command="decline">Refuser le duel</button>
            <button type="button" data-command="start">Engager le duel</button>
            <button type="button" data-command="strike">Frapper</button>
            <button type="button" data-command="miss">Tenter hors de portée</button>
            <button type="button" data-command="renegotiate">Renégocier</button>
            <button type="button" data-command="claim">Retirer le coffre</button>
          </div>
        </section>
      </div>

      <section class="panel result" data-duel-receipt aria-labelledby="duel-receipt-title" hidden>
        <h2 id="duel-receipt-title">Reçu du duel</h2>
        <p id="duel-result"></p>
        <p id="duel-chest"></p>
        <button type="button" id="duel-download" hidden>Télécharger mon reçu signé</button>
      </section>

      <div class="toolbar">
        <button type="button" id="duel-refresh">Relire l’état</button>
        <button type="button" id="duel-disconnect">Se déconnecter</button>
      </div>
    </section>
  </main>
</body>
</html>`;

export const W3_S14_CLIENT_SCRIPT = `'use strict';

const form = document.querySelector('#duel-session');
const tokenInput = document.querySelector('#duel-token');
const joinButton = document.querySelector('#duel-join');
const arena = document.querySelector('#duel-arena');
const feedback = document.querySelector('#duel-feedback');
const refreshButton = document.querySelector('#duel-refresh');
const disconnectButton = document.querySelector('#duel-disconnect');
const phaseLabel = document.querySelector('#duel-phase');
const turnLabel = document.querySelector('#duel-turn');
const distanceLabel = document.querySelector('#duel-distance');
const receiptPanel = document.querySelector('[data-duel-receipt]');
const resultLabel = document.querySelector('#duel-result');
const chestLabel = document.querySelector('#duel-chest');
const downloadButton = document.querySelector('#duel-download');
const commandButtons = document.querySelectorAll('[data-command]');
const players = Object.fromEntries(
  Array.from(document.querySelectorAll('[data-duel-participant]'), row => [row.dataset.duelParticipant, {
    row,
    member: row.querySelector('[data-member]'),
    position: row.querySelector('[data-position]'),
    score: row.querySelector('[data-score]'),
    signature: row.querySelector('[data-signature]'),
  }]),
);

const directions = {north: [0, -24], south: [0, 24], west: [-24, 0], east: [24, 0]};
const phaseNames = {
  unsigned: 'Accord à signer',
  accepted: 'Accord signé',
  active: 'Duel en cours',
  interrupted: 'Duel interrompu',
  won: 'Duel terminé',
  lost: 'Duel terminé',
  declined: 'Duel refusé',
};
let session = null;

function announce(message) {
  feedback.textContent = message;
}

function draw(snapshot) {
  const connected = Boolean(snapshot);
  form.hidden = connected;
  arena.hidden = !connected;
  joinButton.disabled = Boolean(session);
  if (!connected) return;

  const {revision, tick, you, duel, participants, receipt} = snapshot;
  const challenger = participants.find(person => person.role === 'challenger');
  const rival = participants.find(person => person.role === 'rival');
  const own = you === 'challenger' ? challenger : rival;
  const distance = Math.hypot(challenger.x - rival.x, challenger.y - rival.y);
  const signed = duel.signatures.includes(own.memberId);
  const isChallenger = you === 'challenger';
  const inTurn = duel.round % 2 === (isChallenger ? 0 : 1);
  const beforeStart = duel.phase === 'unsigned' || duel.phase === 'accepted';

  arena.dataset.revision = String(revision);
  arena.dataset.tick = String(tick);
  arena.dataset.role = you;
  arena.dataset.phase = duel.phase;
  phaseLabel.textContent = phaseNames[duel.phase] ?? 'État du duel';
  turnLabel.textContent = duel.phase === 'active'
    ? inTurn ? 'Votre tour' : 'Tour adverse'
    : '';
  distanceLabel.textContent = 'Distance entre les participants · ' +
    distance.toLocaleString('fr-FR', {maximumFractionDigits: 1}) + ' unités';

  for (const person of participants) {
    const view = players[person.role];
    if (!view) continue;
    const isYou = person.role === you;
    view.row.dataset.you = String(isYou);
    view.row.dataset.x = String(person.x);
    view.row.dataset.y = String(person.y);
    view.member.textContent = person.memberId + (isYou ? ' · Vous' : '');
    view.position.textContent = 'Position · ' + person.x + ', ' + person.y;
    const points = person.role === 'challenger' ? duel.player : duel.rival;
    view.score.textContent = 'Points restants · ' + points;
    view.signature.textContent = duel.signatures.includes(person.memberId)
      ? 'Accord signé' : 'Accord en attente';
  }

  receiptPanel.hidden = !receipt;
  downloadButton.hidden = !snapshot.attestation;
  if (receipt) {
    receiptPanel.dataset.outcome = receipt.outcome;
    resultLabel.textContent = duel.winner ? 'Vainqueur · ' + duel.winner : 'Duel refusé';
    chestLabel.textContent = duel.chestHolder === 'site'
      ? 'Coffre à l’aire' : 'Coffre remis à ' + duel.chestHolder;
    chestLabel.dataset.holder = duel.chestHolder;
  }

  const allowed = {
    move: beforeStart || duel.phase === 'active' || duel.phase === 'interrupted',
    sign: beforeStart && !signed,
    decline: beforeStart,
    start: duel.phase === 'accepted' && isChallenger,
    strike: duel.phase === 'active' && inTurn && (!isChallenger || distance <= 32),
    miss: duel.phase === 'active' && inTurn && isChallenger && distance > 32,
    renegotiate: duel.phase === 'interrupted' && isChallenger,
    claim: Boolean(receipt && duel.winner === own.memberId && duel.chestHolder === 'site'),
  };
  for (const button of commandButtons) {
    button.disabled = session.busy || !session.synced || !allowed[button.dataset.command];
  }
  refreshButton.disabled = session.busy || session.reading;
}

function applySnapshot(connection, snapshot) {
  if (session !== connection) return;
  if (!Number.isSafeInteger(snapshot?.revision) || !Number.isSafeInteger(snapshot.tick) ||
      !Number.isSafeInteger(snapshot.nextSequence) || !snapshot.duel ||
      !Array.isArray(snapshot.duel.signatures) || !Array.isArray(snapshot.participants) ||
      !Object.keys(players).every(role => snapshot.participants.some(person => person.role === role))) {
    throw new Error('État inattendu.');
  }
  if (!connection.snapshot || snapshot.revision >= connection.snapshot.revision) {
    connection.snapshot = snapshot;
  }
  connection.synced = true;
  draw(connection.snapshot);
}

async function request(connection, path, order) {
  const headers = {Authorization: 'Bearer ' + connection.token};
  if (order) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    headers,
    signal: AbortSignal.any([connection.controller.signal, AbortSignal.timeout(8000)]),
    method: order ? 'POST' : 'GET',
    body: order ? JSON.stringify(order) : undefined,
  });
  return {status: response.status, payload: await response.json()};
}

function disconnect(message) {
  session?.controller.abort();
  session = null;
  draw(null);
  tokenInput.value = '';
  tokenInput.focus();
  announce(message);
}

async function refresh(connection, announceSuccess = false) {
  if (!connection || connection.reading || connection.busy) return;
  connection.reading = true;
  const attempt = connection.attempt;
  draw(connection.snapshot);
  try {
    const {status, payload} = await request(connection, '/state');
    if (session !== connection || connection.attempt !== attempt) return;
    if (status === 401) {
      disconnect('Accès refusé. Vérifiez le jeton du participant.');
      return;
    }
    if (status !== 200) throw new Error('Lecture indisponible.');
    const joining = !connection.snapshot;
    const reconnecting = !connection.synced;
    applySnapshot(connection, payload);
    if (joining) phaseLabel.focus();
    if (announceSuccess || reconnecting) announce('État confirmé par le poste.');
  } catch {
    if (session !== connection || connection.attempt !== attempt) return;
    connection.synced = false;
    announce('Le poste ne répond pas. Relisez l’état avant de jouer.');
  } finally {
    if (session === connection) {
      connection.reading = false;
      if (!connection.snapshot) {
        disconnect('Connexion indisponible. Réessayez pour rejoindre le duel.');
      } else {
        draw(connection.snapshot);
      }
    }
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (session) return;
  const token = tokenInput.value.trim();
  tokenInput.value = '';
  session = {
    token, controller: new AbortController(), snapshot: null,
    synced: false, busy: false, reading: false, attempt: 0,
  };
  announce('Connexion au poste…');
  void refresh(session, true);
});

async function play(button) {
  const connection = session;
  if (!connection?.snapshot || connection.busy || !connection.synced || button.disabled) return;
  const {revision, tick, nextSequence: sequence} = connection.snapshot;
  const kind = button.dataset.command;
  const order = {
    id: Array.from(crypto.getRandomValues(new Uint8Array(16)), byte =>
      byte.toString(16).padStart(2, '0')).join(''),
    sequence,
    revision,
    tick,
    kind,
    target: kind === 'move' ? directions[button.dataset.direction] : null,
  };
  connection.attempt++;
  connection.busy = true;
  draw(connection.snapshot);
  try {
    const {status, payload} = await request(connection, '/order', order);
    if (session !== connection) return;
    if (status === 401) {
      disconnect('Accès refusé. Vérifiez le jeton du participant.');
      return;
    }
    if (status === 409) {
      connection.synced = false;
      const updated = await request(connection, '/state');
      if (session !== connection) return;
      if (updated.status !== 200) throw new Error('Lecture indisponible.');
      applySnapshot(connection, updated.payload);
      announce('L’état a changé. Vérifiez les positions et le tour avant de rejouer.');
      return;
    }
    if (status >= 500) throw new Error('Ordre non confirmé.');
    if (status !== 200) {
      announce(typeof payload.message === 'string' ? payload.message : 'Ordre refusé par le poste.');
      return;
    }
    applySnapshot(connection, payload.state);
    announce(typeof payload.message === 'string' ? payload.message : 'Ordre confirmé.');
  } catch {
    if (session !== connection) return;
    connection.synced = false;
    announce('La réponse à l’ordre manque. Relisez l’état avant de rejouer.');
  } finally {
    if (session === connection) {
      connection.busy = false;
      draw(connection.snapshot);
    }
  }
}

for (const button of commandButtons) {
  button.addEventListener('click', () => void play(button));
}
downloadButton.addEventListener('click', () => {
  const attestation = session?.snapshot?.attestation;
  if (!attestation) return;
  const file = new Blob([JSON.stringify(attestation, null, 2) + '\\n'], {type: 'application/json'});
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'recu-w3-s14-signe.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
refreshButton.addEventListener('click', () => void refresh(session, true));
disconnectButton.addEventListener('click', () => disconnect('Session déconnectée.'));
setInterval(() => {
  if (session?.snapshot && !document.hidden) void refresh(session);
}, 750);
`;
