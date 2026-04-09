import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup 
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

// --- SISTEMA DE ALERTAS ---
window.showAlert = (msg) => {
    const alertBox = document.getElementById('custom-alert');
    document.getElementById('alert-message').innerText = msg;
    alertBox.style.display = 'block';
    setTimeout(() => alertBox.style.display = 'none', 4000);
};

// --- AUTH LOGIC (LOGIN / REGISTER) ---
let isSignUpMode = false;

window.toggleAuthMode = () => {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('main-auth-btn');
    const switchText = document.getElementById('auth-switch-text');
    const link = document.getElementById('auth-toggle-link');

    if (isSignUpMode) {
        title.innerText = "NEW REGISTRATION";
        btn.innerText = "CREATE PLAYER";
        switchText.innerText = "ALREADY A HUNTER?";
        link.innerText = "LOG IN";
    } else {
        title.innerText = "PLAYER LOGIN";
        btn.innerText = "ENTER GATE";
        switchText.innerText = "NEW PLAYER?";
        link.innerText = "CREATE ACCOUNT";
    }
};

window.executarAuth = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return showAlert("MISSING CREDENTIALS!");

    try {
        if (isSignUpMode) {
            await createUserWithEmailAndPassword(auth, email, password);
            showAlert("WELCOME, HUNTER!");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        switch (error.code) {
            case 'auth/invalid-credential': showAlert("ERROR: INVALID ACCESS KEY"); break;
            case 'auth/email-already-in-use': showAlert("ERROR: PLAYER ALREADY EXISTS"); break;
            case 'auth/weak-password': showAlert("ERROR: PASSWORD TOO WEAK"); break;
            case 'auth/invalid-email': showAlert("ERROR: MALFORMED E-MAIL"); break;
            case 'auth/user-not-found': showAlert("ERROR: PLAYER NOT FOUND"); break;
            default: showAlert("SYSTEM ERROR: " + error.code);
        }
    }
};

window.loginGoogle = () => signInWithPopup(auth, googleProvider).catch(() => showAlert("SYNC ERROR"));
window.logout = () => signOut(auth);

// --- DASHBOARD LOGIC ---
const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
let progressChart;

function initChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    if(progressChart) progressChart.destroy();
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: ['#00d4ff', '#111'], borderWidth: 0 }] },
        options: { cutout: '80%', plugins: { tooltip: { enabled: false } } }
    });
}

window.toggleInput = (show) => {
    document.getElementById('btn-show-input').style.display = show ? 'none' : 'block';
    document.getElementById('input-container').style.display = show ? 'flex' : 'none';
};

window.adicionarHabito = async () => {
    const nome = document.getElementById('habitInput').value;
    if (!nome) return;
    try {
        await setDoc(doc(db, "users", auth.currentUser.uid, "habits", nome), { nome, checks: {} });
        document.getElementById('habitInput').value = '';
        toggleInput(false);
    } catch (e) { showAlert("QUEST FAILED TO REGISTER"); }
};

window.deletarHabito = async (nome) => {
    if (confirm(`ABANDON QUEST: ${nome}?`)) {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "habits", nome));
    }
};

function renderizarTabela(habitos) {
    const grid = document.getElementById('habit-grid');
    const head = document.getElementById('header-row');
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
        let html = `<td class="sticky-col">
            <span onclick="deletarHabito('${h.nome}')" style="color:#ff4d4d; cursor:pointer; margin-right:8px; font-weight:bold;">[X]</span> ${h.nome}
        </td>`;
        for (let i = 1; i <= diasNoMes; i++) {
            const checked = h.checks && h.checks[i] ? "checked" : "";
            html += `<td><input type="checkbox" class="habit-check" data-habit="${h.nome}" data-day="${i}" ${checked}></td>`;
        }
        tr.innerHTML = html;
        grid.appendChild(tr);
    });
    atualizarProgresso();
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

document.addEventListener('change', async (e) => {
    if (e.target.classList.contains('habit-check')) {
        const { habit, day } = e.target.dataset;
        const ref = doc(db, "users", auth.currentUser.uid, "habits", habit);
        const updateObj = {};
        updateObj[`checks.${day}`] = e.target.checked;
        await updateDoc(ref, updateObj);
    }
});

// --- AUTH OBSERVER ---
onAuthStateChanged(auth, (user) => {
    document.getElementById('loading-screen').style.display = 'none';
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('user-email-display').innerText = user.email;
        
        const avatar = document.getElementById('user-avatar');
        if(user.photoURL) {
            avatar.style.backgroundImage = `url(${user.photoURL})`;
            avatar.innerText = "";
        } else {
            avatar.innerText = user.email[0].toUpperCase();
            avatar.style.backgroundImage = "none";
            avatar.style.backgroundColor = "#00d4ff";
            avatar.style.color = "black";
        }
        
        initChart();
        onSnapshot(collection(db, "users", user.uid, "habits"), (snap) => {
            renderizarTabela(snap.docs.map(d => d.data()));
        });
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});