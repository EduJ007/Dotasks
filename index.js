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
let pChart; 
let bChart; 

// --- FUNÇÃO PARA ESCONDER O LOADER ---
function hideLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.visibility = 'hidden', 500);
    }
}

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

// ADIÇÃO: ESCUTAR TECLA ENTER NO INPUT
document.getElementById('habit-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.addHabito();
});

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
    const tbody = document.getElementById('table-body');
    tbody.classList.toggle('modo-exclusao-ativo');
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

window.abrirHabitModal = () => {
    const modal = document.getElementById('modal-habit');
    modal.style.display = 'flex';
    // ADIÇÃO: Focar no campo de texto automaticamente
    setTimeout(() => document.getElementById('habit-name-input').focus(), 100);
};

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
    const progressoDiario = Array(21).fill(0);
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
    const totalPosMes = totalH * 30;
    const percMes = totalPosMes > 0 ? Math.round((checks / totalPosMes) * 100) : 0;
    document.getElementById('perc-text').innerText = percMes + "%";
    document.getElementById('mes-label').innerText = `Ciclo: Dias ${inMes} - ${fiMes}`;
    
    if (pChart) {
        pChart.data.datasets[0].data = [checks, Math.max(0, totalPosMes - checks)];
        pChart.update();
    }

    if (bChart) {
        bChart.data.labels = Array.from({length: 21}, (_, i) => i + diaInicio);
        bChart.data.datasets[0].data = dadosBarras.map(v => totalH > 0 ? (v / totalH) * 100 : 0);
        bChart.update();
    }
}

// --- MONITORAMENTO FIREBASE ---
onAuthStateChanged(auth, (user) => {
    // ESCONDE O LOADER ASSIM QUE O FIREBASE RESPONDER
    hideLoader();

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
    const ctxP = document.getElementById('chartPizza');
    if (ctxP && !pChart) {
        pChart = new Chart(ctxP, {
            type: 'doughnut',
            data: { datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f1f5f9'], borderWidth: 0, cutout: '80%' }] },
            options: { plugins: { legend: { display: false } }, maintainAspectRatio: false }
        });
    }
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