import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDtnzixicBYAQkuoeB5tgCGpDLt1lByMZo",
  authDomain: "apropriacao-estrutura.firebaseapp.com",
  projectId: "apropriacao-estrutura",
  storageBucket: "apropriacao-estrutura.appspot.com",
  messagingSenderId: "155266586257",
  appId: "1:155266586257:web:6d70edc967cdbfc56e5130"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Cache do UID
function setCachedUID(uid) {
  localStorage.setItem('uid', uid);
}
function getCachedUID() {
  return localStorage.getItem('uid');
}
function clearCachedUID() {
  localStorage.removeItem('uid');
}

// Verifica UID ao carregar a página
window.addEventListener('DOMContentLoaded', async () => {
  const uid = getCachedUID();

  if (!uid) {
    // Espera Firebase informar se o usuário está logado
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setCachedUID(user.uid);
        window.location.href = './dashboard.html'; // já logado, vai pra dashboard
      } else {
        // Nenhum UID no cache e não logado → força exibir login
        const container = document.querySelector('.container');
if (container) {
  container.style.display = 'block';
}
      }
    });
  } else {
    // UID já está no cache → assume que já está logado
    window.location.href = './dashboard.html';
  }
});

// Elementos
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showLoginBtn = document.getElementById('showLogin');
const showRegisterBtn = document.getElementById('showRegister');

// Alternar formulários
showLoginBtn.onclick = () => {
  loginForm.classList.add('active');
  registerForm.classList.remove('active');
  showLoginBtn.classList.add('active');
  showRegisterBtn.classList.remove('active');
};
showRegisterBtn.onclick = () => {
  loginForm.classList.remove('active');
  registerForm.classList.add('active');
  showLoginBtn.classList.remove('active');
  showRegisterBtn.classList.add('active');
};

// Traduz erros
function traduzirErroFirebase(codigoErro, contexto = '') {
  if (contexto === 'login') {
    if (codigoErro === 'auth/user-not-found' || codigoErro === 'auth/wrong-password') {
      return 'Email ou senha incorretos.';
    }
  }

  switch (codigoErro) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado.';
    case 'auth/invalid-email':
      return 'O e-mail inserido é inválido.';
    case 'auth/weak-password':
      return 'A senha deve conter pelo menos 6 caracteres.';
    case 'auth/missing-password':
      return 'Por favor, insira uma senha.';
    default:
      return 'Ocorreu um erro. Tente novamente.';
  }
}

// Notificação visual
function showNotification(message, type = 'error') {
  const notif = document.getElementById("notification");
  notif.textContent = message;
  notif.className = `notification ${type}`;
  notif.classList.add("show");
  setTimeout(() => notif.classList.remove("show"), 4000);
}

// Login
loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setCachedUID(cred.user.uid); // Salva UID no cache
    window.location.href = './dashboard.html';
  } catch (error) {
    const mensagem = traduzirErroFirebase(error.code, 'login');
    showNotification(mensagem, 'error');
  }
};

// Registro
registerForm.onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    setCachedUID(cred.user.uid); // Salva UID no cache
    showNotification("Conta criada com sucesso!", 'success');
    setTimeout(() => {
      window.location.href = './dashboard.html';
    }, 1500);
  } catch (error) {
    const mensagem = traduzirErroFirebase(error.code);
    showNotification(mensagem, 'error');
  }
};

// Mostrar/esconder senha
document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
    } else {
      input.type = 'password';
      button.innerHTML = '<i class="fa-regular fa-eye"></i>';
    }
  });
});
