import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, onSnapshot, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDf8zO40aWn8r3eyibyOuLz4FMXXaDdkk4",
    authDomain: "dotasks-8038b.firebaseapp.com",
    projectId: "dotasks-8038b",
    storageBucket: "dotasks-8038b.firebasestorage.app",
    messagingSenderId: "14585516549",
    appId: "1:14585516549:web:38f2ffaf2eced575c8426c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let habits = [];
let selectedHabits = new Set();
let modoExcluir = false;
let diaInicio = 1;
let pChart; // Pizza (Mensal)
let bChart; // Barras (Diário)

// --- LOGIN ---
window.loginGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert("Erro ao logar: " + error.message);
    }
};

// --- NAVEGAÇÃO ---
window.navegarDias = (dir) => {
    const novo = diaInicio + (dir * 21);
    if (novo >= 1 && novo <= 345) {
        diaInicio = novo;
        renderTabela();
    }
};

// --- AÇÕES DE HÁBITOS ---
window.toggleCheck = async (habNome, dia, status) => {
    if (modoExcluir) return;
    const ref = doc(db, "users", auth.currentUser.uid, "habits", habNome);
    await updateDoc(ref, { [`checks.${dia}`]: !status });
};

window.addHabito = async () => {
    const input = document.getElementById('habit-name-input');
    if (!input.value) return;
    await setDoc(doc(db, "users", auth.currentUser.uid, "habits", input.value), { nome: input.value, checks: {} });
    input.value = '';
    window.fecharModais();
};

window.selecionarHabito = (nome) => {
    if (!modoExcluir) return;
    if (selectedHabits.has(nome)) selectedHabits.delete(nome);
    else selectedHabits.add(nome);
    
    document.getElementById('btn-confirm-delete').innerText = `Excluir Selecionados (${selectedHabits.size})`;
    renderTabela();
};

window.toggleModoExcluir = () => {
    modoExcluir = !modoExcluir;
    selectedHabits.clear();
    const btn = document.getElementById('del-toggle');
    const confirmBtn = document.getElementById('btn-confirm-delete');
    btn.style.background = modoExcluir ? "#ef4444" : "white";
    btn.style.color = modoExcluir ? "white" : "#ef4444";
    confirmBtn.style.display = modoExcluir ? "block" : "none";
    renderTabela();
};

window.excluirSelecionados = async () => {
    if (selectedHabits.size === 0) return;
    const batch = writeBatch(db);
    selectedHabits.forEach(nome => {
        batch.delete(doc(db, "users", auth.currentUser.uid, "habits", nome));
    });
    await batch.commit();
    window.toggleModoExcluir();
    window.showAlert("Removidos!");
};

// --- UI/MODAIS ---
window.abrirPerfil = () => document.getElementById('modal-perfil').style.display = 'flex';
window.abrirHabitModal = () => document.getElementById('modal-habit').style.display = 'flex';
window.fecharModais = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
window.logout = () => signOut(auth).then(() => location.reload());
window.showAlert = (m) => {
    const a = document.getElementById('custom-alert');
    a.innerText = m; a.style.display = 'block';
    setTimeout(() => a.style.display = 'none', 3000);
};

// --- RENDERIZAÇÃO E ESTATÍSTICAS ---
function renderTabela() {
    const body = document.getElementById('table-body');
    const head = document.getElementById('table-head');
    const diaFim = Math.min(diaInicio + 20, 365);

    document.getElementById('label-inicio').innerText = diaInicio;
    document.getElementById('label-fim').innerText = diaFim;

    head.innerHTML = '<th>Hábito</th>';
    for (let i = diaInicio; i <= diaFim; i++) head.innerHTML += `<th>${i}</th>`;

    body.innerHTML = "";
    
    // Dados para o Gráfico de Barras (Progresso Diário da página atual)
    const progressoDiario = Array(21).fill(0);
    
    // Dados para o Gráfico de Pizza (Progresso Mensal)
    let totalChecksMes = 0;
    const mesInicio = Math.floor((diaInicio - 1) / 30) * 30 + 1;
    const mesFim = mesInicio + 29;

    habits.forEach(h => {
        let tr = document.createElement('tr');
        const isSelected = selectedHabits.has(h.nome);
        tr.className = `habit-row ${isSelected ? 'selected-to-delete' : ''}`;
        
        let html = `<td class="habit-name" onclick="window.selecionarHabito('${h.nome}')">${h.nome}</td>`;
        
        for (let i = diaInicio; i <= diaFim; i++) {
            const checked = h.checks && h.checks[i];
            if (checked) progressoDiario[i - diaInicio]++;
            html += `<td><div class="check-box ${checked ? 'checked' : ''}" onclick="window.toggleCheck('${h.nome}', ${i}, ${!!checked})">${checked ? 'X' : ''}</div></td>`;
        }
        
        // Cálculo Mensal
        if (h.checks) {
            Object.keys(h.checks).forEach(d => {
                if (d >= mesInicio && d <= mesFim && h.checks[d]) totalChecksMes++;
            });
        }
        tr.innerHTML = html;
        body.appendChild(tr);
    });

    updateCharts(totalChecksMes, habits.length, mesInicio, mesFim, progressoDiario);
}

function updateCharts(checks, totalH, inMes, fiMes, dadosBarras) {
    // 1. Update Pizza (Mensal)
    const totalPosMes = totalH * 30;
    const percMes = totalPosMes > 0 ? Math.round((checks / totalPosMes) * 100) : 0;
    document.getElementById('perc-text').innerText = percMes + "%";
    document.getElementById('mes-label').innerText = `Ciclo: Dias ${inMes} - ${fiMes}`;
    
    if (pChart) {
        pChart.data.datasets[0].data = [checks, Math.max(0, totalPosMes - checks)];
        pChart.update();
    }

    // 2. Update Barras (Diário)
    if (bChart) {
        bChart.data.labels = Array.from({length: 21}, (_, i) => i + diaInicio);
        // Converte quantidade de checks em porcentagem do dia
        bChart.data.datasets[0].data = dadosBarras.map(v => totalH > 0 ? (v / totalH) * 100 : 0);
        bChart.update();
    }
}

// --- MONITORAMENTO FIREBASE ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-img').src = user.photoURL || '';
        
        initCharts();

        onSnapshot(collection(db, "users", user.uid, "habits"), (snap) => {
            habits = snap.docs.map(d => d.data());
            renderTabela();
        });
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

function initCharts() {
    // Pizza
    const ctxP = document.getElementById('chartPizza');
    if (ctxP && !pChart) {
        pChart = new Chart(ctxP, {
            type: 'doughnut',
            data: { datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f1f5f9'], borderWidth: 0, cutout: '80%' }] },
            options: { plugins: { legend: { display: false } }, maintainAspectRatio: false }
        });
    }
    // Barras
    const ctxB = document.getElementById('chartBarra');
    if (ctxB && !bChart) {
        bChart = new Chart(ctxB, {
            type: 'bar',
            data: { 
                labels: [], 
                datasets: [{ 
                    label: '% Concluído', 
                    data: [], 
                    backgroundColor: '#3b82f6', 
                    borderRadius: 5 
                }] 
            },
            options: { 
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
                    x: { grid: { display: false } }
                },
                maintainAspectRatio: false
            }
        });
    }
}