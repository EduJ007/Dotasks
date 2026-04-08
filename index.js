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

// --- UI HELPERS ---
window.showAlert = (msg) => {
    const alertBox = document.getElementById('custom-alert');
    document.getElementById('alert-message').innerText = msg;
    alertBox.classList.remove('alert-hidden');
    setTimeout(() => alertBox.classList.add('alert-hidden'), 3000);
};

window.toggleAuth = (isSignup) => {
    document.getElementById('auth-container').style.display = isSignup ? 'none' : 'flex';
    document.getElementById('signup-container').style.display = isSignup ? 'flex' : 'none';
};

window.toggleProfileMenu = () => {
    const menu = document.getElementById('profile-menu');
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
};

// --- AUTH ---
window.login = async () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch (err) { showAlert("Dados inválidos!"); }
};

window.loginGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (err) { showAlert("Erro no login Google"); }
};

window.signup = async () => {
    const nome = document.getElementById('userName').value;
    const e = document.getElementById('signup-email').value;
    const p = document.getElementById('signup-password').value;
    if(!nome) return showAlert("Insira seu nome!");
    try {
        const res = await createUserWithEmailAndPassword(auth, e, p);
        await updateProfile(res.user, { displayName: nome });
        location.reload(); 
    } catch (err) { showAlert("Erro ao criar conta"); }
};

window.logout = () => signOut(auth);

window.changeName = async () => {
    const novoNome = prompt("Digite seu novo nome:");
    if(novoNome && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: novoNome });
        document.getElementById('user-display-name').innerText = novoNome;
        showAlert("Nome atualizado!");
    }
};

// --- CORE APP ---
const agora = new Date();
const diaHoje = agora.getDate();
const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();

let progressChart;
function initChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: ['#3b82f6', '#f1f5f9'], borderWidth: 0 }] },
        options: { cutout: '80%', plugins: { tooltip: { enabled: false } } }
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('signup-container').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        
        // Perfil UI
        document.getElementById('user-display-name').innerText = user.displayName || "Usuário";
        const photoEl = document.getElementById('user-photo');
        if(user.photoURL) photoEl.src = user.photoURL;
        else photoEl.style.display = 'none'; // Mostra o background colorido se não tiver foto

        initChart();
        carregarHabitos(user.uid);
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

// (Mantenha as funções carregarHabitos, renderizarTabela e atualizarProgresso que já tínhamos)
// Adicionei apenas o listener de clique para salvar no banco

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
        const th = document.createElement('th');
        th.innerText = i;
        if (i === diaHoje) th.style.color = "#3b82f6";
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