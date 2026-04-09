import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, 
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

// --- UI HELPERS ---
window.showAlert = (msg) => {
    const alertBox = document.getElementById('custom-alert');
    document.getElementById('alert-message').innerText = msg;
    alertBox.style.display = 'block';
    setTimeout(() => alertBox.style.display = 'none', 3500);
};

window.toggleInput = (show) => {
    document.getElementById('btn-show-input').style.display = show ? 'none' : 'block';
    document.getElementById('input-container').style.display = show ? 'flex' : 'none';
    if(show) document.getElementById('habitInput').focus();
};

// --- AUTH ---
window.login = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    if(!e || !p) return showAlert("FILL ALL FIELDS");
    signInWithEmailAndPassword(auth, e, p).catch(() => showAlert("ACCESS DENIED"));
};

window.loginGoogle = () => signInWithPopup(auth, googleProvider).catch(() => showAlert("SYNC ERROR"));
window.logout = () => signOut(auth);

// --- CORE SYSTEM ---
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

window.adicionarHabito = async () => {
    const nome = document.getElementById('habitInput').value;
    if (!nome) return;
    try {
        await setDoc(doc(db, "users", auth.currentUser.uid, "habits", nome), { nome, checks: {} });
        window.toggleInput(false);
        document.getElementById('habitInput').value = '';
        showAlert("QUEST ACCEPTED");
    } catch (e) { showAlert("SYSTEM ERROR"); }
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
        if(i === diaHoje) th.style.boxShadow = "inset 0 -2px 0 var(--sl-blue)";
        head.appendChild(th);
    }

    habitos.forEach(h => {
        const tr = document.createElement('tr');
        let html = `<td class="sticky-col">
            <span onclick="deletarHabito('${h.nome}')" style="color:#ff4d4d; cursor:pointer; margin-right:8px;">[X]</span> ${h.nome}
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

// Checkbox Listener
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
        document.getElementById('user-email-display').innerText = user.email.split('@')[0];
        
        // Avatar
        const avatar = document.getElementById('user-avatar');
        avatar.innerText = user.photoURL ? "" : user.email[0].toUpperCase();
        if(user.photoURL) avatar.style.backgroundImage = `url(${user.photoURL})`;
        
        initChart();
        onSnapshot(collection(db, "users", user.uid, "habits"), (snap) => {
            renderizarTabela(snap.docs.map(d => d.data()));
        });
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});