import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, updateProfile,
    GoogleAuthProvider, signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- HELPERS ---
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

// --- PERFIL E AVATAR ---
function getCorPorLetra(letra) {
    const cores = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const indice = letra ? letra.toUpperCase().charCodeAt(0) % cores.length : 0;
    return cores[indice];
}

function renderizarAvatar(user) {
    const avatar = document.getElementById('user-avatar');
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
        showAlert("Foto atualizada!");
        abrirConfigPerfil();
    } catch (err) { showAlert("Erro ao salvar foto."); }
};

// --- AUTH LOGIC ---
window.login = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => showAlert("Erro no login!"));
};

window.loginGoogle = () => signInWithPopup(auth, googleProvider);

window.signup = async () => {
    const nome = document.getElementById('userName').value;
    const e = document.getElementById('signup-email').value;
    const p = document.getElementById('signup-password').value;
    try {
        const res = await createUserWithEmailAndPassword(auth, e, p);
        await updateProfile(res.user, { displayName: nome });
        location.reload();
    } catch (err) { showAlert("Erro ao criar conta!"); }
};

window.logout = () => signOut(auth);

// --- DASHBOARD LOGIC ---
const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
let progressChart;

function initChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    if(progressChart) progressChart.destroy();
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f1f5f9'], borderWidth: 0 }] },
        options: { cutout: '80%', plugins: { tooltip: { enabled: false } } }
    });
}

// ÚNICO Observador de Autenticação
onAuthStateChanged(auth, (user) => {
    const appBox = document.getElementById('app-content');
    const authBox = document.getElementById('auth-container');
    const signupBox = document.getElementById('signup-container');
    
    // Splash Screen: some após 5s independente de tudo
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 5000);

    if (user) {
        authBox.style.display = 'none';
        signupBox.style.display = 'none';
        appBox.style.display = 'block';
        document.getElementById('user-email-display').innerText = user.displayName || user.email;
        renderizarAvatar(user);
        initChart();
        carregarHabitos(user.uid);
    } else {
        authBox.style.display = 'flex';
        appBox.style.display = 'none';
    }
});

function initChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    if(progressChart) progressChart.destroy();
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            datasets: [{ 
                data: [0, 100], 
                backgroundColor: ['#00d4ff', 'rgba(0, 212, 255, 0.1)'], // AZUL NEON E FUNDO TRANSPARENTE
                borderWidth: 0,
                hoverOffset: 0
            }] 
        },
        options: { 
            cutout: '85%', 
            plugins: { tooltip: { enabled: false } },
            animation: { animateRotate: true }
        }
    });
}

// --- CORE FUNCTIONS ---
window.adicionarHabito = async () => {
    const nome = document.getElementById('habitInput').value;
    if (!nome) return;
    const habitRef = doc(collection(db, "users", auth.currentUser.uid, "habits"), nome);
    await setDoc(habitRef, { nome, checks: {} });
    document.getElementById('habitInput').value = "";
};

function carregarHabitos(uid) {
    onSnapshot(collection(db, "users", uid, "habits"), (snap) => {
        renderizarTabela(snap.docs.map(d => d.data()));
    });
}

function renderizarTabela(habitos) {
    const grid = document.getElementById('habit-grid');
    const head = document.getElementById('header-row');
    const diaHoje = new Date().getDate();
    
    grid.innerHTML = "";
    head.innerHTML = '<th class="sticky-col">Tarefa</th>';

    for (let i = 1; i <= diasNoMes; i++) {
        const th = document.createElement('th');
        th.innerText = i;
        if(i === diaHoje) th.style.background = "#dbeafe";
        head.appendChild(th);
    }

    habitos.forEach(h => {
        const tr = document.createElement('tr');
        let html = `<td class="sticky-col">${h.nome}</td>`;
        for (let i = 1; i <= diasNoMes; i++) {
            const isChecked = h.checks && h.checks[i] ? "checked" : "";
            html += `<td><input type="checkbox" class="habit-check" data-habit="${h.nome}" data-day="${i}" ${isChecked}></td>`;
        }
        tr.innerHTML = html;
        grid.appendChild(tr);
    });
    atualizarProgresso();
}

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
    document.getElementById('percentage-label').innerText = porcento + "%";
}