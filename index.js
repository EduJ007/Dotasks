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

// Estado Global
let habits = [];
let selectedHabits = new Set();
let modoExcluir = false;
let diaInicio = 1;
let pChart, bChart;

// --- FUNÇÕES DE NAVEGAÇÃO ---
window.navegarDias = (dir) => {
    const novo = diaInicio + (dir * 21);
    if(novo >= 1 && novo <= 345) {
        diaInicio = novo;
        renderTabela();
    }
};

// --- MODAIS ---
window.fecharModais = () => {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
};
window.abrirPerfil = () => {
    document.getElementById('profile-preview').src = auth.currentUser.photoURL;
    document.getElementById('modal-perfil').style.display = 'flex';
};
window.abrirHabitModal = () => document.getElementById('modal-habit').style.display = 'flex';

window.salvarFoto = async () => {
    const url = document.getElementById('input-photo-url').value;
    if(!url) return;
    // Aqui no Firebase Auth real precisaria de updateProfile, 
    // mas para fins de UI, vamos salvar no localStorage ou apenas simular
    document.getElementById('user-img').src = url;
    fecharModais();
    showAlert("Foto atualizada!");
};

// --- LOGICA DE EXCLUSÃO ---
window.toggleModoExcluir = () => {
    modoExcluir = !modoExcluir;
    selectedHabits.clear();
    const btn = document.getElementById('del-toggle');
    const confirmBtn = document.getElementById('btn-confirm-delete');
    
    btn.style.background = modoExcluir ? "#ef4444" : "white";
    btn.style.color = modoExcluir ? "white" : "#ef4444";
    confirmBtn.style.display = modoExcluir ? "block" : "none";
    confirmBtn.innerText = `Excluir Selecionados (0)`;
    
    renderTabela();
};

window.selecionarHabito = (nome) => {
    if(!modoExcluir) return;
    if(selectedHabits.has(nome)) selectedHabits.delete(nome);
    else selectedHabits.add(nome);
    
    document.getElementById('btn-confirm-delete').innerText = `Excluir Selecionados (${selectedHabits.size})`;
    renderTabela();
};

window.excluirSelecionados = async () => {
    if(selectedHabits.size === 0) return;
    if(!confirm(`Excluir ${selectedHabits.size} hábitos permanentemente?`)) return;

    const batch = writeBatch(db);
    selectedHabits.forEach(nome => {
        const ref = doc(db, "users", auth.currentUser.uid, "habits", nome);
        batch.delete(ref);
    });

    await batch.commit();
    toggleModoExcluir();
    showAlert("Hábitos removidos!");
};

// --- CORE ---
window.addHabito = async () => {
    const nome = document.getElementById('habit-name-input').value;
    if(!nome) return;
    await setDoc(doc(db, "users", auth.currentUser.uid, "habits", nome), { nome, checks: {} });
    document.getElementById('habit-name-input').value = '';
    fecharModais();
};

window.toggleCheck = async (habNome, dia, status) => {
    if(modoExcluir) return;
    const ref = doc(db, "users", auth.currentUser.uid, "habits", habNome);
    const obj = {}; obj[`checks.${dia}`] = !status;
    await updateDoc(ref, obj);
};

function renderTabela() {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    const diaFim = diaInicio + 20;

    document.getElementById('label-inicio').innerText = diaInicio;
    document.getElementById('label-fim').innerText = diaFim;

    head.innerHTML = '<th>Hábito</th>';
    for(let i=diaInicio; i<=diaFim; i++) head.innerHTML += `<th>${i}</th>`;

    body.innerHTML = "";
    let totalChecksMes = 0;
    const mesInicio = Math.floor((diaInicio-1)/30) * 30 + 1;
    const mesFim = mesInicio + 29;

    habits.forEach(h => {
        const isSelected = selectedHabits.has(h.nome);
        let tr = document.createElement('tr');
        tr.className = `habit-row ${isSelected ? 'selected-to-delete' : ''}`;
        
        let html = `<td class="habit-name" onclick="selecionarHabito('${h.nome}')">${h.nome}</td>`;
        
        for(let i=diaInicio; i<=diaFim; i++) {
            const checked = h.checks && h.checks[i];
            html += `<td><div class="check-box ${checked?'checked':''}" onclick="toggleCheck('${h.nome}', ${i}, ${!!checked})">X</div></td>`;
        }
        
        if(h.checks) {
            Object.keys(h.checks).forEach(d => {
                if(d >= mesInicio && d <= mesFim && h.checks[d]) totalChecksMes++;
            });
        }

        tr.innerHTML = html;
        body.appendChild(tr);
    });

    updateCharts(totalChecksMes, habits.length, mesInicio, mesFim);
}

function updateCharts(checks, totalH, inMes, fiMes) {
    const totalPos = totalH * 30;
    const perc = totalPos > 0 ? Math.round((checks/totalPos)*100) : 0;
    document.getElementById('perc-text').innerText = perc + "%";
    document.getElementById('mes-label').innerText = `Dias ${inMes} - ${fiMes}`;

    if(pChart) {
        pChart.data.datasets[0].data = [checks, Math.max(0, totalPos - checks)];
        pChart.update();
    }
}

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
    if(user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-img').src = user.photoURL;
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

document.getElementById('login-google').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logout = () => signOut(auth);
window.showAlert = (m) => {
    const a = document.getElementById('custom-alert');
    a.innerText = m; a.style.display = 'block';
    setTimeout(() => a.style.display = 'none', 3000);
};

function initCharts() {
    if(pChart) return;
    pChart = new Chart(document.getElementById('chartPizza'), {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f3f4f6'], borderWidth: 0, cutout: '80%' }] },
        options: { plugins: { legend: { display: false } } }
    });
    bChart = new Chart(document.getElementById('chartBarra'), {
        type: 'bar',
        data: { labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'], datasets: [{ data: [10, 40, 30, 70, 50, 90, 20], backgroundColor: '#3b82f6', borderRadius: 10 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { display: false } } }
    });
}