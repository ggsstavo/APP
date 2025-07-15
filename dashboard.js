// dashboard.js

// Inicializar Firestore
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);

// Elementos DOM
const totalHorasEl = document.getElementById('total-horas');
const vesselsActiveEl = document.getElementById('vessels-active');
const colabActiveEl = document.getElementById('colab-active');
const topColabBody = document.getElementById('top-colab');

let inspecoesChart, tipoEPIChart; // Renomeados para appropriation context

// Função para carregar métricas
async function loadMetrics() {
  const snaps = await db.collection('apontamentos').get();
  let totalHoras = 0;
  const vesselsSet = new Set();
  const colabSet = new Set();
  const horasPorVessel = {};
  const horasPorDia = {};
  const horasPorColab = {};

  snaps.forEach(doc => {
    const data = doc.data();
    totalHoras += data.horas;
    vesselsSet.add(data.emb);
    colabSet.add(data.matricula);
    horasPorVessel[data.emb] = (horasPorVessel[data.emb] || 0) + data.horas;
    const dia = data.timestamp.toDate().toLocaleDateString();
    horasPorDia[dia] = (horasPorDia[dia] || 0) + data.horas;
    horasPorColab[data.nome] = (horasPorColab[data.nome] || 0) + data.horas;
  });

  totalHorasEl.textContent = totalHoras + 'h';
  vesselsActiveEl.textContent = vesselsSet.size;
  colabActiveEl.textContent = colabSet.size;

  renderChart('horasPorVessel', Object.keys(horasPorVessel), Object.values(horasPorVessel), 'bar');
  renderChart('horasSemanais', Object.keys(horasPorDia), Object.values(horasPorDia), 'line');

  // Top 3 colaboradores
  const sortedColabs = Object.entries(horasPorColab)
    .sort((a,b) => b[1] - a[1])
    .slice(0,3);
  sortedColabs.forEach(([nome, horas]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${nome}</td><td>${horas}h</td>`;
    topColabBody.appendChild(tr);
  });
}

function renderChart(canvasId, labels, data, type) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  new Chart(ctx, {
    type: type,
    data: { labels: labels, datasets: [{ data: data, backgroundColor: '#2c3e50' }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// Carregar métricas ao iniciar
window.addEventListener('DOMContentLoaded', loadMetrics);
