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

let pizzaChart;
let dailyChart;
let modoExclusao = false;
let habitoParaExcluir = null;
const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

// --- SISTEMA DE MODAIS ---
window.openModal = () => document.getElementById('input-modal').style.display = 'flex';
window.closeModal = () => document.getElementById('input-modal').style.display = 'none';

window.openDeleteModal = (nome) => {
    habitoParaExcluir = nome;
    document.getElementById('habit-to-del-name').innerText = nome;
    document.getElementById('delete-modal').style.display = 'flex';
};
window.closeDeleteModal = () => {
    document.getElementById('delete-modal').style.display = 'none';
    ativarModoExclusao(); 
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
    showAlert(modoExclusao ? "Clique no nome do hábito para apagar" : "Modo edição desativado");
};

// --- CORE ---
window.toggleCheck = async (n, d, s) => {
    if(modoExclusao) return;
    const ref = doc(db, "users", auth.currentUser.uid, "habits", n);
    const obj = {}; obj[`checks.${d}`] = !s;
    await updateDoc(ref, obj);
};

function renderizarTabela(habitos) {
    const grid = document.getElementById('habit-grid');
    const head = document.getElementById('header-row');
    
    head.innerHTML = '<th style="text-align:left; padding-left:10px;">Hábito</th>';
    for (let i = 1; i <= diasNoMes; i++) head.innerHTML += `<th>${i}</th>`;

    grid.innerHTML = "";
    let totalChecksMensal = 0;
    let totalPossivelMensal = habitos.length * diasNoMes;

    // Para o gráfico diário
    const porcentagensDiarias = [];
    const labelsDiarios = [];

    // Lógica por dia
    for (let i = 1; i <= diasNoMes; i++) {
        let concluidosNoDia = 0;
        habitos.forEach(h => {
            if (h.checks && h.checks[i]) concluidosNoDia++;
        });
        const percDia = habitos.length > 0 ? (concluidosNoDia / habitos.length) * 100 : 0;
        porcentagensDiarias.push(percDia.toFixed(1));
        labelsDiarios.push(i);
    }

    // Renderizar linhas
    habitos.forEach(h => {
        let tr = document.createElement('tr');
        let html = `<td class="habit-name ${modoExclusao ? 'deletable' : ''}" 
                        onclick="${modoExclusao ? `openDeleteModal('${h.nome}')` : ''}">
                        ${h.nome}
                    </td>`;
        for (let i = 1; i <= diasNoMes; i++) {
            const isChecked = h.checks && h.checks[i];
            if(isChecked) totalChecksMensal++;
            html += `<td><div class="check-container ${isChecked?'checked':''}" onclick="toggleCheck('${h.nome}', ${i}, ${!!isChecked})"></div></td>`;
        }
        tr.innerHTML = html;
        grid.appendChild(tr);
    });

    // Atualizar Pizza
    const percent = totalPossivelMensal > 0 ? Math.round((totalChecksMensal / totalPossivelMensal) * 100) : 0;
    document.getElementById('chart-percent').innerText = percent + "%";
    if(pizzaChart) {
        pizzaChart.data.datasets[0].data = [totalChecksMensal, totalPossivelMensal - totalChecksMensal];
        pizzaChart.update();
    }

    // Atualizar Gráfico Diário
    if (dailyChart) {
        dailyChart.data.datasets[0].data = porcentagensDiarias;
        dailyChart.update();
    }
}

// --- AUTH & AVATAR ---
const googleProvider = new GoogleAuthProvider();

onAuthStateChanged(auth, (user) => {
    const loginModal = document.getElementById('login-modal');
    const appContent = document.getElementById('app-content');
    const loader = document.getElementById('loader');
    const avatar = document.getElementById('user-avatar');

    if (user) {
        loginModal.style.display = 'none';
        appContent.style.display = 'block';
        document.getElementById('user-display').innerText = user.displayName || "Usuário";
        
        const backupAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=3b82f6&color=fff`;
        
        if (user.photoURL) {
            avatar.src = user.photoURL.replace("s96-c", "s192-c");
            avatar.onerror = () => avatar.src = backupAvatar;
        } else {
            avatar.src = backupAvatar;
        }

        initCharts();
        
        onSnapshot(collection(db, "users", user.uid, "habits"), (snap) => {
            renderizarTabela(snap.docs.map(d => d.data()));
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        });

    } else {
        appContent.style.display = 'none';
        loginModal.style.display = 'flex';
        loader.style.display = 'none';
    }
});

document.getElementById('btn-login-google').addEventListener('click', () => {
    signInWithPopup(auth, googleProvider).catch(err => {
        showAlert("Erro ao entrar com Google");
    });
});

window.toggleMenu = () => document.getElementById('profile-menu').classList.toggle('show');
window.logout = () => signOut(auth);
window.showAlert = (msg) => {
    const b = document.getElementById('custom-alert');
    b.innerText = msg; b.style.display = 'block';
    setTimeout(() => b.style.display = 'none', 3000);
};

function initCharts() {
    // Pizza
    const ctxP = document.getElementById('pizzaChart').getContext('2d');
    if(pizzaChart) pizzaChart.destroy();
    pizzaChart = new Chart(ctxP, {
        type: 'doughnut',
        data: {
            labels: ['Feito', 'Restante'],
            datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f3f4f6'], borderWidth: 0, cutout: '75%' }]
        },
        options: { plugins: { legend: { display: false } } }
    });

    // Diário (Barras)
    const ctxD = document.getElementById('dailyChart').getContext('2d');
    if(dailyChart) dailyChart.destroy();
    dailyChart = new Chart(ctxD, {
        type: 'bar',
        data: {
            labels: Array.from({length: diasNoMes}, (_, i) => i + 1),
            datasets: [{
                label: '% do dia',
                data: [],
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}