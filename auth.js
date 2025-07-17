import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

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

// Tradução dos erros do Firebase
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

// Notificação amigável com cores
function showNotification(message, type = 'error') {
  const notif = document.getElementById("notification");
  notif.textContent = message;
  notif.className = `notification ${type}`;
  notif.classList.add("show");

  setTimeout(() => {
    notif.classList.remove("show");
  }, 4000);
}

// Login
loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
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
    await createUserWithEmailAndPassword(auth, email, password);
    showNotification("Conta criada com sucesso!", 'success');
    setTimeout(() => {
      window.location.href = './dashboard.html';
    }, 1500); // Espera um pouco para exibir a mensagem
  } catch (error) {
    const mensagem = traduzirErroFirebase(error.code);
    showNotification(mensagem, 'error');
  }
};

// Mostrar / esconder senha
document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
      button.setAttribute('aria-label', 'Esconder senha');
    } else {
      input.type = 'password';
      button.innerHTML = '<i class="fa-regular fa-eye"></i>';
      button.setAttribute('aria-label', 'Mostrar senha');
    }
  });
});
