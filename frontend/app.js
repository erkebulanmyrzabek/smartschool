const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toRegister = document.getElementById('to-register');
const toLogin = document.getElementById('to-login');

toRegister.addEventListener('click', (e)=>{
  e.preventDefault();
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});

toLogin.addEventListener('click', (e)=>{
  e.preventDefault();
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch('http://localhost:3000/api/auth/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email, password})
  });
  const data = await res.json();
  if(data.success){
    localStorage.setItem('token', data.token);
    window.location.href = 'dashboard.html';
  } else {
    alert(data.message);
  }
});

registerForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('role').value;

  const res = await fetch('http://localhost:3000/api/auth/register', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name,email,password,role})
  });
  const data = await res.json();
  if(data.success){
    alert('Тіркелу сәтті өтті!');
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  } else {
    alert(data.message);
  }
});
