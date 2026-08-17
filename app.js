/* ============================================================================
   NivNish Training Hub LMS - Application Logic
   ============================================================================ */

let appState = {
  currentUser: null,
  currentView: 'home',
  users: [],
  quizzes: [],
  results: [],
  currentQuiz: null,
  timerInterval: null
};

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  loadSampleData();
  navigateTo('home');
});

function navigateTo(viewName) {
  if (viewName === 'admin') {
    if (!appState.currentUser || appState.currentUser.role !== 'admin') {
      viewName = 'admin-login';
    }
  }

  if (!appState.currentUser && ['dashboard', 'quiz', 'history'].includes(viewName)) {
    viewName = 'auth';
  }

  appState.currentView = viewName;
  document.querySelectorAll('section[id^="view-"]').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.remove('hidden');

  if (viewName === 'dashboard') loadStudentDashboard();
  if (viewName === 'history') loadStudentHistory();
  if (viewName === 'admin') loadAdminDashboard();
  window.scrollTo(0, 0);
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.remove('border-b-2', 'border-indigo-600', 'text-indigo-600');
    t.classList.add('text-gray-500');
  });
  event.target.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600');
  event.target.classList.remove('text-gray-500');

  document.querySelectorAll('.auth-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`auth-${tab}`).classList.remove('hidden');
}

function validatePasswordStrength(password) {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasLength = password.length >= 8;

  return hasLower && hasUpper && hasNumber && hasSpecial && hasLength;
}

function validatePhoneNumber(phone) {
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  return phoneRegex.test(phone);
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const user = appState.users.find(u => u.email === email && u.password === password);
  if (!user) {
    document.getElementById('loginMessage').textContent = 'Invalid email or password.';
    return;
  }
  appState.currentUser = user;
  saveToStorage();
  navigateTo(user.role === 'admin' ? 'admin' : 'dashboard');
}

function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminLoginEmail').value;
  const password = document.getElementById('adminLoginPassword').value;
  const user = appState.users.find(u => u.email === email && u.password === password && u.role === 'admin');
  if (!user) {
    document.getElementById('adminLoginMessage').textContent = 'Invalid admin credentials.';
    return;
  }
  appState.currentUser = user;
  saveToStorage();
  navigateTo('admin');
}

function openForgotPassword() {
  const email = prompt('Enter your registered email address for password recovery:');
  if (!email) return;
  const user = appState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    alert('No account found with this email address.');
    return;
  }
  const newPass = prompt('Enter your new secure password (must contain upper, lower, number, special character, min 8 chars):');
  if (!newPass) return;
  
  if (!validatePasswordStrength(newPass)) {
    alert('Password reset failed! Password does not meet security criteria.');
    return;
  }

  user.password = newPass;
  saveToStorage();
  alert('Password updated successfully! You can now log in with your new password.');
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!validatePhoneNumber(phone)) {
    document.getElementById('registerMessage').textContent = 'Invalid phone number format. Include country code starting with "+" (e.g., +919876543210).';
    return;
  }

  if (!validatePasswordStrength(password)) {
    document.getElementById('registerMessage').textContent = 'Password is too short or missing required criteria. Check the rules above.';
    return;
  }

  if (appState.users.find(u => u.email === email)) {
    document.getElementById('registerMessage').textContent = 'Email already registered.';
    return;
  }

  const newUser = { 
    id: 'usr_' + Date.now(), 
    name, 
    email, 
    phone, 
    password, 
    role: 'student' 
  };
  
  appState.users.push(newUser);
  appState.currentUser = newUser;
  saveToStorage();
  navigateTo('dashboard');
}

function logout() {
  appState.currentUser = null;
  saveToStorage();
  navigateTo('home');
}

function loadStudentDashboard() {
  document.getElementById('userDisplay').textContent = appState.currentUser.name;
  renderStudentQuizzes();
}

function renderStudentQuizzes() {
  const grid = document.getElementById('quizzesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  appState.quizzes.forEach(quiz => {
    const completed = appState.results.find(r => r.userId === appState.currentUser.id && r.quizId === quiz.id);
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg p-4 border border-gray-200 shadow-sm space-y-3';
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <h3 class="font-semibold text-base">${quiz.title}</h3>
        <span class="text-[11px] px-2 py-0.5 rounded font-bold ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
          ${completed ? 'Completed' : 'Available'}
        </span>
      </div>
      <p class="text-xs text-gray-500 leading-relaxed">${quiz.description || 'Enterprise training module.'}</p>
      <div class="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
        <span class="text-gray-400">${quiz.questions.length} questions • ${quiz.timeLimit || 15} mins</span>
        <button onclick="startQuiz('${quiz.id}')" class="px-3 py-1.5 rounded text-xs font-semibold ${completed ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}" ${completed ? 'disabled' : ''}>
          ${completed ? 'Completed' : 'Start Quiz'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterQuizzes() {
  const search = document.getElementById('quizSearch').value.toLowerCase();
  document.querySelectorAll('#quizzesGrid > div').forEach(card => {
    const title = card.querySelector('h3').textContent.toLowerCase();
    card.style.display = title.includes(search) ? '' : 'none';
  });
}

function startQuiz(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;
  const completed = appState.results.find(r => r.userId === appState.currentUser.id && r.quizId === quiz.id);
  if (completed) {
    alert('You have already completed this quiz. Only 1 attempt is allowed.');
    return;
  }
  appState.currentQuiz = { ...quiz, currentQuestion: 0, answers: {}, startTime: Date.now() };
  renderQuizRunner();
  navigateTo('quiz');
  startQuizTimer();
}

function renderQuizRunner() {
  const quiz = appState.currentQuiz;
  document.getElementById('quizTitle').textContent = quiz.title;
  const q = quiz.questions[quiz.currentQuestion];
  const form = document.getElementById('quizForm');
  form.innerHTML = `
    <div class="space-y-3">
      <div class="font-semibold text-sm">Question ${quiz.currentQuestion + 1} of ${quiz.questions.length}:</div>
      <div class="text-base text-gray-800">${q.question}</div>
      <div class="space-y-2 pt-2" id="optionsArea"></div>
    </div>
  `;

  const optionsArea = document.getElementById('optionsArea');
  q.options.forEach(opt => {
    const isChecked = quiz.answers[`q_${quiz.currentQuestion}`] === opt;
    const label = document.createElement('label');
    label.className = 'flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 text-sm';
    label.innerHTML = `
      <input type="radio" name="currentOpt" value="${opt}" ${isChecked ? 'checked' : ''} onchange="saveCurrentAnswer('${opt}')" class="text-indigo-600" />
      <span>${opt}</span>
    `;
    optionsArea.appendChild(label);
  });

  document.getElementById('questionProgress').textContent = `Question ${quiz.currentQuestion + 1} of ${quiz.questions.length}`;
  document.getElementById('prevQ').style.display = quiz.currentQuestion === 0 ? 'none' : 'inline-block';
  document.getElementById('nextQ').style.display = quiz.currentQuestion === quiz.questions.length - 1 ? 'none' : 'inline-block';
  document.getElementById('submitQuiz').style.display = quiz.currentQuestion === quiz.questions.length - 1 ? 'inline-block' : 'none';
}

function saveCurrentAnswer(val) {
  appState.currentQuiz.answers[`q_${appState.currentQuiz.currentQuestion}`] = val;
}

function previousQuestion() {
  if (appState.currentQuiz.currentQuestion > 0) {
    appState.currentQuiz.currentQuestion--;
    renderQuizRunner();
  }
}

function nextQuestion() {
  if (appState.currentQuiz.currentQuestion < appState.currentQuiz.questions.length - 1) {
    appState.currentQuiz.currentQuestion++;
    renderQuizRunner();
  }
}

function startQuizTimer() {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  const limitMs = (appState.currentQuiz.timeLimit || 15) * 60 * 1000;
  appState.timerInterval = setInterval(() => {
    const elapsed = Date.now() - appState.currentQuiz.startTime;
    const remaining = limitMs - elapsed;
    if (remaining <= 0) {
      clearInterval(appState.timerInterval);
      alert('Time limit expired. Auto-submitting quiz.');
      submitQuiz();
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const timerEl = document.getElementById('quizTimer');
    if (timerEl) timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

function submitQuiz() {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  const quiz = appState.currentQuiz;
  let score = 0;
  quiz.questions.forEach((q, i) => {
    if (quiz.answers[`q_${i}`] === q.correctAnswer) score += (q.marks || 1);
  });
  const totalMarks = quiz.questions.reduce((acc, q) => acc + (q.marks || 1), 0);
  const percentage = Math.round((score / totalMarks) * 100);
  const passed = percentage >= (quiz.passPercentage || 60);

  const result = {
    id: 'res_' + Date.now(),
    userId: appState.currentUser.id,
    userName: appState.currentUser.name,
    quizId: quiz.id,
    quizTitle: quiz.title,
    score,
    totalMarks,
    percentage,
    passed,
    submittedAt: new Date().toISOString()
  };

  appState.results.push(result);
  saveToStorage();
  alert(`Quiz submitted successfully!\nScore: ${score}/${totalMarks} (${percentage}%)\nStatus: ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
  navigateTo('dashboard');
}

function exitQuiz() {
  if (confirm('Are you sure you want to exit? Progress will be lost.')) {
    if (appState.timerInterval) clearInterval(appState.timerInterval);
    navigateTo('dashboard');
  }
}

function loadStudentHistory() {
  const list = document.getElementById('resultsList');
  if (!list) return;
  list.innerHTML = '';
  const myResults = appState.results.filter(r => r.userId === appState.currentUser.id);
  if (myResults.length === 0) {
    list.innerHTML = '<p class="text-sm text-gray-500">No past quiz attempts found.</p>';
    return;
  }
  myResults.forEach(r => {
    const item = document.createElement('div');
    item.className = 'p-4 rounded border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50';
    item.innerHTML = `
      <div>
        <div class="font-semibold text-sm">${r.quizTitle}</div>
        <div class="text-xs text-gray-500">Submitted: ${new Date(r.submittedAt).toLocaleDateString()}</div>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-right">
          <div class="text-sm font-bold ${r.passed ? 'text-emerald-600' : 'text-rose-600'}">${r.percentage}% (${r.score}/${r.totalMarks})</div>
          <div class="text-[10px] uppercase tracking-wider font-semibold text-gray-400">${r.passed ? 'Passed' : 'Failed'}</div>
        </div>
        ${r.passed ? `<button onclick="viewCertificate('${r.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold">Certificate</button>` : ''}
      </div>
    `;
    list.appendChild(item);
  });
}

function viewCertificate(resId) {
  const r = appState.results.find(res => res.id === resId);
  if (!r) return;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4 text-center relative text-gray-900 shadow-2xl">
      <div class="certificate">
        <div class="text-xs tracking-widest text-indigo-600 font-bold mb-2 uppercase">Certificate of Achievement</div>
        <h2 class="text-2xl font-black mb-1">NivNish Training Hub</h2>
        <div class="text-[11px] text-gray-500 mb-6">Pure For Sure LMS Verification Engine</div>
        <p class="text-xs text-gray-600">This verified credential is proudly presented to</p>
        <p class="text-xl font-bold my-2 text-indigo-900">${r.userName}</p>
        <p class="text-xs text-gray-600">for successfully passing the assessment module</p>
        <p class="text-lg font-semibold my-2">${r.quizTitle}</p>
        <div class="mt-6 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-500">
          <span>Score: ${r.percentage}%</span>
          <span>Date: ${new Date(r.submittedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="flex justify-center gap-3 pt-2">
        <button onclick="window.print()" class="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-semibold">Print Certificate</button>
        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded text-xs font-semibold">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function loadAdminDashboard() {
  renderAdminQuizzes();
  renderAdminStudents();
  renderAdminResults();
  renderAnalytics();
}

function renderAdminQuizzes() {
  const container = document.getElementById('adminQuizzes');
  if (!container) return;
  container.innerHTML = '';
  appState.quizzes.forEach(q => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded border border-gray-200 flex justify-between items-center text-xs';
    div.innerHTML = `<div><span class="font-semibold">${q.title}</span> • <span class="text-gray-400">${q.questions.length} questions</span></div><button onclick="deleteQuiz('${q.id}')" class="px-2 py-1 bg-rose-600 text-white rounded font-semibold">Delete</button>`;
    container.appendChild(div);
  });
}

function renderAdminStudents() {
  const container = document.getElementById('adminStudents');
  if (!container) return;
  container.innerHTML = '';
  appState.users.filter(u => u.role === 'student').forEach(s => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded border border-gray-200 flex justify-between items-center text-xs';
    div.innerHTML = `<div><span class="font-semibold">${s.name}</span> (${s.email}${s.phone ? ' - ' + s.phone : ''})</div><button onclick="deleteStudent('${s.id}')" class="px-2 py-1 bg-rose-600 text-white rounded font-semibold">Remove</button>`;
    container.appendChild(div);
  });
}

function renderAdminResults() {
  const container = document.getElementById('adminResults');
  if (!container) return;
  container.innerHTML = '';
  appState.results.forEach(r => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded border border-gray-200 flex justify-between items-center text-xs';
    div.innerHTML = `<div><span class="font-semibold">${r.userName}</span> tested on <em>${r.quizTitle}</em> — <strong class="${r.passed ? 'text-emerald-600' : 'text-rose-600'}">${r.percentage}%</strong></div><button onclick="deleteResult('${r.id}')" class="px-2 py-1 bg-rose-600 text-white rounded font-semibold">Delete</button>`;
    container.appendChild(div);
  });
}

function renderAnalytics() {
  const canvas = document.getElementById('gradesChart');
  if (!canvas) return;
  const passedCount = appState.results.filter(r => r.passed).length;
  const failedCount = appState.results.filter(r => !r.passed).length;
  if (window.myChartInstance) window.myChartInstance.destroy();
  window.myChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Passed', 'Failed'],
      datasets: [{ data: [passedCount, failedCount], backgroundColor: ['#10b981', '#f43f5e'] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function openCreateQuizModal() {
  const title = prompt('Enter new Quiz Title:');
  if (!title) return;
  const newQuiz = {
    id: 'quiz_' + Date.now(),
    title,
    description: 'Custom training module.',
    passPercentage: 60,
    timeLimit: 15,
    questions: [
      { id: 'q_0', question: 'What is the primary objective of NivNish Quality Assurance?', options: ['Ensure consistency', 'Reduce speed', 'Avoid testing', 'Ignore feedback'], correctAnswer: 'Ensure consistency', marks: 1 }
    ]
  };
  appState.quizzes.push(newQuiz);
  saveToStorage();
  loadAdminDashboard();
}

function deleteQuiz(id) {
  appState.quizzes = appState.quizzes.filter(q => q.id !== id);
  saveToStorage();
  loadAdminDashboard();
}

function deleteStudent(id) {
  appState.users = appState.users.filter(u => u.id !== id);
  saveToStorage();
  loadAdminDashboard();
}

function deleteResult(id) {
  appState.results = appState.results.filter(r => r.id !== id);
  saveToStorage();
  loadAdminDashboard();
}

function handleBulkImport(e) {
  alert('Simulated CSV bulk student import successful!');
}

function sendReminderEmails() {
  alert('Reminder emails successfully dispatched to students with pending modules.');
}

function saveToStorage() {
  localStorage.setItem('nivnish_appState', JSON.stringify(appState));
}

function loadFromStorage() {
  const data = localStorage.getItem('nivnish_appState');
  if (data) {
    try { appState = { ...appState, ...JSON.parse(data) }; } catch (err) {}
  }
}

function loadSampleData() {
  if (appState.users.length === 0) {
    appState.users.push(
      { id: 'usr_admin', name: 'Admin User', email: 'admin@nivnish.com', phone: '+919876543210', password: 'Admin@123', role: 'admin' },
      { id: 'usr_demo', name: 'Demo Student', email: 'student@demo.com', phone: '+919123456789', password: 'Student@123', role: 'student' }
    );
  }
  if (appState.quizzes.length === 0) {
    appState.quizzes.push({
      id: 'quiz_01',
      title: 'JavaScript & Systems Fundamentals',
      description: 'Core programming concepts, ES6 execution models, and state handling.',
      passPercentage: 60,
      timeLimit: 15,
      questions: [
        { id: 'q_0', question: 'Which keyword defines a constant variable in JavaScript?', options: ['var', 'let', 'const', 'static'], correctAnswer: 'const', marks: 1 },
        { id: 'q_1', question: 'What does DOM stand for?', options: ['Document Object Model', 'Data Oriented Module', 'Digital Object Method', 'Direct Online Management'], correctAnswer: 'Document Object Model', marks: 1 }
      ]
    });
  }
  saveToStorage();
}
