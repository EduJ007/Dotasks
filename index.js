import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut 
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

// --- FUNÇÃO DE ALERTA REAL ---
window.showAlert = (msg) => {
    const alertBox = document.getElementById('custom-alert');
    alertBox.innerText = msg;
    alertBox.style.display = 'block';
    setTimeout(() => alertBox.style.display = 'none', 4000);
};

// --- ALTERNAR LOGIN / CRIAÇÃO ---
let isSignUpMode = false;
window.toggleAuthMode = () => {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Criar Nova Conta" : "Entrar no Sistema";
    document.getElementById('auth-switch-text').innerText = isSignUpMode ? "Já tem conta?" : "Não tem conta?";
    document.getElementById('auth-toggle-link').innerText = isSignUpMode ? "Entrar" : "Criar conta";
    document.getElementById('main-auth-btn').innerText = isSignUpMode ? "Cadastrar" : "Entrar";
};

// --- LOGIN E CADASTRO ---
window.executarAuth = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        return showAlert("Preencha todos os campos!");
    }

    try {
        if (isSignUpMode) {
            await createUserWithEmailAndPassword(auth, email, password);
            showAlert("Conta criada com sucesso!");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        console.error(error.code);
        if (error.code === 'auth/invalid-credential') showAlert("E-mail ou senha incorretos.");
        else if (error.code === 'auth/weak-password') showAlert("A senha deve ter pelo menos 6 caracteres.");
        else if (error.code === 'auth/email-already-in-use') showAlert("Este e-mail já está em uso.");
        else showAlert("Erro: " + error.code);
    }
};

window.logout = () => signOut(auth);

// --- LÓGICA DO DASHBOARD ---
const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

window.adicionarHabito = async () => {
    const nome = document.getElementById('habitInput').value;
    if (!nome) return showAlert("Digite o nome do hábito!");
    
    try {
        await setDoc(doc(db, "users", auth.currentUser.uid, "habits", nome), { nome, checks: {} });
        document.getElementById('habitInput').value = '';
    } catch (e) { showAlert("Erro ao salvar no banco de dados."); }
};

window.toggleCheck = async (habitNome, dia, statusAtual) => {
    const ref = doc(db, "users", auth.currentUser.uid, "habits", habitNome);
    const updateObj = {};
    updateObj[`checks.${dia}`] = !statusAtual;
    await updateDoc(ref, updateObj);
};

window.deletarHabito = async (nome) => {
    if(confirm("Deseja excluir este hábito?")) {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "habits", nome));
    }
};

function renderizarTabela(habitos) {
    const grid = document.getElementById('habit-grid');
    const headerRow = document.getElementById('header-row');
    
    // Gerar Cabeçalho (Dias)
    headerRow.innerHTML = '<th>Hábito</th>';
    for (let i = 1; i <= diasNoMes; i++) {
        headerRow.innerHTML += `<th>${i}</th>`;
    }

    grid.innerHTML = "";
    habitos.forEach(h => {
        let html = `<tr><td><span class="delete-btn" onclick="deletarHabito('${h.nome}')">✕</span>${h.nome}</td>`;
        for (let i = 1; i <= diasNoMes; i++) {
            const isChecked = h.checks && h.checks[i] ? 'checked' : '';
            html += `<td>
                <div class="check-container ${isChecked}" onclick="toggleCheck('${h.nome}', ${i}, ${!!isChecked})"></div>
            </td>`;
        }
        html += `</tr>`;
        grid.innerHTML += html;
    });
}

// --- MONITOR DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('user-display').innerText = `Olá, ${user.email}`;
        
        onSnapshot(collection(db, "users", user.uid, "habits"), (snap) => {
            renderizarTabela(snap.docs.map(d => d.data()));
        });
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});