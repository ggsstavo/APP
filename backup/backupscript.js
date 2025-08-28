

    function getCachedUID() {
  return localStorage.getItem('uid');
}
function clearCachedUID() {
  localStorage.removeItem('uid');
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  orderBy,
  limit,
  startAfter,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- FUNÇÃO QUE ESTAVA FALTANDO ---
function createShiftRowForRecord({
  name,
  memberMatricula,
  block = "",
  vessel = "",
  shift = "",
  observations = "",
  local = "",
  customLocal = "",
  details = "",
  absent = false,
  abono = 'VERIFICAR',
  absenceReason = ''
}) {

  const div = document.createElement("div");
  div.className = "form-row";
  div.style.position = "relative";

  const uid = 's' + Math.random().toString(36).slice(2,8);
  const finalLocal = local === "Outros" && customLocal ? customLocal : local;

  if (absent) {
    div.innerHTML = `
      <input type="text" id="shiftName-${uid}" name="shiftName[]" class="shiftName" value="${escapeHtml(name)}" readonly autocomplete="off" />
      <input type="text" id="shiftMatricula-${uid}" name="shiftMatricula[]" class="shiftMatricula" value="${escapeHtml(memberMatricula)}" readonly autocomplete="off" />
      <input type="hidden" id="shiftBlock-${uid}" name="shiftBlock[]" class="shiftBlock" value="" />
      <input type="hidden" id="shiftVessel-${uid}" name="shiftVessel[]" class="shiftVessel" value="" />
      <input type="hidden" id="shiftTurno-${uid}" name="shiftTurno[]" class="shiftTurno" value="FALTA" />
      <input type="hidden" id="shiftLocal-${uid}" name="shiftLocal[]" class="shiftLocal" value="" />
      <input type="hidden" id="shiftDetails-${uid}" name="shiftDetails[]" class="shiftDetails" value="" />
      <textarea id="shiftAbsenceReason-${uid}" name="shiftAbsenceReason[]" class="shiftAbsenceReason" placeholder="Motivo da falta" rows="2" aria-label="Motivo da falta">${escapeHtml(absenceReason)}</textarea>

      <div class="abonar-wrap">
        <label class="abonar-dsr" for="shiftAbono-${uid}">Abonar DSR</label>
        <select id="shiftAbono-${uid}" name="shiftAbono[]" class="shiftAbono">
          <option value="VERIFICAR" ${abono === 'VERIFICAR' ? 'selected' : ''}>VERIFICAR</option>
          <option value="SIM" ${abono === 'SIM' ? 'selected' : ''}>SIM</option>
          <option value="NAO" ${abono === 'NAO' ? 'selected' : ''}>NÃO</option>
        </select>
      </div>
    `;
    const abWrap = div.querySelector('.abonar-wrap');
    if (abWrap) abWrap.classList.add('visible');
  } else {
    div.innerHTML = `
      <input type="text" id="shiftName-${uid}" name="shiftName[]" class="shiftName" value="${escapeHtml(name)}" readonly autocomplete="off" />
      <input type="text" id="shiftMatricula-${uid}" name="shiftMatricula[]" class="shiftMatricula" value="${escapeHtml(memberMatricula)}" readonly autocomplete="off" />
      <input type="text" id="shiftBlock-${uid}" name="shiftBlock[]" class="shiftBlock" value="${escapeHtml(block)}" placeholder="Bloco" autocomplete="off" />
      <input type="text" id="shiftVessel-${uid}" name="shiftVessel[]" class="shiftVessel" value="${escapeHtml(vessel)}" placeholder="Embarcação" autocomplete="off" />
      <select id="shiftTurno-${uid}" name="shiftTurno[]" class="shiftTurno">
        <option value="">Selecione Turno</option>
        <option value="Diurno" ${shift === "Diurno" ? "selected" : ""}>Diurno</option>
        <option value="Noturno" ${shift === "Noturno" ? "selected" : ""}>Noturno</option>
      </select>
      <input type="text" id="shiftLocal-${uid}" name="shiftLocal[]" class="shiftLocal" value="${escapeHtml(finalLocal)}" readonly autocomplete="off" />
      <input type="hidden" id="shiftDetails-${uid}" name="shiftDetails[]" class="shiftDetails" value="${escapeHtml(details)}" />
      <input type="text" id="shiftObservations-${uid}" name="shiftObservations[]" class="shiftObservations" placeholder="Observações" value="${escapeHtml(observations)}" autocomplete="off" />
    `;
  }

  return div;
}


const firebaseConfig = {
  apiKey: "AIzaSyDtnzixicBYAQkuoeB5tgCGpDLt1lByMZo",
  authDomain: "apropriacao-estrutura.firebaseapp.com",
  projectId: "apropriacao-estrutura",
  storageBucket: "apropriacao-estrutura.appspot.com",
  messagingSenderId: "155266586257",
  appId: "1:155266586257:web:6d70edc967cdbfc56e5130",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    // opcional: controla persistência entre várias abas
    tabManager: persistentMultipleTabManager()
  })
});
let currentUser = null;
let editingTeamId = null;

const TEAMS_CACHE_KEY = 'teams_cache_v1'; // se mudar structure, incremente a versão
const TEAMS_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas (ajuste se quiser)

const teamsCache = new Map();

function normalizeTeam(raw = {}) {
  return {
    name: raw.name || '',
    shift: raw.shift || '',
    ownerUid: raw.ownerUid || '',
    members: (raw.members || []).map(m => ({
      name: m.name || '',
      matricula: m.matricula || '',
      block: m.block || '',
      vessel: m.vessel || '',
      local: m.local || '',
      customLocal: m.customLocal || '',
      details: m.details || '',
      // novos campos para falta/abono:
      absent: !!m.absent, // true se marcado como falta
      abono: m.abono || 'VERIFICAR', // VERIFICAR|SIM|NÃO
      absenceReason: m.absenceReason || '' // texto explicativo da falta
    }))
  };
}

// Converte Map -> objeto serializável e grava no localStorage com timestamp
function serializeTeamsCache() {
  const entries = [];
  teamsCache.forEach((value, key) => {
    // constrói um objeto "plain" apenas com campos primitivos
    const safeValue = {
      name: value.name || '',
      shift: value.shift || '',
      ownerUid: value.ownerUid || '',
      members: (value.members || []).map(m => ({
  name: m.name || '',
  matricula: m.matricula || '',
  block: m.block || '',
  vessel: m.vessel || '',
  local: m.local || '',
  customLocal: m.customLocal || '',
  details: m.details || '',
  absent: !!m.absent,
  abono: m.abono || 'VERIFICAR',
  absenceReason: m.absenceReason || ''
}))

    };
    entries.push([key, safeValue]);
  });
  const payload = { ts: Date.now(), entries };
  try {
  localStorage.setItem(TEAMS_CACHE_KEY, JSON.stringify(payload));
} catch (err) {
  console.warn('Falha ao gravar teams cache no localStorage', err);
  // opcional: fallback — não fazemos nada, cache apenas em memória
}
}

function loadTeamsCacheFromLocalStorage() {
  try {
    const raw = localStorage.getItem(TEAMS_CACHE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (!payload || !payload.ts || !payload.entries) return false;
    if (Date.now() - payload.ts > TEAMS_CACHE_TTL_MS) {
      localStorage.removeItem(TEAMS_CACHE_KEY);
      return false;
    }
    teamsCache.clear();
    for (const [id, data] of payload.entries) teamsCache.set(id, data);
    return true;
  } catch (e) {
    console.warn('Erro ao ler teamsCache do localStorage', e);
    return false;
  }
}

function clearTeamsCacheLocalStorage() {
  try {
    localStorage.removeItem(TEAMS_CACHE_KEY);
  } catch (e) {
    console.warn('Erro ao limpar teams cache', e);
  }
}



// Reconstrói visualmente os selects a partir do teamsCache (use ao atualizar cache)
function rebuildTeamSelectsFromCache() {
  const teamSelect = document.getElementById("teamSelect");
  const teamSelectManage = document.getElementById("teamSelectManage");
  if (!teamSelect || !teamSelectManage) return;

  teamSelect.innerHTML = ''; // limpa
  teamSelectManage.innerHTML = '';

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Selecione uma equipe';
  teamSelect.appendChild(defaultOpt);

  const defaultOpt2 = document.createElement('option');
  defaultOpt2.value = '';
  defaultOpt2.textContent = '-- Nenhuma selecionada --';
  teamSelectManage.appendChild(defaultOpt2);

  const frag1 = document.createDocumentFragment();
  const frag2 = document.createDocumentFragment();

  teamsCache.forEach((data, id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = data.name || id;
    frag1.appendChild(opt);

    const opt2 = opt.cloneNode(true);
    frag2.appendChild(opt2);
  });

  teamSelect.appendChild(frag1);
  teamSelectManage.appendChild(frag2);
}

async function loadTeamsOnce() {
  // tenta carregar do localStorage primeiro (rápido, sem leitura Firestore)
  const loadedFromLocal = loadTeamsCacheFromLocalStorage();
  if (loadedFromLocal) {
    rebuildTeamSelectsFromCache();
    return;
  }

  // senão, lê do Firestore e popula cache/localStorage
  try {
    const q = query(
  collection(db, "teams"),
  where("ownerUid", "==", currentUser.uid),
  where("deleted", "==", false));
    const snap = await getDocs(q);

    teamsCache.clear();
snap.forEach(docSnap => {
  const d = docSnap.data() || {};
  teamsCache.set(docSnap.id, normalizeTeam(d));
});

    // salva para uso futuro e atualiza UI
    serializeTeamsCache();
    rebuildTeamSelectsFromCache();
  } catch (e) {
    console.error('Erro ao carregar teams do Firestore', e);
    // relança se quiser que o caller (onAuthStateChanged) entre no catch
    throw e;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const cachedUid = getCachedUID();

  // Se não tiver UID em cache, força o login
  if (!cachedUid) {
    clearCachedUID();
    window.location.href = './index.html';
    return;
  }

  // Se tiver, só confirme com o Firebase que continua autenticado
  onAuthStateChanged(auth, async (user) => {
  if (user && user.uid === cachedUid) {
    currentUser = user;
    setDateToday();
    try {
            // loadTeamsOnce permanece (usa cache local antes de ler Firestore)
            await loadTeamsOnce();
            // NOTA: removi o carregamento automático de registros aqui para só carregar ao clicar no botão
            // await loadRecords(true); -- deixe por clique do usuário
          } catch (e) {
            console.error(e);
            showNotification('Erro ao carregar dados iniciais.', 'error');
          }
        } else {
          localStorage.removeItem('uid');
          window.location.href = './index.html';
        }
      });
});

function setDateToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById("dateInput").value = `${yyyy}-${mm}-${dd}`;
}

document.getElementById("teamSelect").addEventListener("change", function () {
  const teamId = this.value;
  const shiftsContainer = document.getElementById("shiftsContainer");
  shiftsContainer.innerHTML = ""; // limpa de uma vez
  if (!teamId) return;

  const teamData = teamsCache.get(teamId);
  if (!teamData || !teamData.members || teamData.members.length === 0) return;

  const turnoPadrao = teamData.shift || "";

  // usa DocumentFragment para inserir todas as linhas de uma vez
  const frag = document.createDocumentFragment();
  for (const member of teamData.members) {
    const row = createShiftRowForRecord({
  name: member.name,
  memberMatricula: member.matricula,
  block: member.block || "",
  vessel: member.vessel || "",
  shift: turnoPadrao,
  observations: "",
  local: member.local || "",
  customLocal: member.customLocal || "",
  details: member.details || "",
  absent: !!member.absent,
  abono: member.abono || 'VERIFICAR',
  absenceReason: member.absenceReason || ''
});
    frag.appendChild(row);
  }
  shiftsContainer.appendChild(frag);
});


function createMemberRow(member = { name: "", matricula: "", block: "", vessel: "", local: "", customLocal: "", details: "", absent: false, abono: 'VERIFICAR', absenceReason: '' }) {
  const div = document.createElement("div");
  div.className = "form-row";
  div.style.position = "relative";

  const uid = 'm' + Math.random().toString(36).slice(2,8);

  div.innerHTML = `
    <input type="text" id="memberName-${uid}" name="memberName[]" class="memberName" placeholder="Nome" value="${escapeHtml(member.name)}" autocomplete="off" />
    <input type="text" id="memberMatricula-${uid}" name="memberMatricula[]" class="memberMatricula" placeholder="Matrícula" value="${escapeHtml(member.matricula)}" autocomplete="off" />

    <input type="text" id="memberBlock-${uid}" name="memberBlock[]" class="memberBlock" placeholder="Bloco" value="${escapeHtml(member.block)}" autocomplete="off" />
    <input type="text" id="memberVessel-${uid}" name="memberVessel[]" class="memberVessel" placeholder="Embarcação" value="${escapeHtml(member.vessel)}" autocomplete="off" />
    <select id="memberLocalSelect-${uid}" name="memberLocal[]" class="memberLocalSelect">
      <option value="">Selecione Local</option>
      <option value="Montagem" ${member.local === "Montagem" ? "selected" : ""}>Montagem</option>
      <option value="Sub Montagem" ${member.local === "Sub Montagem" ? "selected" : ""}>Sub Montagem</option>
      <option value="Edificação" ${member.local === "Edificação" ? "selected" : ""}>Edificação</option>
      <option value="Outros" ${member.local === "Outros" ? "selected" : ""}>Outros</option>
    </select>
    <input type="text" id="memberCustomLocalInput-${uid}" name="memberCustomLocal[]" class="memberCustomLocalInput" placeholder="Informe outro local" value="${escapeHtml(member.customLocal || '')}" style="display: none; margin-left: 5px; flex: 1;" autocomplete="off" />
    <input type="text" id="memberDetailsInput-${uid}" name="memberDetails[]" class="memberDetailsInput" placeholder="Detalhes (Perfilado, Barras, Anteparas)" value="${escapeHtml(member.details || '')}" autocomplete="off" />

    <input type="text" id="memberAbsenceReasonInput-${uid}" name="memberAbsenceReason[]" class="memberAbsenceReasonInput" placeholder="Motivo da falta / Observações" value="${escapeHtml(member.absenceReason || '')}" style="display:none; flex: 1;" autocomplete="off" />
    <div class="abonar-wrap">
      <label class="abonar-dsr" for="memberAbono-${uid}">Abonar DSR</label>
      <select id="memberAbono-${uid}" name="memberAbono[]" class="memberAbonoSelect">
        <option value="VERIFICAR" ${member.abono === 'VERIFICAR' ? 'selected' : ''}>VERIFICAR</option>
        <option value="SIM" ${member.abono === 'SIM' ? 'selected' : ''}>SIM</option>
        <option value="NAO" ${member.abono === 'NAO' ? 'selected' : ''}>NÃO</option>
      </select>
    </div>

    <label class="absentLabel" style="margin-left:8px;">
      <input type="checkbox" id="memberAbsentCheckbox-${uid}" name="memberAbsent[]" class="memberAbsentCheckbox" ${member.absent ? 'checked' : ''}/> Falta
    </label>

    <button class="btn removeMemberBtn" type="button"><i class="fas fa-trash" style="margin-left: 5px;"></i></button>
  `;

  const localSelect = div.querySelector(".memberLocalSelect");
  const customLocalInput = div.querySelector(".memberCustomLocalInput");
  const absentCheckbox = div.querySelector(".memberAbsentCheckbox");
  const absenceReasonInput = div.querySelector(".memberAbsenceReasonInput");
  const abonoSelect = div.querySelector(".memberAbonoSelect");
  const detailsInput = div.querySelector(".memberDetailsInput");
  const abonoWrap = div.querySelector(".abonar-wrap");

  function toggleCustomLocal() {
    if (localSelect.value === "Outros") {
      customLocalInput.style.display = "block";
    } else {
      customLocalInput.style.display = "none";
      customLocalInput.value = "";
    }
  }

  function toggleAbsentMode() {
    const isAbsent = absentCheckbox.checked;
    const toToggle = [div.querySelector(".memberBlock"), div.querySelector(".memberVessel"), localSelect, customLocalInput, detailsInput];

    if (isAbsent) {
      toToggle.forEach(el => { if (el) el.style.display = "none"; });
      absenceReasonInput.style.display = "block";
      if (abonoWrap) abonoWrap.classList.add("visible");
      if (member.abono && abonoSelect) abonoSelect.value = member.abono;
      setTimeout(() => { absenceReasonInput.focus(); }, 50);
    } else {
      toToggle.forEach(el => { if (el) el.style.display = ""; });
      absenceReasonInput.style.display = "none";
      if (abonoWrap) abonoWrap.classList.remove("visible");
      if (abonoSelect) abonoSelect.value = "VERIFICAR";
    }
  }

  localSelect.addEventListener("change", toggleCustomLocal);
  absentCheckbox.addEventListener("change", toggleAbsentMode);

  // inicializa
  toggleCustomLocal();
  if (member.absent) toggleAbsentMode();

  div.querySelector(".removeMemberBtn").onclick = () => div.remove();
  return div;
}

const membersContainer = document.getElementById("membersContainer");
const addMemberBtn = document.getElementById("addMemberBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

addMemberBtn.addEventListener("click", () => {
  membersContainer.appendChild(createMemberRow());
});

const saveTeamBtn = document.getElementById("saveTeamBtn");
saveTeamBtn.addEventListener("click", saveTeam);

async function saveTeam() {
  const name = document.getElementById("teamName").value.trim();
  if (!name) {
    showNotification("Por favor, informe o nome da equipe para continuar.", "info");
    return;
  }

  const shiftRadio = document.querySelector('input[name="teamShift"]:checked');
  const shift = shiftRadio ? shiftRadio.value : "Diurno";

  const members = [];
  const memberRows = membersContainer.querySelectorAll(".form-row");
  for (const row of memberRows) {
  const nameInput = row.querySelector(".memberName");
  const matriculaInput = row.querySelector(".memberMatricula");
  const blockInput = row.querySelector(".memberBlock");
  const vesselInput = row.querySelector(".memberVessel");
  if (!nameInput.value.trim() || !matriculaInput.value.trim()) {
    showNotification("Todos os membros devem ter nome e matrícula preenchidos.", "warning");
    return;
  }

  const detailsInput = row.querySelector(".memberDetailsInput");
  const isAbsent = !!row.querySelector(".memberAbsentCheckbox")?.checked;

  // Validação de campo obrigatório: só exige 'Detalhes' quando o membro NÃO está ausente
  if (!isAbsent && !detailsInput.value.trim()) {
    showNotification("O campo Detalhes é obrigatório para membros presentes.", "warning");
    return;
  }

  members.push({
    name: nameInput.value.trim(),
    matricula: matriculaInput.value.trim(),
    block: blockInput.value.trim(),
    vessel: vesselInput.value.trim(),
    local: row.querySelector(".memberLocalSelect").value,
    customLocal: row.querySelector(".memberCustomLocalInput").value.trim(),
    details: detailsInput.value.trim(),
    absent: isAbsent,
    abono: (row.querySelector(".memberAbonoSelect")?.value) || 'VERIFICAR',
    absenceReason: (row.querySelector(".memberAbsenceReasonInput")?.value || '').trim()
  });
  }
  if (members.length === 0) {
    showNotification("Adicione pelo menos um membro na equipe.", "warning");
    return;
  }

  const teamData = {
    name,
    shift,
    members,
    ownerUid: currentUser.uid,
    deleted: false,
  };

    try {
    if (editingTeamId) {
  await setDoc(doc(db, "teams", editingTeamId), teamData);
  teamsCache.set(editingTeamId, normalizeTeam(teamData));
} else {
  const ref = await addDoc(collection(db, "teams"), teamData);
  teamsCache.set(ref.id, normalizeTeam(teamData));
}

    // persiste cache e atualiza selects
    serializeTeamsCache();
    rebuildTeamSelectsFromCache();

    editingTeamId = null;
    document.getElementById("cancelEditBtn").style.display = "none";
    saveTeamBtn.textContent = "Salvar Equipe";

    showNotification("Equipe salva com sucesso!", "success");
    clearTeamForm();
  } catch (e) {
    console.error(e);
    showNotification("Erro ao salvar equipe.", "error");
  }
}

function clearTeamForm() {
  document.getElementById("teamName").value = "";
  document.querySelector('input[name="teamShift"][value="Diurno"]').checked = true;
  membersContainer.innerHTML = "";
}

cancelEditBtn.addEventListener("click", () => {
  clearTeamForm();
  editingTeamId = null;
  cancelEditBtn.style.display = "none";
  saveTeamBtn.textContent = "Salvar Equipe";
});

const submitRecordBtn = document.getElementById("submitRecordBtn");
submitRecordBtn.addEventListener("click", sendRecord);

async function sendRecord() {
  const teamSelect = document.getElementById("teamSelect");
  const teamId = teamSelect.value;
  const teamName = teamSelect.options[teamSelect.selectedIndex].text;

  // Validações básicas primeiro
  const dateStr = document.getElementById("dateInput").value;
  const galpao = document.getElementById("galpaoSelect").value;
  if (!dateStr || !galpao || !teamId) {
    showNotification("Preencha todos os campos para enviar a apropriação.", "warning");
    return;
  }

  // ------------- USE O CACHE PRIMEIRO (evita leituras no Firestore) -------------
  let teamData = teamsCache.get(teamId);

  // Se não houver no cache, busca do Firestore só nessa situação
  // substituição: tenta recarregar cache inteiro antes de getDoc isolado
if (!teamData) {
  try {
    // recarrega todos os times do Firestore em 1 única consulta
    await loadTeamsOnce(); // já popula teamsCache
    teamData = teamsCache.get(teamId);
    if (!teamData) {
      showNotification("Equipe selecionada não encontrada.", "warning");
      return;
    }
  } catch (e) {
    console.error("Erro ao recarregar equipes:", e);
    showNotification("Erro ao acessar os dados da equipe.", "error");
    return;
  }
}
  // -----------------------------------------------------------------------------

  // A partir daqui, teamData está garantido (vindo do cache ou Firestore)
  const shiftsContainer = document.getElementById("shiftsContainer");
  const shiftRows = shiftsContainer.querySelectorAll(".form-row");
  if (shiftRows.length === 0) {
    showNotification("Selecione uma equipe com membros para apropriar.", "warning");
    return;
  }

  const records = [];
  for (const row of shiftRows) {
  const name = row.querySelector(".shiftName").value.trim();
  const memberMatricula = row.querySelector(".shiftMatricula").value.trim();

  // determina membro original (para locais que vieram do teamData)
  const memberOriginal = teamData.members.find(
    m => m.name === name && m.matricula === memberMatricula
  );

  // detecta ausência: presença do select de abono na linha (ou turno explicitamente "FALTA")
  const hasAbonoSelect = !!row.querySelector(".shiftAbono");
  const turnoValue = row.querySelector(".shiftTurno")?.value || "";
  const isAbsent = hasAbonoSelect || turnoValue === 'FALTA';

  // Motivo da falta / abono
  const absenceReason = row.querySelector(".shiftAbsenceReason")?.value?.trim() || "";
  const abono = row.querySelector(".shiftAbono")?.value || 'VERIFICAR';

  // Se for ausência, ZERA explicitamente os campos que não devem ir pro Firestore
  let vesselShift = "";
  let blockShift  = "";
  let details     = "";
  let local       = "";

  if (!isAbsent) {
    // só ler valores visíveis/úteis quando NÃO for falta
    vesselShift = row.querySelector(".shiftVessel")?.value?.trim() || "";
    blockShift  = row.querySelector(".shiftBlock")?.value?.trim() || "";
    details     = row.querySelector(".shiftDetails")?.value?.trim() || "";

    // tenta ler input de local (quando houver), senão usa dados originais do membro
    const localInput = row.querySelector(".shiftLocal");
    if (localInput && localInput.value != null) {
      local = localInput.value.trim() || "";
    } else {
      local = (memberOriginal?.local === "Outros")
        ? (memberOriginal?.customLocal || "")
        : (memberOriginal?.local || "");
    }
  } else {
    // isAbsent === true -> garante que tudo relacionado a local/bloco/embarcação/detalhes vá vazio
    vesselShift = "";
    blockShift  = "";
    details     = "";
    local       = "";
  }

  // Se não for ausência, exige turno
  if (!isAbsent && ! (row.querySelector(".shiftTurno")?.value) ) {
    showNotification(`Preencha o turno do membro: ${name}`);
    return;
  }

  records.push({
    date: Timestamp.fromDate(new Date(document.getElementById('dateInput').value)),
    galpao,
    teamId,
    teamName,
    userId: currentUser.uid,
    userName: currentUser.displayName || currentUser.email,
    name,
    memberMatricula,
    vesselShift,
    blockShift,
    shift: isAbsent ? 'FALTA' : (row.querySelector(".shiftTurno")?.value || ""),
    observations: row.querySelector(".shiftObservations")?.value?.trim() || "",
    local,
    details,
    absent: isAbsent,
    absenceReason,
    abono,
    createdBy: currentUser.uid,
  });
}

  try {
  const BATCH_LIMIT = 400;
  let batch = writeBatch(db);
  let ops = 0;

  for (const rec of records) {
    // obtém a data do input (YYYY-MM-DD) e converte para DD-MM-YYYY para o ID
const dateInputVal = document.getElementById('dateInput').value; // 'YYYY-MM-DD'
let dateStrForId;
if (dateInputVal) {
  const [yyyy, mm, dd] = dateInputVal.split('-');
  dateStrForId = `${dd}-${mm}-${yyyy}`;
} else {
  const now = new Date();
  dateStrForId = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
}
const safeName = rec.name.replace(/[/\\#.%$[\]]/g, "-");
const docId = `${safeName}, ${rec.memberMatricula} - ${dateStrForId}`;

    batch.set(doc(db, "records", docId), rec);
    ops++;

    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  showNotification("Apropriações enviadas com sucesso!", "success");
    document.getElementById("galpaoSelect").selectedIndex = 0;
    document.getElementById("teamSelect").selectedIndex = 0;
    document.getElementById("shiftsContainer").innerHTML = "";
    loadRecords();
  } catch (e) {
    console.error(e);
    showNotification("Erro ao enviar apropriações.", "error");
  }
}

let lastVisibleRecord = null;
    let isFetchingRecords = false;
    let recordsCache = []; // acumula os documentos já carregados (opcional)
    let recordsInitialized = false; // só será true após o primeiro clique do botão
    let noMoreRecords = false; // quando não houver mais docs no servidor

    const LOAD_BATCH_SIZE = 5;

function appendRecordsToTable(newDocs) {
      const tbody = document.querySelector("#recordsTable tbody");
      if (!tbody) return;
      const fragment = document.createDocumentFragment();

      for (const r of newDocs) {
        const date = r.date?.toDate?.() || new Date();
        const dateStr = date.toLocaleString("pt-BR", {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        const galp = (r.galpao || "").replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const team = (r.teamName || r.teamId || "").replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const user = (r.userName || "").replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${dateStr}</td><td>${galp}</td><td>${team}</td><td>${user}</td>`;
        fragment.appendChild(tr);
      }

      tbody.appendChild(fragment);
    }

    // Limpa tabela e cache (usado quando fazemos a carga inicial/reset)
    function clearRecordsTable() {
      const tbody = document.querySelector("#recordsTable tbody");
      if (tbody) tbody.innerHTML = '';
      recordsCache = [];
      lastVisibleRecord = null;
      noMoreRecords = false;
    }

    // Função principal para carregar registros (reset=true para carga inicial)
    async function loadRecords(reset = false) {
      if (isFetchingRecords) return;
      if (noMoreRecords && !reset) return; // nada mais a buscar

      isFetchingRecords = true;
      const loadBtn = document.getElementById('loadRecordsBtn');
      const statusSpan = document.getElementById('recordsStatus');
      if (loadBtn) {
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
      }
      if (statusSpan) statusSpan.textContent = '';

      try {
        // reset solicita limpar cache e forçar início (primeiro clique)
        if (reset) {
          clearRecordsTable();
          recordsInitialized = true;
        }

        // montar query base
        let q = query(
          collection(db, "records"),
          where("createdBy", "==", currentUser.uid),
          orderBy("date", "desc"),
          limit(LOAD_BATCH_SIZE)
        );

        if (!reset && lastVisibleRecord) {
          q = query(q, startAfter(lastVisibleRecord));
        }

        const snap = await getDocs(q);

        if (!snap.empty) {
          // atualiza lastVisibleRecord para paginação
          lastVisibleRecord = snap.docs[snap.docs.length - 1];

          // transforma em array de dados
          const newDocs = [];
          snap.forEach(docSnap => newDocs.push(docSnap.data()));

          // apenda na tabela
          appendRecordsToTable(newDocs);

          // atualiza cache local (se desejar reaproveitar em outras ações)
          recordsCache = recordsCache.concat(newDocs);

          // Se trouxe menos que o batch -> provavelmente acabou
          if (snap.size < LOAD_BATCH_SIZE) {
            noMoreRecords = true;
            const status = document.getElementById('recordsStatus');
            if (status) status.textContent = 'Todos os registros foram carregados.';
          }
        } else {
          // query vazia: não há registros (ex: usuário novo)
          noMoreRecords = true;
          if (reset) {
            const status = document.getElementById('recordsStatus');
            if (status) status.textContent = 'Nenhum registro encontrado.';
          }
        }
      } catch (e) {
        console.error('Erro ao carregar records', e);
        showNotification('Erro ao carregar registros recentes.', 'error');
      } finally {
        isFetchingRecords = false;
        if (loadBtn) {
          loadBtn.disabled = noMoreRecords; // desabilita se não houver mais
          if (!noMoreRecords) loadBtn.style.display = 'none'; // após a carga inicial, escondemos o botão e deixamos o scroll carregar o resto
          else loadBtn.innerHTML = '<i class="fas fa-check"></i> Carregado';
        }
      }
    }

    // Scroll listener: só ativa depois que o usuário iniciou a carga (recordsInitialized)
    const tableWrapper = document.getElementById("recordsTableWrapper");
    let scrollTimeout;
    tableWrapper.addEventListener("scroll", () => {
      if (!recordsInitialized || noMoreRecords) return;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (tableWrapper.scrollTop + tableWrapper.clientHeight >= tableWrapper.scrollHeight - 50) {
          loadRecords(false); // próximo lote
        }
      }, 120);
    });

    // Botão de carregar registros (aperta 1 vez p/ carregar primeiros 5)
    const loadRecordsBtn = document.getElementById('loadRecordsBtn');
    loadRecordsBtn.addEventListener('click', async () => {
      // se já iniciou, ignora — mas nesse fluxo, só pode iniciar uma vez
      if (recordsInitialized) return;
      await loadRecords(true); // reset = true -> carrega primeiros 5
      // após carregar, deixamos o botão escondido (a menos que nãoMoreRecords === true)
      // (essa lógica já definida no finally de loadRecords)
    });

// Menu hamburger
const toggleMenuBtn = document.getElementById("toggleMenu");
const menuList = document.getElementById("menuList");

toggleMenuBtn.addEventListener("click", () => {
  menuList.classList.toggle("active");
});

const icons = {
  success: '<i class="fas fa-check-circle" style="color:#28a745;"></i>',
  error: '<i class="fas fa-times-circle" style="color:#dc3545;"></i>',
  warning: '<i class="fas fa-exclamation-triangle" style="color:#ffc107;"></i>',
  info: '<i class="fas fa-info-circle" style="color:#2196f3;"></i>',
};

// Substitui alert() por notificação elegante
function showNotification(message, type = "info") {
  const modal = document.getElementById("notificationModal");
  const msg = document.getElementById("notificationMessage");
  const okBtn = document.getElementById("notificationOkBtn");

  msg.innerHTML = icons[type] + '<span>' + message + '</span>';

  modal.style.display = "flex";

  okBtn.focus();

  okBtn.onclick = () => {
    modal.style.display = "none";
  };
}

const modal = document.getElementById("notificationModal");
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("notificationModal");
    if (modal.style.display === "flex") {
      modal.style.display = "none";
    }
  }
});

const teamSelectManage = document.getElementById("teamSelectManage");
const editTeamBtn      = document.getElementById("editTeamBtn");

// Ao clicar em editar, só preenche os campos — o form já está visível
editTeamBtn.addEventListener("click", async () => {
  const teamId = teamSelectManage.value;

  if (!teamId) {
    showNotification("Selecione uma equipe para editar.", "warning");
    return;
  }

  let teamData = teamsCache.get(teamId);
// substituição: tenta recarregar cache inteiro antes de getDoc isolado
if (!teamData) {
  try {
    // recarrega todos os times do Firestore em 1 única consulta
    await loadTeamsOnce(); // já popula teamsCache
    teamData = teamsCache.get(teamId);
    if (!teamData) {
      showNotification("Equipe selecionada não encontrada.", "warning");
      return;
    }
  } catch (e) {
    console.error("Erro ao recarregar equipes:", e);
    showNotification("Erro ao acessar os dados da equipe.", "error");
    return;
  }
}

  // agora preenche o formulário com teamData (sempre definido aqui)
  document.getElementById("teamName").value = teamData.name || "";
  const radio = document.querySelector(`input[name="teamShift"][value="${teamData.shift}"]`);
  if (radio) radio.checked = true;

  membersContainer.innerHTML = "";
  (teamData.members || []).forEach(m => membersContainer.appendChild(createMemberRow(m)));

  editingTeamId = teamId;
  saveTeamBtn.innerHTML = '<i class="fas fa-rotate"></i>Atualizar Equipe';
  cancelEditBtn.style.display = "inline-block";
});

const deleteTeamBtn   = document.getElementById("deleteTeamBtn");
const confirmModal    = document.getElementById("confirmModal");
const confirmMessage  = document.getElementById("confirmMessage");
const confirmYesBtn   = document.getElementById("confirmYesBtn");
const confirmNoBtn    = document.getElementById("confirmNoBtn");

// Ação ao clicar em Excluir
deleteTeamBtn.addEventListener("click", () => {
  const teamId   = teamSelectManage.value;
  const teamName = teamSelectManage.options[teamSelectManage.selectedIndex].text;
  
  if (!teamId) {
    showNotification("Selecione uma equipe para excluir.", "warning");
    return;
  }
  
  // Prepara mensagem e exibe modal de confirmação
  confirmMessage.textContent = `Deseja apagar a equipe "${teamName}"? Essa alteração não pode ser revertida.`;
  confirmModal.style.display   = "flex";
});

// Se clicar em NÃO, fecha o modal
confirmNoBtn.addEventListener("click", () => {
  confirmModal.style.display = "none";
});

// --- deleteRecordsByTeamInBatches: exclui records em lotes seguros ---
async function deleteRecordsByTeamInBatches(teamId) {
  const BATCH_SIZE = 400; // seguro < 500 (limite do writeBatch)
  const recordsRef = collection(db, "records");

  while (true) {
    const q = query(recordsRef, where("teamId", "==", teamId), limit(BATCH_SIZE));
    const snap = await getDocs(q);
    if (snap.empty) break;

    const wb = writeBatch(db); // usa writeBatch importado no topo do módulo
    snap.docs.forEach(docSnap => {
      wb.delete(doc(db, "records", docSnap.id));
    });

    await wb.commit();

    // se trouxe menos que o tamanho do lote, terminou
    if (snap.size < BATCH_SIZE) break;
    // caso contrário, loop continua (os docs deletados não aparecem mais)
  }
}

// Se clicar em SIM, procede à exclusão
confirmYesBtn.addEventListener("click", async () => {
  const teamId = teamSelectManage.value;

  if (!teamId) {
    showNotification("Selecione uma equipe para excluir.", "warning");
    return;
  }

  try {
    // marca o documento como deletado (merge para não sobrescrever os campos)
    await setDoc(doc(db, "teams", teamId), {
      deleted: true,
      deletedAt: Timestamp.now(),
      deletedBy: currentUser.uid
    }, { merge: true });

    // atualiza cache local e interface
    teamsCache.delete(teamId); // opcional: se quiser remover imediatamente
    serializeTeamsCache();
    rebuildTeamSelectsFromCache();

    confirmModal.style.display = "none";
    clearTeamForm();
    showNotification("Equipe marcada como apagada com sucesso!", "success");

  } catch (e) {
    console.error(e);
    confirmModal.style.display = "none";
    showNotification("Erro ao marcar equipe como apagada.", "error");
  }
});

(function(){
    if (localStorage.getItem('dark') === '1') {
      document.documentElement.classList.add('dark');
    }
  })();
  window.addEventListener('storage', e => {
    if (e.key === 'dark') {
      document.documentElement.classList.toggle('dark', e.newValue === '1');
    }
  });
