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

// Variáveis de controle
let habits = [];
let selectedHabits = new Set();
let modoExcluir = false;
let diaInicio = 1;
let pChart;

// --- LOGIN ---
const loginBtn = document.getElementById('btn-login-google-real');
if (loginBtn) {
    loginBtn.onclick = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Erro no login:", error);
            alert("Erro ao entrar com Google. Verifique o console.");
        }
    };
}

// --- LOGOUT ---
window.logout = () => {
    signOut(auth).then(() => {
        window.location.reload(); // Recarrega para limpar estados
    });
};

// --- NAVEGAÇÃO (FIX DAS SETAS) ---
window.navegarDias = (dir) => {
    const novoInicio = diaInicio + (dir * 21);
    // Limites: não menos que 1, não mais que 345 (para mostrar até 365)
    if (novoInicio >= 1 && novoInicio <= 345) {
        diaInicio = novoInicio;
        renderTabela(); 
    }
};

// --- RESTO DA LÓGICA (MODAIS E EXCLUSÃO) ---
window.fecharModais = () => {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
};

window.abrirPerfil = () => {
    document.getElementById('profile-preview').src = auth.currentUser.photoURL || 'https://via.placeholder.com/80';
    document.getElementById('modal-perfil').style.display = 'flex';
};

window.abrirHabitModal = () => document.getElementById('modal-habit').style.display = 'flex';

window.toggleModoExcluir = () => {
    modoExcluir = !modoExcluir;
    selectedHabits.clear();
    const btn = document.getElementById('del-toggle');
    const confirmBtn = document.getElementById('btn-confirm-delete');
    
    if (modoExcluir) {
        btn.style.background = "#ef4444";
        btn.style.color = "white";
        confirmBtn.style.display = "block";
        showAlert("Selecione os nomes para excluir");
    } else {
        btn.style.background = "white";
        btn.style.color = "#ef4444";
        confirmBtn.style.display = "none";
    }
    renderTabela();
};

window.selecionarHabito = (nome) => {
    if (!modoExcluir) return;
    if (selectedHabits.has(nome)) selectedHabits.delete(nome);
    else selectedHabits.add(nome);
    
    document.getElementById('btn-confirm-delete').innerText = `Excluir Selecionados (${selectedHabits.size})`;
    renderTabela();
};

window.excluirSelecionados = async () => {
    if (selectedHabits.size === 0) return;
    if (!confirm(`Excluir ${selectedHabits.size} hábitos?`)) return;

    const batch = writeBatch(db);
    selectedHabits.forEach(nome => {
        const ref = doc(db, "users", auth.currentUser.uid, "habits", nome);
        batch.delete(ref);
    });

    await batch.commit();
    toggleModoExcluir();
    showAlert("Removidos com sucesso!");
};

window.addHabito = async () => {
    const nome = document.getElementById('habit-name-input').value;
    if (!nome) return;
    await setDoc(doc(db, "users", auth.currentUser.uid, "habits", nome), { nome, checks: {} });
    document.getElementById('habit-name-input').value = '';
    fecharModais();
};

window.toggleCheck = async (habNome, dia, status) => {
    if (modoExcluir) return;
    const ref = doc(db, "users", auth.currentUser.uid, "habits", habNome);
    const obj = {}; 
    obj[`checks.${dia}`] = !status;
    await updateDoc(ref, obj);
};

// --- RENDERIZAÇÃO ---
function renderTabela() {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    if (!head || !body) return;

    const diaFim = Math.min(diaInicio + 20, 365);
    document.getElementById('label-inicio').innerText = diaInicio;
    document.getElementById('label-fim').innerText = diaFim;

    head.innerHTML = '<th>Hábito</th>';
    for (let i = diaInicio; i <= diaFim; i++) {
        head.innerHTML += `<th>${i}</th>`;
    }

    body.innerHTML = "";
    let totalChecksMes = 0;
    const mesInicio = Math.floor((diaInicio - 1) / 30) * 30 + 1;
    const mesFim = mesInicio + 29;

    habits.forEach(h => {
        const isSelected = selectedHabits.has(h.nome);
        let tr = document.createElement('tr');
        tr.className = `habit-row ${isSelected ? 'selected-to-delete' : ''}`;
        
        // Clique no nome para excluir
        let html = `<td class="habit-name" onclick="selecionarHabito('${h.nome}')" style="cursor: ${modoExcluir ? 'pointer' : 'default'}">${h.nome}</td>`;
        
        for (let i = diaInicio; i <= diaFim; i++) {
            const checked = h.checks && h.checks[i];
            // Renderiza o "X" azul se estiver marcado
            html += `<td><div class="check-box ${checked ? 'checked' : ''}" onclick="toggleCheck('${h.nome}', ${i}, ${!!checked})">${checked ? 'X' : ''}</div></td>`;
        }
        
        if (h.checks) {
            Object.keys(h.checks).forEach(d => {
                if (d >= mesInicio && d <= mesFim && h.checks[d]) totalChecksMes++;
            });
        }
        tr.innerHTML = html;
        body.appendChild(tr);
    });

    updateCharts(totalChecksMes, habits.length, mesInicio, mesFim);
}

function updateCharts(checks, totalH, inMes, fiMes) {
    const totalPos = totalH * 30;
    const perc = totalPos > 0 ? Math.round((checks / totalPos) * 100) : 0;
    const percText = document.getElementById('perc-text');
    if (percText) percText.innerText = perc + "%";
    
    const mesLabel = document.getElementById('mes-label');
    if (mesLabel) mesLabel.innerText = `Ciclo: Dias ${inMes} - ${fiMes}`;

    if (pChart) {
        pChart.data.datasets[0].data = [checks, Math.max(0, totalPos - checks)];
        pChart.update();
    }
}

// --- INICIALIZAÇÃO E MONITORAMENTO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-img').src = user.photoURL || '';
        
        initCharts();

        // Escuta o banco de dados em tempo real
        onSnapshot(collection(db, "users", user.uid, "habits"), (snap) => {
            habits = snap.docs.map(d => d.data());
            renderTabela();
        });
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

window.showAlert = (m) => {
    const a = document.getElementById('custom-alert');
    if (!a) return;
    a.innerText = m; a.style.display = 'block';
    setTimeout(() => a.style.display = 'none', 3000);
};

function initCharts() {
    const ctx = document.getElementById('chartPizza');
    if (!ctx || pChart) return;
    pChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f1f5f9'], borderWidth: 0, cutout: '80%' }] },
        options: { plugins: { legend: { display: false } }, responsive: true }
    });
}