import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, onSnapshot, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let pizzaChart, dailyChart, modoExclusao = false, habitoParaExcluir = null;
let diaInicioExibicao = 1;
const diasPorPagina = 21;
const totalDiasAno = 365;

// --- NAVEGAÇÃO ---
window.mudarPaginaDias = (dir) => {
    const novoInicio = diaInicioExibicao + (dir * diasPorPagina);
    if (novoInicio >= 1 && novoInicio <= (totalDiasAno - diasPorPagina + 1)) {
        diaInicioExibicao = novoInicio;
        atualizarDadosManualmente();
    }
};

const atualizarDadosManualmente = () => {
    const habitsRef = collection(db, "users", auth.currentUser.uid, "habits");
    onSnapshot(habitsRef, (snap) => {
        renderizarTabela(snap.docs.map(d => d.data()));
    }, { onlyOnce: true });
};

// --- MODAIS ---
window.openModal = () => document.getElementById('input-modal').style.display = 'flex';
window.closeModal = () => document.getElementById('input-modal').style.display = 'none';
window.openDeleteModal = (nome) => {
    habitoParaExcluir = nome;
    document.getElementById('habit-to-del-name').innerText = nome;
    document.getElementById('delete-modal').style.display = 'flex';
};
window.closeDeleteModal = () => {
    document.getElementById('delete-modal').style.display = 'none';
    if(modoExclusao) ativarModoExclusao(); 
};

window.confirmarNovoHabito = async () => {
    const n = document.getElementById('modalHabitInput').value;
    if(!n) return;
    await setDoc(doc(db, "users", auth.currentUser.uid, "habits", n), { nome: n, checks: {} });
    document.getElementById('modalHabitInput').value = '';
    closeModal();
};

window.confirmarExclusao = async () => {
    if(habitoParaExcluir) {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "habits", habitoParaExcluir));
        closeDeleteModal();
        showAlert("Hábito removido!");
    }
};

window.ativarModoExclusao = () => {
    modoExclusao = !modoExclusao;
    const btn = document.getElementById('del-btn-toggle');
    btn.style.background = modoExclusao ? "#ef4444" : "white";
    btn.style.color = modoExclusao ? "white" : "#ef4444";
    atualizarDadosManualmente();
};

window.toggleCheck = async (n, d, s) => {
    if(modoExclusao) return;
    const ref = doc(db, "users", auth.currentUser.uid, "habits", n);
    const obj = {}; obj[`checks.${d}`] = !s;
    await updateDoc(ref, obj);
};

function renderizarTabela(habitos) {
    const grid = document.getElementById('habit-grid');
    const head = document.getElementById('header-row');
    const diaFim = Math.min(diaInicioExibicao + diasPorPagina - 1, totalDiasAno);
    
    document.getElementById('dia-inicio-label').innerText = diaInicioExibicao;
    document.getElementById('dia-fim-label').innerText = diaFim;

    head.innerHTML = '<th style="text-align:left;">Hábito</th>';
    for (let i = diaInicioExibicao; i <= diaFim; i++) head.innerHTML += `<th>${i}</th>`;

    grid.innerHTML = "";
    let totalChecksMensal = 0;
    
    // Lógica do Reset Mensal (Ciclo de 30 dias)
    const mesAtual = Math.floor((diaInicioExibicao - 1) / 30);
    const inicioMes = (mesAtual * 30) + 1;
    const fimMes = inicioMes + 29;
    document.getElementById('ciclo-label').innerText = `Mês: Dia ${inicioMes} ao ${fimMes}`;

    const porcentagensDiarias = [];
    const labelsDiarios = [];

    // Prepara dados do gráfico de barras (apenas dos 21 dias na tela)
    for (let i = diaInicioExibicao; i <= diaFim; i++) {
        let concluidos = 0;
        habitos.forEach(h => { if(h.checks && h.checks[i]) concluidos++; });
        porcentagensDiarias.push(habitos.length > 0 ? (concluidos / habitos.length * 100).toFixed(1) : 0);
        labelsDiarios.push(i);
    }

    habitos.forEach(h => {
        let tr = document.createElement('tr');
        let html = `<td class="habit-name ${modoExclusao ? 'deletable' : ''}" 
                        onclick="${modoExclusao ? `openDeleteModal('${h.nome}')` : ''}">${h.nome}</td>`;
        
        for (let i = diaInicioExibicao; i <= diaFim; i++) {
            const isChecked = h.checks && h.checks[i];
            html += `<td><div class="check-container ${isChecked?'checked':''}" onclick="toggleCheck('${h.nome}', ${i}, ${!!isChecked})"></div></td>`;
        }

        // Soma checks apenas do mês atual (30 dias) para a Pizza
        if(h.checks) {
            Object.keys(h.checks).forEach(d => {
                if(d >= inicioMes && d <= fimMes && h.checks[d]) totalChecksMensal++;
            });
        }
        tr.innerHTML = html;
        grid.appendChild(tr);
    });

    const totalPossivelMes = habitos.length * 30;
    const percent = totalPossivelMes > 0 ? Math.round((totalChecksMensal / totalPossivelMes) * 100) : 0;
    document.getElementById('chart-percent').innerText = percent + "%";
    
    if(pizzaChart) {
        pizzaChart.data.datasets[0].data = [totalChecksMensal, Math.max(0, totalPossivelMes - totalChecksMensal)];
        pizzaChart.update();
    }
    if (dailyChart) {
        dailyChart.data.labels = labelsDiarios;
        dailyChart.data.datasets[0].data = porcentagensDiarias;
        dailyChart.update();
    }
}

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('user-display').innerText = user.displayName || "Usuário";
        document.getElementById('user-avatar').src = user.photoURL || "";
        initCharts();
        onSnapshot(collection(db, "users", user.uid, "habits"), (snap) => {
            renderizarTabela(snap.docs.map(d => d.data()));
            document.getElementById('loader').style.display = 'none';
        });
    } else {
        document.getElementById('login-modal').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
        document.getElementById('loader').style.display = 'none';
    }
});

document.getElementById('btn-login-google').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logout = () => signOut(auth);
window.toggleMenu = () => document.getElementById('profile-menu').classList.toggle('show');
window.showAlert = (m) => {
    const a = document.getElementById('custom-alert');
    a.innerText = m; a.style.display = 'block';
    setTimeout(() => a.style.display = 'none', 3000);
};

function initCharts() {
    const ctxP = document.getElementById('pizzaChart').getContext('2d');
    pizzaChart = new Chart(ctxP, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f3f4f6'], borderWidth: 0, cutout: '75%' }] },
        options: { plugins: { legend: { display: false } } }
    });

    const ctxD = document.getElementById('dailyChart').getContext('2d');
    dailyChart = new Chart(ctxD, {
        type: 'bar',
        data: { labels: [], datasets: [{ data: [], backgroundColor: '#3b82f6', borderRadius: 4 }] },
        options: { scales: { y: { max: 100, beginAtZero: true } }, plugins: { legend: { display: false } } }
    });
}