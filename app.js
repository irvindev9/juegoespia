// 16 células con la paleta exacta de Agar.io e íconos vectoriales limpios (sin emojis ni icono de espía)
const CELLS = [
  { bg: '#ff1755', border: '#c4003a', svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { bg: '#00e676', border: '#00b25b', svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  { bg: '#00c8ff', border: '#0095bf', svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>' },
  { bg: '#ff8c00', border: '#cc6d00', svg: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>' },
  { bg: '#651fff', border: '#460bc4', svg: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' },
  { bg: '#003cff', border: '#0028ad', svg: '<polygon points="12 2 22 12 12 22 2 12 12 2"/>' },
  { bg: '#32ff00', border: '#22b800', svg: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' },
  { bg: '#ffd600', border: '#b89800', svg: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>' },
  { bg: '#ff00aa', border: '#b8007a', svg: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' },
  { bg: '#00d4b2', border: '#009980', svg: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>' },
  { bg: '#ff5252', border: '#bd1e1e', svg: '<path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="2.5"/>' },
  { bg: '#7c4dff', border: '#5023cc', svg: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/>' },
  { bg: '#00b0ff', border: '#007bb2', svg: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>' },
  { bg: '#ffab00', border: '#c48200', svg: '<path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07"/>' },
  { bg: '#1de9b6', border: '#00b289', svg: '<polygon points="12 3 21 8.5 21 15.5 12 21 3 15.5 3 8.5 12 3"/>' },
  { bg: '#f50057', border: '#ab003c', svg: '<path d="M2 12h4l3-9 6 18 3-9h4"/>' }
];

let avatarIdx = Math.floor(Math.random() * CELLS.length);
let loginAsHost = false;
let playerId = sessionStorage.getItem('espia_player_id') || '';
let tvMode = sessionStorage.getItem('espia_tv_mode') === '1';
let lastState = null;

function getCell(idx) {
  return CELLS[Math.abs(Number(idx) || 0) % CELLS.length];
}

function applyCellToElement(el, idx) {
  const c = getCell(idx);
  el.style.background = c.bg;
  el.style.borderColor = c.border;
  el.innerHTML = `<svg viewBox="0 0 24 24">${c.svg}</svg>`;
}

function renderCellHtml(idx, extraClass = 'mini-cell') {
  const c = getCell(idx);
  return `<div class="cell-node ${extraClass}" style="background:${c.bg}; border-color:${c.border};"><svg viewBox="0 0 24 24">${c.svg}</svg></div>`;
}

applyCellToElement(document.getElementById('avatarPreview'), avatarIdx);
const savedName = sessionStorage.getItem('espia_player_name') || '';
if (savedName) document.getElementById('inputName').value = savedName;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3200);
}

function nextAvatar() {
  avatarIdx = (avatarIdx + 1) % CELLS.length;
  applyCellToElement(document.getElementById('avatarPreview'), avatarIdx);
}

function switchLoginTab(isHost) {
  loginAsHost = isHost;
  document.getElementById('tabGuest').classList.toggle('active', !isHost);
  document.getElementById('tabHost').classList.toggle('active', isHost);
  document.getElementById('hostPassWrap').classList.toggle('hidden', !isHost);
  document.getElementById('labelName').textContent = isHost ? 'USUARIO HOST' : 'ELIGE TU CÉLULA Y ESCRIBE TU NOMBRE';
  document.getElementById('inputName').placeholder = isHost ? 'irvin' : 'Tu Nombre';
}

function toggleTvMode() {
  tvMode = !tvMode;
  sessionStorage.setItem('espia_tv_mode', tvMode ? '1' : '0');
  if (lastState) renderState(lastState);
}

function logoutPlayer() {
  sessionStorage.removeItem('espia_player_id');
  sessionStorage.removeItem('espia_player_name');
  playerId = '';
  lastState = null;
  document.getElementById('topBar').classList.add('hidden');
  document.getElementById('viewLobby').classList.add('hidden');
  document.getElementById('viewGame').classList.add('hidden');
  document.getElementById('bottomBanner').classList.add('hidden');
  document.getElementById('viewLogin').classList.remove('hidden');
}

async function apiCall(action, payload = {}) {
  try {
    const res = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, action, player_id: playerId })
    });
    const data = await res.json();
    if (data.error) {
      showToast(data.error);
      return null;
    }
    renderState(data);
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function joinGame() {
  const name = document.getElementById('inputName').value.trim();
  const password = document.getElementById('inputPass').value;
  if (!name) return showToast('Escribe tu nombre primero');

  const data = await apiCall('join', {
    name,
    avatar: avatarIdx,
    as_host: loginAsHost,
    password
  });

  if (data && data.me) {
    playerId = data.me.id;
    sessionStorage.setItem('espia_player_id', playerId);
    sessionStorage.setItem('espia_player_name', name);
    renderState(data);
  }
}

async function hostAction(action, extra = {}) {
  await apiCall(action, extra);
}

async function resetUsedPlaces() {
  await apiCall('reset_used_places');
  showToast('Todos los lugares están disponibles de nuevo');
}

async function saveSettings() {
  await apiCall('save_settings', {
    max_rounds: parseInt(document.getElementById('cfgMaxRounds').value, 10) || 3,
    first_turn_sec: parseInt(document.getElementById('cfgFirstSec').value, 10) || 20,
    turn_sec: parseInt(document.getElementById('cfgTurnSec').value, 10) || 10
  });
  showToast('Ajustes guardados');
}

async function addPlace() {
  const input = document.getElementById('inputNewPlace');
  const name = input.value.trim();
  if (!name) return;
  input.value = '';
  await apiCall('add_place', { place_name: name });
}

async function castVote(targetId) {
  await apiCall('vote', { target_id: targetId });
}

function renderState(st) {
  lastState = st;

  if (!st.me) {
    document.getElementById('viewLogin').classList.remove('hidden');
    document.getElementById('viewLobby').classList.add('hidden');
    document.getElementById('viewGame').classList.add('hidden');
    document.getElementById('topBar').classList.add('hidden');
    document.getElementById('bottomBanner').classList.add('hidden');
    return;
  }

  const isHost = Number(st.me.is_host) === 1;
  document.getElementById('viewLogin').classList.add('hidden');
  document.getElementById('topBar').classList.remove('hidden');

  const btnTv = document.getElementById('btnTvMode');
  const btnEndTop = document.getElementById('btnEndGameTop');
  btnTv.classList.toggle('hidden', !isHost);
  btnTv.textContent = tvMode ? 'Modo TV: ON (Rol Oculto)' : 'Modo Jugador (Ver Rol)';
  btnEndTop.classList.toggle('hidden', !isHost || st.status === 'lobby');

  const roundPill = document.getElementById('roundPill');
  if (st.status === 'lobby') {
    roundPill.textContent = 'SALA DE ESPERA';
  } else {
    roundPill.textContent = `RONDA ${st.current_round} DE ${st.max_rounds}`;
  }

  // LOBBY
  if (st.status === 'lobby') {
    document.getElementById('viewLobby').classList.remove('hidden');
    document.getElementById('viewGame').classList.add('hidden');
    document.getElementById('bottomBanner').classList.add('hidden');

    document.getElementById('playerCount').textContent = st.players.length;
    const listEl = document.getElementById('lobbyPlayers');
    listEl.innerHTML = st.players.map(p => {
      const isMe = p.id === st.me.id;
      const pHost = Number(p.is_host) === 1;
      return `
        <div class="player-pill ${isMe ? 'me' : ''}">
          <div class="player-pill-left">
            ${renderCellHtml(p.avatar)}
            <span>${escapeHtml(p.name)} ${isMe ? '(Tú)' : ''}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${pHost ? '<span class="badge-host">HOST</span>' : ''}
            ${isHost && !isMe ? `<button class="btn danger small" style="padding:3px 9px; font-size:0.75rem;" onclick="hostAction('kick_player',{target_id:'${p.id}'})">×</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('hostSettingsPanel').classList.toggle('hidden', !isHost);
    document.getElementById('guestLobbyWait').classList.toggle('hidden', isHost);

    if (isHost) {
      if (document.activeElement !== document.getElementById('cfgMaxRounds')) {
        document.getElementById('cfgMaxRounds').value = st.max_rounds;
      }
      if (document.activeElement !== document.getElementById('cfgFirstSec')) {
        document.getElementById('cfgFirstSec').value = st.first_turn_sec;
      }
      if (document.activeElement !== document.getElementById('cfgTurnSec')) {
        document.getElementById('cfgTurnSec').value = st.turn_sec;
      }

      if (Array.isArray(st.places)) {
        const usedCount = st.places.filter(pl => Number(pl.used) === 1).length;
        document.getElementById('placesCount').textContent = st.places.length;
        document.getElementById('usedPlacesCount').textContent = usedCount;
        document.getElementById('placesList').innerHTML = st.places.map(pl => {
          const isUsed = Number(pl.used) === 1;
          return `
            <span class="place-chip ${isUsed ? 'used' : ''}">
              <span style="${isUsed ? 'text-decoration:line-through;' : ''}">${escapeHtml(pl.name)}</span>
              ${isUsed ? `<span class="used-badge" onclick="hostAction('toggle_used_place',{place_id:${pl.id}})" title="Rehabilitar lugar">Habilitar</span>` : ''}
              <button onclick="hostAction('delete_place',{place_id:${pl.id}})" title="Eliminar lugar">×</button>
            </span>
          `;
        }).join('');
      }
    }
    return;
  }

  // EN PARTIDA
  document.getElementById('viewLobby').classList.add('hidden');
  document.getElementById('viewGame').classList.remove('hidden');

  const secretCard = document.getElementById('secretCard');
  const secretValue = document.getElementById('secretValue');
  const secretHint = document.getElementById('secretHint');

  if (isHost && tvMode && st.status !== 'game_over') {
    secretCard.classList.remove('spy-card');
    secretValue.textContent = 'LUGAR OCULTO (MODO TV)';
    secretHint.textContent = 'Cada jugador consulta el lugar o su rol desde su propio teléfono.';
  } else if (st.status === 'game_over') {
    secretCard.classList.remove('spy-card');
    secretValue.textContent = 'Lugar: ' + (st.place || '');
    secretHint.textContent = 'La partida ha concluido.';
  } else if (st.role === 'spy') {
    secretCard.classList.add('spy-card');
    secretValue.textContent = 'ERES EL ESPÍA';
    secretHint.textContent = 'Escucha las afirmaciones de los demás para deducir el lugar y di una pista creíble sin levantar sospechas.';
  } else {
    secretCard.classList.remove('spy-card');
    secretValue.textContent = st.place || '---';
    secretHint.textContent = 'Di una afirmación sobre este lugar sin revelarlo (ej. «lugar donde sueles leer»).';
  }

  const pMap = {};
  st.players.forEach(p => { pMap[p.id] = p; });

  // SUB-VISTA A: PREGUNTAS
  const isQuestioning = st.status === 'questioning';
  document.getElementById('subQuestioning').classList.toggle('hidden', !isQuestioning);
  document.getElementById('bottomBanner').classList.toggle('hidden', !isQuestioning);

  if (isQuestioning) {
    const order = st.turn_order || [];
    const idx = st.turn_index || 0;
    const currP = pMap[order[idx]] || { name: '---', avatar: 0 };
    const nextP = idx + 1 < order.length ? pMap[order[idx + 1]] : null;

    applyCellToElement(document.getElementById('currentTurnAvatar'), currP.avatar || 0);
    document.getElementById('currentTurnPlayerName').textContent = currP.name;

    const secLeft = st.seconds_left ?? 0;
    document.getElementById('timerNum').textContent = secLeft;
    document.getElementById('timerRing').classList.toggle('urgent', secLeft <= 4);
    document.getElementById('hostTurnControls').classList.toggle('hidden', !isHost);

    // Banner inferior
    applyCellToElement(document.getElementById('bannerCurrentAvatar'), currP.avatar || 0);
    document.getElementById('bannerCurrentName').textContent = `${currP.name} (${idx + 1}/${order.length})`;

    if (nextP) {
      applyCellToElement(document.getElementById('bannerNextAvatar'), nextP.avatar || 0);
      document.getElementById('bannerNextName').textContent = nextP.name;
    } else {
      const nextEl = document.getElementById('bannerNextAvatar');
      nextEl.style.background = 'var(--cell-orange)';
      nextEl.style.borderColor = 'var(--cell-orange-stroke)';
      nextEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
      document.getElementById('bannerNextName').textContent = 'Votación';
    }

    const myPos = order.indexOf(st.me.id);
    const myTurnEl = document.getElementById('bannerMyTurnStatus');
    if (myPos === idx) {
      myTurnEl.textContent = '¡Te toca decir tu afirmación!';
      myTurnEl.style.color = 'var(--cell-pink)';
    } else if (myPos > idx) {
      const diff = myPos - idx;
      myTurnEl.textContent = diff === 1 ? '¡Eres el siguiente!' : `En ${diff} turnos (#${myPos + 1})`;
      myTurnEl.style.color = 'var(--ink)';
    } else {
      myTurnEl.textContent = 'Ya participaste';
      myTurnEl.style.color = 'var(--cell-green-stroke)';
    }
  }

  // SUB-VISTA B: VOTACIÓN EN TIEMPO REAL
  const isVoting = st.status === 'voting';
  document.getElementById('subVoting').classList.toggle('hidden', !isVoting);

  if (isVoting) {
    const votedCount = (st.voted_player_ids || []).length;
    const votesMap = st.votes_map || {};
    document.getElementById('voteSubtitle').textContent =
      `Se requieren al menos ${st.majority_threshold} votos (1/3 de la sala) para revelar a un sospechoso · Votos: ${votedCount}/${st.players.length}`;

    const votersByTarget = {};
    Object.entries(votesMap).forEach(([voterId, targetId]) => {
      if (!votersByTarget[targetId]) votersByTarget[targetId] = [];
      if (pMap[voterId]) votersByTarget[targetId].push(pMap[voterId]);
    });

    const voteGrid = document.getElementById('voteGrid');
    voteGrid.innerHTML = st.players.map(p => {
      const isSelected = st.my_vote === p.id;
      const myTargetId = votesMap[p.id];
      const myTargetName = myTargetId === 'pass'
        ? 'Pasó turno'
        : (pMap[myTargetId] ? `Vota a ${pMap[myTargetId].name}` : '');
      const wasRevealedInnocent = Number(p.eliminated) === 1;
      const votersForThisPlayer = votersByTarget[p.id] || [];

      return `
        <div class="vote-card ${isSelected ? 'selected' : ''} ${wasRevealedInnocent ? 'eliminated' : ''}"
             onclick="castVote('${p.id}')">
          <div style="display:flex; justify-content:center; margin-bottom:8px;">
            ${renderCellHtml(p.avatar)}
          </div>
          <div style="font-weight:800; font-size:0.96rem; color:var(--ink);">
            ${escapeHtml(p.name)}
            ${votersForThisPlayer.length > 0 ? `<span class="vote-count-pill">${votersForThisPlayer.length}</span>` : ''}
          </div>
          <div style="font-size:0.75rem; color:var(--ink-secondary); margin-top:4px; font-weight:600;">
            ${wasRevealedInnocent ? 'Inocente confirmado' : (myTargetName ? escapeHtml(myTargetName) : 'Pensando...')}
          </div>
          ${votersForThisPlayer.length > 0 ? `
            <div style="display:flex; flex-wrap:wrap; gap:4px; justify-content:center; margin-top:8px;">
              ${votersForThisPlayer.map(v => {
                const vc = getCell(v.avatar);
                return `
                  <span class="voter-badge">
                    <span class="voter-dot" style="background:${vc.bg};"></span>
                    ${escapeHtml(v.name)}
                  </span>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    const canPass = st.current_round < st.max_rounds;
    const passWrap = document.getElementById('passVoteWrap');
    passWrap.classList.toggle('hidden', !canPass);
    if (canPass) {
      const passVoters = votersByTarget['pass'] || [];
      const btnPass = document.getElementById('btnPassVote');
      btnPass.textContent = st.my_vote === 'pass'
        ? `HAS ELEGIDO PASAR TURNO (${passVoters.length})`
        : `PASAR TURNO — AÚN NO ESTOY SEGURO (${passVoters.length})`;
      document.getElementById('passVotersList').innerHTML = passVoters.map(v => {
        const vc = getCell(v.avatar);
        return `
          <span class="voter-badge">
            <span class="voter-dot" style="background:${vc.bg};"></span>
            ${escapeHtml(v.name)} pasó
          </span>
        `;
      }).join('');
    }

    document.getElementById('hostVoteControls').classList.toggle('hidden', !isHost);
  }

  // SUB-VISTA C: RESULTADOS
  const isResult = st.status === 'round_result' || st.status === 'game_over';
  document.getElementById('subResult').classList.toggle('hidden', !isResult);

  if (isResult) {
    const ev = st.last_event || {};
    document.getElementById('resultTitle').textContent = ev.title || 'RESULTADO';
    document.getElementById('resultMessage').textContent = ev.message || '';

    const badge = document.getElementById('resultBadge');
    const losersSec = document.getElementById('losersSection');

    if (st.status === 'game_over') {
      badge.style.background = 'var(--cell-pink)';
      badge.style.borderColor = 'var(--cell-pink-stroke)';
      badge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';

      const losers = Array.isArray(ev.losers) ? ev.losers : [];
      const scoreboard = Array.isArray(ev.scoreboard) ? ev.scoreboard : [];
      losersSec.classList.remove('hidden');

      const formatPts = (n) => {
        const v = Number(n) || 0;
        return (Number.isInteger(v) ? v : v.toFixed(1)) + (Math.abs(v) === 1 ? ' pto' : ' ptos');
      };

      const loserTitle = losers.length > 1 ? 'PERDEDORES DE LA PARTIDA (SCORE MÁS BAJO)' : 'PERDEDOR DE LA PARTIDA (SCORE MÁS BAJO)';
      losersSec.innerHTML = `
        <div style="background:#fff0f4; border:2.5px solid var(--cell-pink); border-radius:16px; padding:16px; margin-bottom:14px;">
          <div style="font-family:'Ubuntu',sans-serif; font-size:0.85rem; font-weight:700; color:var(--cell-pink); letter-spacing:0.06em; text-transform:uppercase; margin-bottom:10px;">
            ${loserTitle}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center;">
            ${losers.map(l => `
              <div style="display:inline-flex; align-items:center; gap:10px; background:#ffffff; border:2px solid var(--cell-pink); border-radius:99px; padding:6px 14px 6px 8px;">
                ${renderCellHtml(l.avatar)}
                <div style="text-align:left;">
                  <div style="font-weight:800; font-size:1rem; color:var(--ink);">
                    ${escapeHtml(l.name)}
                    ${l.is_spy ? '<span class="badge-host" style="background:var(--cell-pink); margin-left:4px;">ESPÍA</span>' : ''}
                  </div>
                  <div style="font-size:0.8rem; font-weight:800; color:var(--cell-pink);">${formatPts(l.score)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ${scoreboard.length > 0 ? `
          <div style="text-align:left; background:var(--surface-subtle); border:1.5px solid var(--border); border-radius:14px; padding:12px;">
            <div style="font-size:0.76rem; font-weight:800; text-transform:uppercase; color:var(--ink-muted); letter-spacing:0.05em; margin-bottom:8px; text-align:center;">
              TABLA DE PUNTUACIÓN FINAL
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${scoreboard.map(s => `
                <div class="player-pill" style="${s.is_loser ? 'border-color:var(--cell-pink); background:#fff5f7;' : ''}">
                  <div class="player-pill-left">
                    ${renderCellHtml(s.avatar)}
                    <span>${escapeHtml(s.name)}</span>
                    ${s.is_spy ? '<span class="badge-host" style="background:var(--cell-pink);">ESPÍA</span>' : ''}
                    ${s.is_loser ? '<span class="badge-host" style="background:var(--ink);">PERDIÓ</span>' : ''}
                  </div>
                  <span class="status-pill" style="background:${s.is_loser ? 'var(--cell-pink)' : 'var(--ink)'};">${formatPts(s.score)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `;
    } else {
      losersSec.classList.add('hidden');
      losersSec.innerHTML = '';
      badge.style.background = 'var(--cell-cyan)';
      badge.style.borderColor = 'var(--cell-cyan-stroke)';
      badge.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    }

    const hostRes = document.getElementById('hostResultActions');
    hostRes.classList.toggle('hidden', !isHost);
    if (isHost) {
      document.getElementById('btnNextRound').classList.toggle('hidden', st.status !== 'round_result');
      document.getElementById('btnNewGameRandomSpy').classList.toggle('hidden', st.status !== 'game_over');
    }
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

async function pollState() {
  try {
    const res = await fetch(`api.php?action=state&player_id=${encodeURIComponent(playerId)}`);
    const data = await res.json();
    if (!data.error) renderState(data);
  } catch (e) {}
}

setInterval(pollState, 1500);
pollState();
