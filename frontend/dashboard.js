/* dashboard.js
  - Талап: бекенд /api/auth/me, /api/chat, /api/lessons, /api/grades қолдауы тиіс.
  - Token (JWT) localStorage 'token' ретінде болуы керек (login бетінде алынған).
*/

/* ----------------- Helpers ----------------- */
const API_BASE = (location.hostname === 'localhost' ? 'http://localhost:3000' : '') + '/api';
const tokenKey = 'token';

function getToken(){ return localStorage.getItem(tokenKey); }
function saveToken(t){ localStorage.setItem(tokenKey, t); }
function clearToken(){ localStorage.removeItem(tokenKey); }

async function apiGet(path){
  const t = getToken();
  const res = await fetch(API_BASE + path, { headers: t ? { 'Authorization': 'Bearer ' + t } : {} });
  if(res.status === 401) throw new Error('Unauthorized');
  return res.json();
}
async function apiPost(path, body){
  const t = getToken();
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: Object.assign({'Content-Type':'application/json'}, t ? { 'Authorization': 'Bearer ' + t } : {}),
    body: JSON.stringify(body)
  });
  if(res.status === 401) throw new Error('Unauthorized');
  return res.json();
}

/* ----------------- Authentication & Init ----------------- */
let ME = null;
let socket = null;

async function init(){
  // redirect to login if no token
  const token = getToken();
  if(!token){ redirectToLogin(); return; }

  try {
    const meResp = await apiGet('/auth/me');
    if(!meResp.success || !meResp.user){ redirectToLogin(); return; }
    ME = meResp.user;
    renderProfile();
    setupSocket();
    bindNav();
    showView('overview');
    // load initial data
    await loadOverview();
    await loadRecentChats();
    await loadLessons();
    await loadGrades();
    if(ME.role === 'admin') { document.getElementById('nav-admin').style.display = 'block'; loadAdminUsers(); }
  } catch (err){
    console.error('init error', err);
    redirectToLogin();
  }
}

function redirectToLogin(){
  alert('Сіз жүйеге кірмегенсіз — кіру бетіне бағыттаймыз.');
  window.location.href = 'login.html';
}

/* ----------------- UI rendering ----------------- */
function renderProfile(){
  document.getElementById('user-name').innerText = ME.name;
  document.getElementById('user-email').innerText = ME.email;
  document.getElementById('user-role').innerText = ME.role.toUpperCase();
}

/* ----------------- Navigation ----------------- */
function bindNav(){
  const buttons = Array.from(document.querySelectorAll('.nav-btn'));
  buttons.forEach(btn=>{
    btn.addEventListener('click', ()=> {
      buttons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showView(btn.dataset.view);
    });
  });

  document.getElementById('btn-logout').addEventListener('click', ()=>{ clearToken(); window.location.href = 'login.html'; });
}

/* ----------------- Show views ----------------- */
function showView(view){
  const views = document.querySelectorAll('.view');
  views.forEach(v=>v.classList.add('hidden'));
  const el = document.getElementById('view-' + view);
  if(el) el.classList.remove('hidden');
}

/* ----------------- Socket.io ----------------- */
function setupSocket(){
  const url = (location.hostname === 'localhost' ? 'http://localhost:3000' : '');
  socket = io(url, { transports: ['websocket', 'polling'] });

  socket.on('connect', ()=> {
    console.log('socket connected', socket.id);
    // join personal room so server can send private messages
    if(ME && ME.id) socket.emit('join', ME.id);
  });

  socket.on('message', (msg) => {
    // append to chat window(s)
    appendMessageToChat(msg);
    appendMessageToOverview(msg);
  });

  socket.on('disconnect', ()=> console.log('socket disconnected'));
}

/* ----------------- Chat UI & API ----------------- */
async function loadRecentChats(){
  try {
    const chats = await apiGet('/chat?userId=' + ME.id);
    renderChatMessages(chats);
    renderOverviewMessages(chats.slice(-6)); // last few
  } catch (err) {
    console.error('loadRecentChats', err);
  }
}

function renderChatMessages(chats){
  const el = document.getElementById('chat-messages');
  el.innerHTML = chats.map(m => renderMsgHtml(m)).join('');
  el.scrollTop = el.scrollHeight;
}

function renderOverviewMessages(chats){
  const el = document.getElementById('overview-messages');
  el.innerHTML = chats.map(m => `<div class="msg"><div class="meta">${escapeHtml(m.sender_name)} · ${new Date(m.created_at).toLocaleTimeString()}</div><div>${escapeHtml(m.text)}</div></div>`).join('');
}

/* append a single message triggered by socket */
function appendMessageToChat(m){
  const el = document.getElementById('chat-messages');
  if(!el) return;
  el.insertAdjacentHTML('beforeend', renderMsgHtml(m));
  el.scrollTop = el.scrollHeight;
}
function appendMessageToOverview(m){
  const el = document.getElementById('overview-messages');
  if(!el) return;
  el.insertAdjacentHTML('beforeend', `<div class="msg"><div class="meta">${escapeHtml(m.sender_name)} · ${new Date(m.created_at).toLocaleTimeString()}</div><div>${escapeHtml(m.text)}</div></div>`);
  // keep only latest 8
  while(el.children.length > 8) el.removeChild(el.firstChild);
}

function renderMsgHtml(m){
  const isMe = m.sender_id === ME.id;
  const cls = isMe ? 'msg me' : 'msg';
  const privateLabel = m.is_private ? ' <strong>(жеке)</strong>' : '';
  return `<div class="${cls}"><div class="meta">${escapeHtml(m.sender_name)} · ${new Date(m.created_at).toLocaleString()}${privateLabel}</div><div>${escapeHtml(m.text)}</div></div>`;
}

/* send chat */
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'chat-send'){
    sendChatMessage();
  }
  if(e.target && e.target.id === 'refresh-chat'){
    loadRecentChats();
  }
});

async function sendChatMessage(){
  const text = document.getElementById('chat-text').value.trim();
  if(!text) return alert('Хабарлама жазып қойыңыз');
  const scope = document.getElementById('chat-scope').value;
  const isPrivate = scope === 'private';
  const privateToId = isPrivate ? Number(document.getElementById('chat-private-to').value || 0) : null;
  const payload = {
    text,
    is_private: isPrivate,
    private_to_id: privateToId || null
  };

  try {
    // save via REST (so DB stat persists)
    const saved = await apiPost('/chat', payload);
    // also broadcast via socket for instant view (server socket listener broadcasts DB entry)
    if(socket) socket.emit('sendMessage', Object.assign({
      sender_id: ME.id,
      sender_name: ME.name
    }, payload));
    // clear field
    document.getElementById('chat-text').value = '';
    // append immediately
    appendMessageToChat(saved);
  } catch (err) {
    console.error('sendChatMessage', err);
    alert('Хабарлама жіберу сәтсіз — консольді тексеріңіз');
  }
}

/* show/hide private input */
document.getElementById('chat-scope').addEventListener('change', (e)=>{
  document.getElementById('private-to-wrap').style.display = e.target.value === 'private' ? 'block' : 'none';
});

/* ----------------- Lessons (schedule) ----------------- */
async function loadLessons(){
  try{
    // teachers may want their own lessons; admin sees all
    let url = '/lessons';
    if(ME.role === 'teacher') url = '/lessons?teacherId=' + ME.id;
    const lessons = await apiGet(url);
    const tbody = document.querySelector('#lessons-table tbody');
    tbody.innerHTML = lessons.map(l => `<tr><td>${escapeHtml(l.lesson_date)}</td><td>${escapeHtml(l.lesson_time)}</td><td>${escapeHtml(l.subject)}</td><td>${escapeHtml(l.teacher_name)}</td></tr>`).join('');
    document.getElementById('stat-lessons-val').innerText = lessons.length;
  }catch(err){ console.error('loadLessons', err); }
}

document.getElementById('lesson-add').addEventListener('click', async ()=>{
  const subject = document.getElementById('lesson-subject').value.trim();
  const lesson_date = document.getElementById('lesson-date').value;
  const lesson_time = document.getElementById('lesson-time').value;
  const topic = document.getElementById('lesson-topic').value.trim();
  if(!subject || !lesson_date || !lesson_time) return alert('Барлық өрістер толтырылсын');

  // teacher can only add for self; admin can add for any teacher (we will default teacher_id to ME.id)
  const payload = {
    subject,
    lesson_date,
    lesson_time,
    topic,
    teacher_id: ME.role === 'teacher' ? ME.id : ME.id
  };
  try {
    const res = await apiPost('/lessons', payload);
    alert('Сабақ қосылды');
    // refresh lessons
    loadLessons();
  } catch (err) {
    console.error('lesson add', err); alert('Сабақ қосу сәтсіз');
  }
});
document.getElementById('lesson-refresh').addEventListener('click', loadLessons);

/* ----------------- Grades ----------------- */
async function loadGrades(){
  try {
    // students see only their grades; teachers/admin see many
    let url = '/grades';
    if(ME.role === 'student') url = '/grades?studentId=' + ME.id;
    const grades = await apiGet(url);
    const tbody = document.querySelector('#grades-table tbody');
    const usersCache = {}; // we show student id for now (backend can join names)
    tbody.innerHTML = grades.map(g => `<tr><td>${escapeHtml(String(g.student_id))}</td><td>${escapeHtml(g.subject)}</td><td>${escapeHtml(String(g.score))}</td></tr>`).join('');
  } catch (err){ console.error('loadGrades', err); }
}

document.getElementById('grade-add').addEventListener('click', async ()=>{
  const student_id = Number(document.getElementById('grade-student-id').value);
  const subject = document.getElementById('grade-subject').value.trim();
  const score = Number(document.getElementById('grade-score').value);
  if(!student_id || !subject || isNaN(score)) return alert('Барлық өрістер толтырылсын');
  try {
    const res = await apiPost('/grades', { student_id, subject, score });
    alert('Баға қосылды');
    loadGrades();
  } catch(err){ console.error('add grade', err); alert('Баға қосу сәтсіз немесе рұқсат жоқ'); }
});
document.getElementById('grades-refresh').addEventListener('click', loadGrades);

/* ----------------- Overview (counts) ----------------- */
async function loadOverview(){
  try {
    const lessons = await apiGet('/lessons');
    // for counts of users we may need admin endpoint; try /admin/users else fall back
    let usersCount = { students: 0, teachers: 0 };
    try {
      const usersResp = await apiGet('/admin/users'); // optional endpoint
      if(Array.isArray(usersResp)) {
        usersCount.students = usersResp.filter(u=>u.role==='student').length;
        usersCount.teachers = usersResp.filter(u=>u.role==='teacher').length;
      }
    } catch(_){
      // fallback: get small info from lessons/grades
      // can't compute reliably — leave dash values conservative
    }
    document.getElementById('stat-lessons-val').innerText = lessons.length;
    document.getElementById('stat-students-val').innerText = usersCount.students || '—';
    document.getElementById('stat-teachers-val').innerText = usersCount.teachers || '—';
  } catch(err){ console.error('loadOverview', err); }
}

/* ----------------- Admin users (if endpoint exists) ----------------- */
async function loadAdminUsers(){
  try {
    const users = await apiGet('/admin/users'); // backend may expose this to admins
    const tbody = document.querySelector('#admin-users-table tbody');
    tbody.innerHTML = users.map(u => `<tr><td>${u.id}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td></tr>`).join('');
  } catch(err){
    console.warn('admin users not available', err);
    const wrap = document.getElementById('admin-users-wrap');
    wrap.innerHTML = '<div class="muted">Admin-only endpoint жоқ немесе қол жетімді емес.</div>';
  }
}

/* ----------------- Utility ----------------- */
function escapeHtml(str){
  if(str == null) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

/* ----------------- On load ----------------- */
window.addEventListener('load', ()=> {
  init().catch(e=>console.error(e));
});
