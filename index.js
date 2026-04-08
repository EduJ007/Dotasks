import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, updateProfile,
    GoogleAuthProvider, signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDf8zO40aWn8r3eyibyOuLz4FMXXaDdkk4",
    authDomain: "dotasks-8038b.firebaseapp.com",
    projectId: "dotasks-8038b",
    storageBucket: "dotasks-8038b.firebasestorage.app",
    messagingSenderId: "14585516549",
    appId: "1:14585516549:web:38f2ffaf2eced575c8426c",
    measurementId: "G-8N1JL6NHTY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- TROCA DE MODAIS ---
window.toggleAuth = (isSignup) => {
    document.getElementById('auth-container').style.display = isSignup ? 'none' : 'flex';
    document.getElementById('signup-container').style.display = isSignup ? 'flex' : 'none';
};

// --- ALERTAS ---
window.showAlert = (msg) => {
    const alertBox = document.getElementById('custom-alert');
    document.getElementById('alert-message').innerText = msg;
    alertBox.classList.remove('alert-hidden');
    setTimeout(() => alertBox.classList.add('alert-hidden'), 4000);
};

// --- AUTENTICAÇÃO ---
window.login = async () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch (err) { showAlert("Erro: " + err.message); }
};

window.loginGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (err) { showAlert("Erro Google: " + err.message); }
};

window.signup = async () => {
    const nome = document.getElementById('userName').value;
    const e = document.getElementById('signup-email').value;
    const p = document.getElementById('signup-password').value;

    if(!nome) return showAlert("Diga-nos seu nome!");

    try {
        const res = await createUserWithEmailAndPassword(auth, e, p);
        await updateProfile(res.user, { displayName: nome });
    } catch (err) { showAlert("Erro: " + err.message); }
};

window.logout = () => signOut(auth);

// --- ESTADO DO USUÁRIO ---
onAuthStateChanged(auth, (user) => {
    const loginBox = document.getElementById('auth-container');
    const signupBox = document.getElementById('signup-container');
    const appBox = document.getElementById('app-content');
    
    if (user) {
        loginBox.style.display = 'none';
        signupBox.style.display = 'none';
        appBox.style.display = 'block';
        document.getElementById('user-email').innerText = "Olá, " + (user.displayName || user.email);
        carregarHabitos(user.uid);
    } else {
        loginBox.style.display = 'flex';
        appBox.style.display = 'none';
    }
});
// --- FUNÇÕES DE AUTENTICAÇÃO ---
window.login = async () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    if(!e || !p) return showAlert("Preencha e-mail e senha!");
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch (err) {
        showAlert("Erro no Login: " + err.message);
    }
};

window.signup = async () => {
    const nome = document.getElementById('userName').value;
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;

    if(!nome || !e || !p) {
        showAlert("Preencha todos os campos, inclusive seu nome!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, e, p);
        // Salva o nome do usuário no perfil do Firebase
        await updateProfile(userCredential.user, { displayName: nome });
        showAlert("Conta criada com sucesso, " + nome + "!");
    } catch (err) {
        showAlert("Erro no Cadastro: " + err.message);
    }
};

window.logout = () => signOut(auth);

// --- CONTROLE DE ESTADO (LOGIN/LOGOUT) ---
onAuthStateChanged(auth, (user) => {
    const authBox = document.getElementById('auth-container');
    const appBox = document.getElementById('app-content');
    
    if (user) {
        authBox.style.display = 'none';
        appBox.style.display = 'block';
        // Mostra o Nome (displayName) ou o e-mail caso o nome falhe
        document.getElementById('user-email').innerText = "Olá, " + (user.displayName || user.email);
        carregarHabitos(user.uid);
    } else {
        authBox.style.display = 'flex';
        appBox.style.display = 'none';
    }
});

// --- LÓGICA DO APP (PLANILHA E GRÁFICO) ---
const agora = new Date();
const diaHoje = agora.getDate();
const mesAtual = agora.getMonth();
const anoAtual = agora.getFullYear();
const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

const ctx = document.getElementById('progressChart').getContext('2d');
let progressChart = new Chart(ctx, {
    type: 'doughnut',
    data: { datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f1f5f9'], borderWidth: 0 }] },
    options: { cutout: '80%', plugins: { tooltip: { enabled: false } } }
});

window.adicionarHabito = async () => {
    const nome = document.getElementById('habitInput').value;
    if (!nome || !auth.currentUser) return;
    const habitRef = doc(collection(db, "users", auth.currentUser.uid, "habits"), nome);
    await setDoc(habitRef, { nome, checks: {} });
    document.getElementById('habitInput').value = "";
};

function carregarHabitos(uid) {
    onSnapshot(collection(db, "users", uid, "habits"), (snap) => {
        const habitos = snap.docs.map(d => d.data());
        renderizarTabela(habitos);
    });
}

function renderizarTabela(habitos) {
    const grid = document.getElementById('habit-grid');
    const head = document.getElementById('header-row');
    grid.innerHTML = "";
    head.innerHTML = '<th class="sticky-col">Tarefa</th>';

    for (let i = 1; i <= diasNoMes; i++) {
        if (i < diaHoje) continue;
        const th = document.createElement('th');
        th.innerText = i;
        if (i === diaHoje) th.style.backgroundColor = "#fef3c7";
        head.appendChild(th);
    }

    habitos.forEach(h => {
        const tr = document.createElement('tr');
        let html = `<td class="sticky-col">${h.nome}</td>`;
        for (let i = 1; i <= diasNoMes; i++) {
            if (i < diaHoje) continue;
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
        await setDoc(ref, { checks: { [day]: e.target.checked } }, { merge: true });
    }
});

function atualizarProgresso() {
    const checks = document.querySelectorAll('.habit-check');
    const marcados = Array.from(checks).filter(c => c.checked).length;
    const porcento = checks.length > 0 ? Math.round((marcados / checks.length) * 100) : 0;
    progressChart.data.datasets[0].data = [porcento, 100 - porcento];
    progressChart.update();
    document.getElementById('percentage-label').innerText = porcento + "%";
}