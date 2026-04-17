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

// --- EXPOR PARA O HTML ---
window.openModal = () => document.getElementById('input-modal').style.display = 'flex';
window.closeModal = () => document.getElementById('input-modal').style.display = 'none';

window.ativarModoExclusao = () => {
    modoExclusao = !modoExclusao;
    const btn = document.getElementById('del-btn-toggle');
    const tabela = document.getElementById('tabela-habitos-main');
    
    if(modoExclusao) {
        btn.style.background = "#ef4444";
        btn.style.color = "white";
        tabela.classList.add('modo-excluir-ativo');
        showAlert("Clique no nome de um hábito para remover");
    } else {
        btn.style.background = "white";
        btn.style.color = "#ef4444";
        tabela.classList.remove('modo-excluir-ativo');
    }
};

window.openDeleteModal = (nome) => {
    if(!modoExclusao) return;
    habitoParaExcluir = nome;
    document.getElementById('habit-to-del-name').innerText = nome;
    document.getElementById('delete-modal').style.display = 'flex';
};

window.closeDeleteModal = () => {
    document.getElementById('delete-modal').style.display = 'none';
    ativarModoExclusao(); // Desativa o modo após fechar
};

window.confirmarExclusao = async () => {
    if(habitoParaExcluir) {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "habits", habitoParaExcluir));
        closeDeleteModal();
        showAlert("Hábito removido");
    }
};

window.mudarPaginaDias = (dir) => {
    const novo = diaInicioExibicao + (dir * diasPorPagina);
    if(novo >= 1 && novo <= 345) {
        diaInicioExibicao = novo;
        // O snapshot do Firebase vai cuidar de renderizar automaticamente
    }
};

window.confirmarNovoHabito = async () => {
    const n = document.getElementById('modalHabitInput').value;
    if(!n) return;
    await setDoc(doc(db, "users", auth.currentUser.uid, "habits", n), { nome: n, checks: {} });
    document.getElementById('modalHabitInput').value = '';
    closeModal();
};

window.toggleCheck = async (n, d, s) => {
    if(modoExclusao) return;
    const ref = doc(db, "users", auth.currentUser.uid, "habits", n);
    const obj = {}; obj[`checks.${d}`] = !s;
    await updateDoc(ref, obj);
};

// --- RENDER ---
function renderizarTabela(habitos) {
    const grid = document.getElementById('habit-grid');
    const head = document.getElementById('header-row');
    const diaFim = diaInicioExibicao + diasPorPagina - 1;

    document.getElementById('dia-inicio-label').innerText = diaInicioExibicao;
    document.getElementById('dia-fim-label').innerText = diaFim;

    head.innerHTML = '<th>Hábito</th>';
    for (let i = diaInicioExibicao; i <= diaFim; i++) head.innerHTML += `<th>${i}</th>`;

    grid.innerHTML = "";
    let totalChecksMes = 0;
    const mesInicio = Math.floor((diaInicioExibicao-1)/30) * 30 + 1;
    const mesFim = mesInicio + 29;

    const dadosBarras = Array(diasPorPagina).fill(0);

    habitos.forEach(h => {
        let tr = document.createElement('tr');
        // AQUI A MÁGICA: O onclick chama openDeleteModal
        let html = `<td class="habit-name" onclick="openDeleteModal('${h.nome}')">${h.nome}</td>`;
        
        for (let i = diaInicioExibicao; i <= diaFim; i++) {
            const isChecked = h.checks && h.checks[i];
            if(isChecked) dadosBarras[i - diaInicioExibicao]++;
            html += `<td><div class="check-container ${isChecked?'checked':''}" onclick="toggleCheck('${h.nome}', ${i}, ${!!isChecked})"></div></td>`;
        }

        // Soma para a pizza (mês de 30 dias)
        if(h.checks) {
            Object.keys(h.checks).forEach(d => {
                if(d >= mesInicio && d <= mesFim && h.checks[d]) totalChecksMes++;
            });
        }
        tr.innerHTML = html;
        grid.appendChild(tr);
    });

    // Atualiza Gráficos
    const totalPossivel = habitos.length * 30;
    const perc = totalPossivel > 0 ? Math.round((totalChecksMes / totalPossivel) * 100) : 0;
    document.getElementById('chart-percent').innerText = perc + "%";
    document.getElementById('ciclo-label').innerText = `Dias ${mesInicio} a ${mesFim}`;

    if(pizzaChart) {
        pizzaChart.data.datasets[0].data = [totalChecksMes, Math.max(0, totalPossivel - totalChecksMes)];
        pizzaChart.update();
    }
    if(dailyChart) {
        dailyChart.data.labels = Array.from({length: diasPorPagina}, (_, i) => i + diaInicioExibicao);
        dailyChart.data.datasets[0].data = dadosBarras.map(v => habitos.length > 0 ? (v/habitos.length)*100 : 0);
        dailyChart.update();
    }
}

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('user-display').innerText = user.displayName;
        document.getElementById('user-avatar').src = user.photoURL;
        initCharts();
        onSnapshot(collection(db, "users", user.uid, "habits"), (snap) => {
            renderizarTabela(snap.docs.map(d => d.data()));
        });
    } else {
        document.getElementById('login-modal').style.display = 'flex';
    }
});

document.getElementById('btn-login-google').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logout = () => signOut(auth);
window.showAlert = (m) => {
    const a = document.getElementById('custom-alert');
    a.innerText = m; a.style.display = 'block';
    setTimeout(() => a.style.display = 'none', 3000);
};

function initCharts() {
    if(pizzaChart) return;
    const ctxP = document.getElementById('pizzaChart');
    pizzaChart = new Chart(ctxP, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f3f4f6'], borderWidth: 0, cutout: '75%' }] },
        options: { plugins: { legend: { display: false } } }
    });

    const ctxD = document.getElementById('dailyChart');
    dailyChart = new Chart(ctxD, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: '% Concluído', data: [], backgroundColor: '#3b82f6', borderRadius: 5 }] },
        options: { 
            responsive: true,
            scales: { y: { beginAtZero: true, max: 100 } },
            plugins: { legend: { display: false } }
        }
    });
}