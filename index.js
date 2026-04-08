// Importar Firebase (Você precisará configurar as chaves do seu console Firebase aqui)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    // COLE SUAS CHAVES DO FIREBASE AQUI
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- LOGICA DE DATAS ---
const agora = new Date();
const diaHoje = agora.getDate();
const mesAtual = agora.getMonth();
const anoAtual = agora.getFullYear();
const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

// Gerar cabeçalho apenas dos dias de HOJE em diante
const headerRow = document.getElementById('header-row');
for (let i = 1; i <= diasNoMes; i++) {
    if (i < diaHoje) continue; // Pula dias que já passaram

    const th = document.createElement('th');
    th.innerText = i;
    if (i === diaHoje) th.style.background = "#fef3c7";
    headerRow.appendChild(th);
}

// --- GRÁFICO ---
const ctx = document.getElementById('progressChart').getContext('2d');
let progressChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
        datasets: [{
            data: [0, 100],
            backgroundColor: ['#3b82f6', '#f1f5f9'],
            borderWidth: 0
        }]
    },
    options: { cutout: '75%' }
});

// --- FUNÇÕES DE USUÁRIO ---
window.adicionarHabito = async () => {
    const nome = document.getElementById('habitInput').value;
    if(!nome) return;

    const habitGrid = document.getElementById('habit-grid');
    const tr = document.createElement('tr');
    
    let html = `<td class="sticky-col">${nome}</td>`;
    for (let i = 1; i <= diasNoMes; i++) {
        if (i < diaHoje) continue; // Não mostra checkbox para o passado
        html += `<td><input type="checkbox" class="habit-check"></td>`;
    }
    
    tr.innerHTML = html;
    habitGrid.appendChild(tr);
    document.getElementById('habitInput').value = "";
    atualizarProgresso();
};

function atualizarProgresso() {
    const checks = document.querySelectorAll('.habit-check');
    const marcados = Array.from(checks).filter(c => c.checked).length;
    const porcento = checks.length > 0 ? Math.round((marcados / checks.length) * 100) : 0;

    progressChart.data.datasets[0].data = [porcento, 100 - porcento];
    progressChart.update();
    document.getElementById('percentage-label').innerText = `${porcento}%`;
}

// Escutador de progresso
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('habit-check')) atualizarProgresso();
});

// --- MONITOR DE LOGIN ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('user-email').innerText = user.email;
        // Aqui você chamaria uma função para carregar os dados do Firestore
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});