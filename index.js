import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, updateProfile,
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

// --- HELPERS E INTERFACE ---
window.showAlert = (msg) => {
    const alertBox = document.getElementById('custom-alert');
    document.getElementById('alert-message').innerText = msg;
    alertBox.classList.remove('alert-hidden');
    setTimeout(() => alertBox.classList.add('alert-hidden'), 4000);
};

window.closeAlert = () => document.getElementById('custom-alert').classList.add('alert-hidden');

window.toggleAuth = (isSignup) => {
    document.getElementById('auth-container').style.display = isSignup ? 'none' : 'flex';
    document.getElementById('signup-container').style.display = isSignup ? 'flex' : 'none';
};

window.toggleInput = (show) => {
    const btn = document.getElementById('btn-show-input');
    const container = document.getElementById('input-container');
    if (show) {
        if(btn) btn.style.display = 'none';
        if(container) container.style.display = 'flex';
        document.getElementById('habitInput').focus();
    } else {
        if(btn) btn.style.display = 'block';
        if(container) container.style.display = 'none';
        document.getElementById('habitInput').value = '';
    }
};

// --- PERFIL ---
function getCorPorLetra(letra) {
    const cores = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const indice = letra ? letra.toUpperCase().charCodeAt(0) % cores.length : 0;
    return cores[indice];
}

function renderizarAvatar(user) {
    const avatar = document.getElementById('user-avatar');
    if(!avatar) return;
    const nome = user.displayName || user.email || "U";
    const inicial = nome.charAt(0).toUpperCase();

    if (user.photoURL) {
        avatar.style.backgroundImage = `url('${user.photoURL}')`;
        avatar.innerText = "";
        avatar.style.backgroundColor = "transparent";
    } else {
        avatar.style.backgroundImage = "none";
        avatar.innerText = inicial;
        avatar.style.backgroundColor = getCorPorLetra(inicial);
    }
}

window.abrirConfigPerfil = () => {
    const box = document.getElementById('edit-profile');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
};

window.salvarFoto = async () => {
    const url = document.getElementById('new-photo-url').value;
    if (!url) return showAlert("Insira um link!");
    try {
        await updateProfile(auth.currentUser, { photoURL: url });
        renderizarAvatar(auth.currentUser);
        showAlert("IMAGE UPDATED!");
        abrirConfigPerfil();
    } catch (err) { showAlert("ERROR SAVING IMAGE"); }
};

// --- AUTH LOGIC ---
window.login = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => showAlert("LOGIN ERROR!"));
};

window.loginGoogle = () => signInWithPopup(auth, googleProvider);
window.logout = () => signOut(auth);

// --- DASHBOARD E GRÁFICO ---
const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
let progressChart;

function initChart() {
    const canvas = document.getElementById('progressChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(progressChart) progressChart.destroy();
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            datasets: [{ 
                data: [0, 100], 
                backgroundColor: ['#00d4ff', 'rgba(0, 212, 255, 0.1)'],
                borderWidth: 0
            }] 
        },
        options: { cutout: '85%', plugins: { tooltip: { enabled: false } }, animation: { animateRotate: true } }
    });
}

// --- CORE: QUESTS ---
window.adicionarHabito = async () => {
    const nome = document.getElementById('habitInput').value;
    if (!nome) return;
    try {
        const habitRef = doc(collection(db, "users", auth.currentUser.uid, "habits"), nome);
        await setDoc(habitRef, { nome, checks: {} });
        window.toggleInput(false);
        showAlert("QUEST REGISTERED!");
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

function carregarHabitos(uid) {
    onSnapshot(collection(db, "users", uid, "habits"), (snap) => {
        renderizarTabela(snap.docs.map(d => d.data()));
    });
}

function renderizarTabela(habitos) {
    const grid = document.getElementById('habit-grid');
    const head = document.getElementById('header-row');
    if (!grid || !head) return;

    const diaHoje = new Date().getDate();
    grid.innerHTML = "";
    head.innerHTML = '<th class="sticky-col">QUEST LOG</th>';

    for (let i = 1; i <= diasNoMes; i++) {
        const th = document.createElement('th');
        th.innerText = i;
        if(i === diaHoje) th.style.color = "var(--sl-blue)";
        head.appendChild(th);
    }

    habitos.forEach(h => {
        const tr = document.createElement('tr');
        let html = `
            <td class="sticky-col">
                <span onclick="deletarHabito('${h.nome}')" style="color: #ff4d4d; cursor: pointer; margin-right: 10px; font-weight: bold;">[X]</span>
                ${h.nome}
            </td>`;
        
        for (let i = 1; i <= diasNoMes; i++) {
            const isChecked = h.checks && h.checks[i] ? "checked" : "";
            html += `<td><input type="checkbox" class="habit-check" data-habit="${h.nome}" data-day="${i}" ${isChecked}></td>`;
        }
        tr.innerHTML = html;
        grid.appendChild(tr);
    });
    atualizarProgresso();
}

// --- LISTENERS E PROGRESSO ---
document.addEventListener('change', async (e) => {
    if (e.target.classList.contains('habit-check')) {
        const { habit, day } = e.target.dataset;
        const ref = doc(db, "users", auth.currentUser.uid, "habits", habit);
        const updateObj = {};
        updateObj[`checks.${day}`] = e.target.checked;
        await updateDoc(ref, updateObj);
    }
});

function atualizarProgresso() {
    const checks = document.querySelectorAll('.habit-check');
    const marcados = Array.from(checks).filter(c => c.checked).length;
    const porcento = checks.length > 0 ? Math.round((marcados / checks.length) * 100) : 0;
    
    if(progressChart) {
        progressChart.data.datasets[0].data = [porcento, 100 - porcento];
        progressChart.update();
    }
    const label = document.getElementById('percentage-label');
    if(label) label.innerText = porcento + "%";
}

// Enter no input
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'habitInput') {
        adicionarHabito();
    }
});

// --- AUTH OBSERVER ---
onAuthStateChanged(auth, (user) => {
    const appBox = document.getElementById('app-content');
    const authBox = document.getElementById('auth-container');
    const loadingScreen = document.getElementById('loading-screen');

    setTimeout(() => { if(loadingScreen) loadingScreen.style.display = 'none'; }, 2000);

    if (user) {
        if(authBox) authBox.style.display = 'none';
        if(appBox) appBox.style.display = 'block';
        const displayEmail = document.getElementById('user-email-display');
        if(displayEmail) displayEmail.innerText = user.displayName || user.email;
        renderizarAvatar(user);
        initChart();
        carregarHabitos(user.uid);
    } else {
        if(authBox) authBox.style.display = 'flex';
        if(appBox) appBox.style.display = 'none';
    }
});