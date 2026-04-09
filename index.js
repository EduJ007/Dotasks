import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signOut, updateProfile,
    GoogleAuthProvider, signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, collection, onSnapshot, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const googleProvider = new GoogleAuthProvider();

// --- ALERTAS NO CAPRICHO (ESTILO SISTEMA) ---
window.showAlert = (msg) => {
    const alertBox = document.getElementById('custom-alert');
    const alertMsg = document.getElementById('alert-message');
    if(!alertBox || !alertMsg) return;
    
    alertMsg.innerText = msg;
    alertBox.style.display = 'flex';
    
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 3500);
};

window.toggleInput = (show) => {
    const btn = document.getElementById('btn-show-input');
    const container = document.getElementById('input-container');
    if (show) {
        btn.style.display = 'none';
        container.style.display = 'flex';
        document.getElementById('habitInput').focus();
    } else {
        btn.style.display = 'block';
        container.style.display = 'none';
        document.getElementById('habitInput').value = '';
    }
};

// --- CORE: QUESTS ---
const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
let progressChart;

window.adicionarHabito = async () => {
    const nome = document.getElementById('habitInput').value;
    if (!nome) return;
    try {
        const habitRef = doc(db, "users", auth.currentUser.uid, "habits", nome);
        await setDoc(habitRef, { nome, checks: {} });
        window.toggleInput(false);
        showAlert("NEW QUEST REGISTERED!");
    } catch (err) { showAlert("ERROR REGISTERING QUEST"); }
};

window.deletarHabito = async (nome) => {
    if (confirm(`ABANDON QUEST: ${nome}?`)) {
        try {
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "habits", nome));
            showAlert("QUEST ABANDONED");
        } catch (err) { showAlert("ERROR DELETING QUEST"); }
    }
};

function renderizarTabela(habitos) {
    const grid = document.getElementById('habit-grid');
    const head = document.getElementById('header-row');
    if (!grid || !head) return;

    const diaHoje = new Date().getDate();
    grid.innerHTML = "";
    head.innerHTML = '<th style="background:transparent; border:none; width:40px;"></th><th class="sticky-col">QUEST LOG</th>';

    for (let i = 1; i <= diasNoMes; i++) {
        const th = document.createElement('th');
        th.innerText = i;
        if(i === diaHoje) th.style.color = "var(--sl-blue)";
        head.appendChild(th);
    }

    habitos.forEach(h => {
        const tr = document.createElement('tr');
        let html = `
            <td class="delete-btn-col">
                <span onclick="deletarHabito('${h.nome}')" class="delete-quest-btn" title="ABANDON QUEST">[X]</span>
            </td>
            <td class="sticky-col">${h.nome}</td>`;
        
        for (let i = 1; i <= diasNoMes; i++) {
            const isChecked = h.checks && h.checks[i] ? "checked" : "";
            html += `<td><input type="checkbox" class="habit-check" data-habit="${h.nome}" data-day="${i}" ${isChecked}></td>`;
        }
        tr.innerHTML = html;
        grid.appendChild(tr);
    });
    atualizarProgresso();
}

// --- GRÁFICO E PROGRESSO ---
function initChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    if(progressChart) progressChart.destroy();
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: ['#00d4ff', 'rgba(0, 212, 255, 0.1)'], borderWidth: 0 }] },
        options: { cutout: '80%', plugins: { tooltip: { enabled: false } } }
    });
}

function atualizarProgresso() {
    const checks = document.querySelectorAll('.habit-check');
    const marcados = Array.from(checks).filter(c => c.checked).length;
    const porcento = checks.length > 0 ? Math.round((marcados / checks.length) * 100) : 0;
    
    if(progressChart) {
        progressChart.data.datasets[0].data = [porcento, 100 - porcento];
        progressChart.update();
    }
    document.getElementById('percentage-label').innerText = porcento + "%";
}

// --- LISTENERS ---
document.addEventListener('change', async (e) => {
    if (e.target.classList.contains('habit-check')) {
        const { habit, day } = e.target.dataset;
        const ref = doc(db, "users", auth.currentUser.uid, "habits", habit);
        const updateObj = {};
        updateObj[`checks.${day}`] = e.target.checked;
        await updateDoc(ref, updateObj);
        if(e.target.checked) showAlert("QUEST PROGRESS UPDATED!");
    }
});

// --- AUTH OBSERVER ---
onAuthStateChanged(auth, (user) => {
    const appBox = document.getElementById('app-content');
    const loadingScreen = document.getElementById('loading-screen');

    setTimeout(() => { loadingScreen.style.display = 'none'; }, 2000);

    if (user) {
        appBox.style.display = 'block';
        document.getElementById('user-email-display').innerText = user.displayName || user.email;
        initChart();
        onSnapshot(collection(db, "users", user.uid, "habits"), (snap) => {
            renderizarTabela(snap.docs.map(d => d.data()));
        });
    } else {
        // Redirecionar para login se necessário
        window.location.href = "login.html"; // Ajuste conforme seu arquivo de login
    }
});

window.logout = () => signOut(auth);