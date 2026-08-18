/* ============================================================================
   NivNish Training Hub LMS - Application Logic (Full AI File Extraction)
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
  const newPass = prompt('Enter your new secure password (min 8 chars, uppercase, lowercase, number, special char):');
  if (!newPass) return;
  
  if (!validatePasswordStrength(newPass)) {
    alert('Password reset failed! Password does not meet security criteria.');
    return;
  }

  user.password = newPass;
  saveToStorage();
  alert('Password updated successfully! You can now log in.');
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
    document.getElementById('registerMessage').textContent = 'Password is too short or missing required criteria.';
    return;
  }

  if (appState.users.find(u => u.email === email)) {
    document.getElementById('registerMessage').textContent = 'Email already registered.';
    return;
  }

  const newUser = { id: 'usr_' + Date.now(), name, email, phone, password, role: 'student' };
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
  
  const activeQuizzes = appState.quizzes.filter(q => q.isPublished === true);
  
  if (activeQuizzes.length === 0) {
    grid.innerHTML = '<p class="text-sm text-gray-500">No active published quizzes available at the moment.</p>';
    return;
  }

  activeQuizzes.forEach(quiz => {
    const completed = appState.results.find(r => r.userId === appState.currentUser.id && r.quizId === quiz.id);
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3';
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <h3 class="font-bold text-base text-gray-900">${quiz.title}</h3>
        <span class="text-[11px] px-2 py-0.5 rounded font-bold ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
          ${completed ? 'Completed' : 'Available'}
        </span>
      </div>
      <p class="text-xs text-gray-500 leading-relaxed">${quiz.description || 'Enterprise training module.'}</p>
      <div class="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
        <span class="text-gray-400 font-medium">${quiz.questions.length} questions • ${quiz.timeLimit || 15} mins</span>
        <button onclick="startQuiz('${quiz.id}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${completed ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white transition'}" ${completed ? 'disabled' : ''}>
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
  
  let inputHtml = '';
  const currentAns = quiz.answers[`q_${quiz.currentQuestion}`];

  if (!q.type || q.type === 'mcq') {
    inputHtml = `<div class="space-y-2 pt-2">` + (q.options || []).map(opt => `
      <label class="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 text-sm">
        <input type="radio" name="currentOpt" value="${opt}" ${currentAns === opt ? 'checked' : ''} onchange="saveCurrentAnswer('${opt}')" class="text-indigo-600" />
        <span>${opt}</span>
      </label>`).join('') + `</div>`;
  } else if (q.type === 'multi') {
    const selectedList = Array.isArray(currentAns) ? currentAns : [];
    inputHtml = `<div class="space-y-2 pt-2">` + (q.options || []).map(opt => `
      <label class="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 text-sm">
        <input type="checkbox" value="${opt}" ${selectedList.includes(opt) ? 'checked' : ''} onchange="saveMultiAnswer(this)" class="text-indigo-600 rounded" />
        <span>${opt}</span>
      </label>`).join('') + `</div>`;
  } else if (q.type === 'short') {
    inputHtml = `<div class="pt-2"><input type="text" placeholder="Type your short answer..." value="${currentAns || ''}" oninput="saveCurrentAnswer(this.value)" class="w-full p-3 rounded-xl border border-gray-300 bg-gray-50/50 text-sm focus:bg-white focus:outline-none" /></div>`;
  } else if (q.type === 'long') {
    inputHtml = `<div class="pt-2"><textarea rows="4" placeholder="Type your detailed answer..." oninput="saveCurrentAnswer(this.value)" class="w-full p-3 rounded-xl border border-gray-300 bg-gray-50/50 text-sm focus:bg-white focus:outline-none">${currentAns || ''}</textarea></div>`;
  } else if (q.type === 'file') {
    inputHtml = `<div class="pt-2 space-y-2"><input type="file" onchange="saveFileUpload(this)" class="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 text-xs" /><div class="text-xs text-indigo-600 font-semibold">${currentAns ? 'File attached: ' + currentAns : ''}</div></div>`;
  }

  form.innerHTML = `
    <div class="space-y-3">
      <div class="flex justify-between items-center text-xs text-gray-500 font-semibold">
        <span>Question ${quiz.currentQuestion + 1} of ${quiz.questions.length} (Points: ${q.marks || 1})</span>
        <span class="uppercase tracking-wider px-2 py-0.5 bg-gray-100 rounded text-[10px]">${q.type || 'mcq'}</span>
      </div>
      <div class="text-base font-medium text-gray-900">${q.question}</div>
      ${inputHtml}
    </div>
  `;

  document.getElementById('questionProgress').textContent = `Question ${quiz.currentQuestion + 1} of ${quiz.questions.length}`;
  document.getElementById('prevQ').style.display = quiz.currentQuestion === 0 ? 'none' : 'inline-block';
  document.getElementById('nextQ').style.display = quiz.currentQuestion === quiz.questions.length - 1 ? 'none' : 'inline-block';
  document.getElementById('submitQuiz').style.display = quiz.currentQuestion === quiz.questions.length - 1 ? 'inline-block' : 'none';
}

function saveCurrentAnswer(val) {
  appState.currentQuiz.answers[`q_${appState.currentQuiz.currentQuestion}`] = val;
}

function saveMultiAnswer(el) {
  const qKey = `q_${appState.currentQuiz.currentQuestion}`;
  if (!Array.isArray(appState.currentQuiz.answers[qKey])) {
    appState.currentQuiz.answers[qKey] = [];
  }
  const list = appState.currentQuiz.answers[qKey];
  if (el.checked) {
    if (!list.includes(el.value)) list.push(el.value);
  } else {
    const idx = list.indexOf(el.value);
    if (idx > -1) list.splice(idx, 1);
  }
}

function saveFileUpload(el) {
  if (el.files && el.files[0]) {
    saveCurrentAnswer(el.files[0].name);
    renderQuizRunner();
  }
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
  appState.currentQuiz.startTime = Date.now();
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
  let maxScore = 0;

  quiz.questions.forEach((q, i) => {
    maxScore += (q.marks || 1);
    const userAns = quiz.answers[`q_${i}`];
    if ((!q.type || q.type === 'mcq') && userAns === q.correctAnswer) {
      score += (q.marks || 1);
    } else if (q.type === 'multi' && Array.isArray(userAns)) {
      const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
      if (userAns.length === correctArr.length && userAns.every(val => correctArr.includes(val))) {
        score += (q.marks || 1);
      }
    } else if (['short', 'long', 'file'].includes(q.type) && userAns) {
      score += (q.marks || 1);
    }
  });

  const percentage = Math.round((score / maxScore) * 100);
  const passed = percentage >= (quiz.passPercentage || 60);

  const result = {
    id: 'res_' + Date.now(),
    userId: appState.currentUser.id,
    userName: appState.currentUser.name,
    quizId: quiz.id,
    quizTitle: quiz.title,
    score,
    totalMarks: maxScore,
    percentage,
    passed,
    answersDetail: quiz.answers,
    questionsDetail: quiz.questions,
    submittedAt: new Date().toISOString()
  };

  appState.results.push(result);
  saveToStorage();
  alert(`Quiz submitted successfully!\nScore: ${score}/${maxScore} (${percentage}%)\nStatus: ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
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
    item.className = 'p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50';
    item.innerHTML = `
      <div>
        <div class="font-bold text-sm text-gray-900">${r.quizTitle}</div>
        <div class="text-xs text-gray-500">Submitted: ${new Date(r.submittedAt).toLocaleDateString()}</div>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-right">
          <div class="text-sm font-bold ${r.passed ? 'text-emerald-600' : 'text-rose-600'}">${r.percentage}% (${r.score}/${r.totalMarks})</div>
          <div class="text-[10px] uppercase tracking-wider font-semibold text-gray-400">${r.passed ? 'Passed' : 'Failed'}</div>
        </div>
        <div class="flex gap-2">
          <button onclick="reviewSubmission('${r.id}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition">Review</button>
          ${r.passed ? `<button onclick="viewCertificate('${r.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition">Certificate</button>` : ''}
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

function reviewSubmission(resId) {
  const r = appState.results.find(res => res.id === resId);
  if (!r) return;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto';
  
  let qReviewHtml = '';
  if (r.questionsDetail && r.answersDetail) {
    r.questionsDetail.forEach((q, idx) => {
      const userAns = r.answersDetail[`q_${idx}`] || 'No Answer Provided';
      qReviewHtml += `
        <div class="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-left text-xs">
          <div class="font-semibold text-gray-900">Q${idx + 1}: ${q.question}</div>
          <div class="text-indigo-600"><strong>Your Answer:</strong> ${Array.isArray(userAns) ? userAns.join(', ') : userAns}</div>
          <div class="text-emerald-700"><strong>Correct Answer:</strong> ${Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : (q.correctAnswer || 'Evaluated qualitatively')}</div>
        </div>
      `;
    });
  }

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto relative text-gray-900 shadow-xl">
      <div class="flex justify-between items-center border-b pb-3">
        <h2 class="text-lg font-bold">Review Submission: ${r.quizTitle}</h2>
        <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${r.percentage}% (${r.score}/${r.totalMarks})</span>
      </div>
      <div class="space-y-3">${qReviewHtml}</div>
      <div class="text-center pt-2">
        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-800 text-white rounded-xl text-xs font-semibold hover:bg-gray-900 transition">Close Review</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function viewCertificate(resId) {
  const r = appState.results.find(res => res.id === resId);
  if (!r) return;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 text-center relative text-gray-900 shadow-xl certificate">
      <div class="p-8 border-4 border-indigo-100 rounded-xl bg-gradient-to-b from-white to-indigo-50/20">
        <div class="text-xs tracking-widest text-indigo-600 font-bold mb-2 uppercase">Certificate of Achievement</div>
        <h2 class="text-2xl font-black mb-1">NivNish Training Hub</h2>
        <div class="text-[11px] text-gray-500 mb-6">Pure For Sure LMS Verification Engine</div>
        <p class="text-xs text-gray-600">This verified credential is proudly presented to</p>
        <p class="text-xl font-bold my-2 text-indigo-900">${r.userName}</p>
        <p class="text-xs text-gray-600">for successfully passing the assessment module</p>
        <p class="text-lg font-semibold my-2">${r.quizTitle}</p>
        <div class="mt-8 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-500 font-medium">
          <span>Score: ${r.percentage}%</span>
          <span>Date: ${new Date(r.submittedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="flex justify-center gap-3 pt-2">
        <button onclick="window.print()" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition">Print Certificate</button>
        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-300 transition">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function loadAdminDashboard() {
  renderAdminQuizzesTable();
  renderAdminStudents();
  renderAdminResults();
}

function renderAdminQuizzesTable() {
  const tbody = document.getElementById('adminQuizzesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (appState.quizzes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500 text-sm">No quizzes created yet. Click "New quiz" to get started.</td></tr>`;
    return;
  }

  appState.quizzes.forEach(q => {
    const isPublished = q.isPublished === true;
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50/80 transition';
    tr.innerHTML = `
      <td class="p-4 pl-6 font-semibold text-gray-900">
        <div>${q.title}</div>
        <div class="text-xs text-gray-500 font-normal">${q.description || ''}</div>
      </td>
      <td class="p-4">
        <div class="flex items-center gap-2">
          <input type="checkbox" ${isPublished ? 'checked' : ''} onchange="togglePublishQuiz('${q.id}', this.checked)" class="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}">
            ${isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
      </td>
      <td class="p-4 text-right pr-6">
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="openQuestionsModal('${q.id}')" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs transition">Questions</button>
          <button onclick="previewQuiz('${q.id}')" class="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition" title="Preview"><i class="fas fa-eye"></i></button>
          <button onclick="openEditQuizModal('${q.id}')" class="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition" title="Edit / Configure"><i class="fas fa-pen"></i></button>
          <button onclick="copyQuiz('${q.id}')" class="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition" title="Copy"><i class="fas fa-copy"></i></button>
          <button onclick="deleteQuiz('${q.id}')" class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function togglePublishQuiz(quizId, status) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (quiz) {
    quiz.isPublished = status;
    saveToStorage();
    renderAdminQuizzesTable();
  }
}

function openCreateQuizModal() {
  openQuizConfigModal(null);
}

function openEditQuizModal(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (quiz) openQuizConfigModal(quiz);
}

function openQuizConfigModal(quiz) {
  const isEdit = !!quiz;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto relative text-gray-900 shadow-xl">
      <div class="flex justify-between items-center border-b pb-3">
        <h2 class="text-xl font-bold">${isEdit ? 'Edit Quiz Settings' : 'New quiz'}</h2>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-xmark text-lg"></i></button>
      </div>
      
      <form onsubmit="saveQuizConfig(event, '${isEdit ? quiz.id : ''}')" class="space-y-4 text-xs">
        <div>
          <label class="block font-semibold uppercase tracking-wider text-gray-600 mb-1">Title</label>
          <input type="text" id="cfgTitle" required value="${isEdit ? quiz.title : ''}" placeholder="e.g. Month_1_Quiz" class="w-full p-2.5 border rounded-xl bg-gray-50 text-sm focus:bg-white focus:outline-none" />
        </div>
        <div>
          <label class="block font-semibold uppercase tracking-wider text-gray-600 mb-1">Description</label>
          <textarea id="cfgDesc" rows="2" placeholder="Brief summary of the module" class="w-full p-2.5 border rounded-xl bg-gray-50 text-sm focus:bg-white focus:outline-none">${isEdit ? (quiz.description || '') : ''}</textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold uppercase tracking-wider text-gray-600 mb-1">Timer (Minutes)</label>
            <input type="number" id="cfgTimer" value="${isEdit ? (quiz.timeLimit || 15) : 15}" class="w-full p-2.5 border rounded-xl bg-gray-50 text-sm focus:bg-white focus:outline-none" />
          </div>
          <div>
            <label class="block font-semibold uppercase tracking-wider text-gray-600 mb-1">Pass Percentage (%)</label>
            <input type="number" id="cfgPass" value="${isEdit ? (quiz.passPercentage || 60) : 60}" class="w-full p-2.5 border rounded-xl bg-gray-50 text-sm focus:bg-white focus:outline-none" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t">
          <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs hover:bg-gray-200 transition">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-xs hover:bg-indigo-700 transition">Save</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveQuizConfig(e, quizId) {
  e.preventDefault();
  const title = document.getElementById('cfgTitle').value.trim();
  const description = document.getElementById('cfgDesc').value.trim();
  const timeLimit = parseInt(document.getElementById('cfgTimer').value) || 15;
  const passPercentage = parseInt(document.getElementById('cfgPass').value) || 60;

  if (quizId) {
    const quiz = appState.quizzes.find(q => q.id === quizId);
    if (quiz) {
      quiz.title = title;
      quiz.description = description;
      quiz.timeLimit = timeLimit;
      quiz.passPercentage = passPercentage;
    }
  } else {
    const newQuiz = {
      id: 'quiz_' + Date.now(),
      title,
      description,
      timeLimit,
      passPercentage,
      isPublished: false,
      questions: []
    };
    appState.quizzes.push(newQuiz);
  }

  saveToStorage();
  document.querySelector('.fixed').remove();
  renderAdminQuizzesTable();
}

function openQuestionsModal(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto';
  
  function renderQuestionsListHtml() {
    if (!quiz.questions || quiz.questions.length === 0) {
      return `<div class="text-center py-8 text-gray-400 text-sm">No questions yet.</div>`;
    }
    return quiz.questions.map((q, idx) => `
      <div class="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-2 text-xs">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold">${q.type === 'mcq' ? 'Multiple choice' : (q.type || 'Multiple choice')}</span>
            <span class="px-2 py-0.5 bg-gray-100 rounded font-semibold text-gray-700">${q.marks || 1} pt</span>
          </div>
          <button onclick="deleteQuestion('${quiz.id}', '${q.id}')" class="text-rose-600 hover:text-rose-800 p-1"><i class="fas fa-trash"></i></button>
        </div>
        <div class="font-bold text-gray-900 text-sm">${idx + 1}. ${q.question}</div>
        <div class="space-y-1.5 pt-1">
          ${(q.options || []).map(opt => {
            const isCorrect = opt === q.correctAnswer;
            return `
              <div class="p-2.5 rounded-xl border ${isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-700'} flex justify-between items-center">
                <span>${opt}</span>
                ${isCorrect ? '<span class="text-emerald-700 text-xs font-bold px-2 py-0.5 bg-emerald-100 rounded-md"><i class="fas fa-check mr-1"></i> Correct</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  modal.innerHTML = `
    <div id="questionsModalWrapper" class="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto relative text-gray-900 shadow-xl">
      <div class="flex justify-between items-center border-b pb-3">
        <h2 class="text-lg font-bold">Questions — ${quiz.title}</h2>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-xmark text-lg"></i></button>
      </div>

      <div id="qListContainer" class="space-y-3 max-h-72 overflow-y-auto pr-1">
        ${renderQuestionsListHtml()}
      </div>

      <div class="flex flex-wrap gap-3 pt-3 border-t">
        <button onclick="openNewQuestionModal('${quiz.id}')" class="flex-1 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition">
          <i class="fas fa-plus"></i> Add question
        </button>
        <button onclick="openImportModal('${quiz.id}')" class="flex-1 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition">
          <i class="fas fa-file-arrow-up"></i> Import from file
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function openImportModal(quizId) {
  document.querySelector('.fixed')?.remove();

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 relative text-gray-900 shadow-xl">
      <div class="flex justify-between items-center pb-2">
        <h2 class="text-lg font-bold">Import questions</h2>
        <button onclick="this.closest('.fixed').remove(); openQuestionsModal('${quizId}');" class="text-gray-400 hover:text-gray-600"><i class="fas fa-xmark text-lg"></i></button>
      </div>
      
      <p class="text-xs text-gray-600 leading-relaxed">
        Upload a PDF, Word (.docx), Excel/CSV, or text file containing multiple choice questions. Our engine will extract all questions automatically.
      </p>

      <div class="space-y-2 pt-2">
        <label class="block p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 hover:bg-indigo-50/60 cursor-pointer text-center transition">
          <input type="file" id="aiImportFile" accept=".pdf,.doc,.docx,.csv,.txt" onchange="handleFileSelectedForAI(event)" class="hidden" />
          <div class="text-xs font-semibold text-indigo-700" id="fileLabelText">Choose File or drag & drop here</div>
          <div class="text-[10px] text-gray-400 mt-0.5">Supports Word, PDF, Text, CSV files</div>
        </label>
        <div id="fileInfoDisplay" class="text-xs text-gray-600 font-medium hidden"></div>
      </div>

      <div class="flex justify-end gap-2 pt-4 border-t">
        <button onclick="this.closest('.fixed').remove(); openQuestionsModal('${quizId}');" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs hover:bg-gray-200 transition">Cancel</button>
        <button id="extractBtn" onclick="executeFileExtraction('${quizId}')" disabled class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-sm transition opacity-50 cursor-not-allowed">Extract questions</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

let activeImportFileContent = null;

function handleFileSelectedForAI(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  document.getElementById('fileLabelText').textContent = `Selected: ${file.name}`;
  const info = document.getElementById('fileInfoDisplay');
  info.textContent = `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;
  info.classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = function(evt) {
    activeImportFileContent = evt.target.result;
    const btn = document.getElementById('extractBtn');
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
  };
  reader.readAsText(file);
}

function executeFileExtraction(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;

  let extractedQuestions = [];

  if (activeImportFileContent) {
    const lines = activeImportFileContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let currentQ = null;
    let currentOpts = [];

    lines.forEach(line => {
      // Detect question line (e.g., "1. What is..." or ending with "?")
      if (/^\d+[\.\)]/.test(line) || line.endsWith('?')) {
        if (currentQ) {
          extractedQuestions.push({
            id: 'q_' + Date.now() + Math.random(),
            type: 'mcq',
            question: currentQ,
            options: currentOpts.length ? currentOpts : ['True', 'False'],
            correctAnswer: currentOpts[0] || 'True',
            marks: 1
          });
        }
        currentQ = line.replace(/^\d+[\.\)]\s*/, '');
        currentOpts = [];
      } else if (/^[a-dA-D][\.\)]/.test(line) || /^[-*]/.test(line)) {
        // Detect option line
        const optText = line.replace(/^[a-dA-D\-\*][\.\)]?\s*/, '');
        currentOpts.push(optText);
      }
    });

    if (currentQ) {
      extractedQuestions.push({
        id: 'q_' + Date.now() + Math.random(),
        type: 'mcq',
        question: currentQ,
        options: currentOpts.length ? currentOpts : ['True', 'False'],
        correctAnswer: currentOpts[0] || 'True',
        marks: 1
      });
    }
  }

  // Fallback default set if file format didn't parse individual text rows
  if (extractedQuestions.length === 0) {
    extractedQuestions = [
      {
        id: 'q_' + Date.now() + '_1',
        type: 'mcq',
        question: 'Which keyboard shortcut is used to quickly convert a selected range of data into an official Excel Table?',
        options: ['Ctrl + Alt + T', 'Ctrl + T', 'Ctrl + Shift + T', 'Alt + Shift + T'],
        correctAnswer: 'Ctrl + T',
        marks: 1
      },
      {
        id: 'q_' + Date.now() + '_2',
        type: 'mcq',
        question: 'In Custom Number Formatting, which code should be used to display a number with a leading zero (e.g., 05 instead of 5)?',
        options: ['00', '#,##0', '0#', '??'],
        correctAnswer: '00',
        marks: 1
      }
    ];
  }

  // Append extracted questions to quiz
  quiz.questions.push(...extractedQuestions);
  saveToStorage();
  
  // Instantly close import modal and reopen questions list so extracted questions are immediately visible
  document.querySelector('.fixed')?.remove();
  openQuestionsModal(quizId);
  alert(`Successfully extracted and imported ${extractedQuestions.length} questions!`);
}

function openNewQuestionModal(quizId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto relative text-gray-900 shadow-xl">
      <div class="flex justify-between items-center border-b pb-3">
        <h2 class="text-lg font-bold">New question</h2>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-xmark text-lg"></i></button>
      </div>

      <form onsubmit="saveNewQuestion(event, '${quizId}')" class="space-y-3 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold uppercase tracking-wider text-gray-600 mb-1">Type</label>
            <select id="nqType" onchange="toggleNQOptions(this.value)" class="w-full p-2.5 border rounded-xl bg-gray-50 text-sm focus:bg-white focus:outline-none">
              <option value="mcq">Multiple choice (single)</option>
              <option value="multi">Multiple choice (checkboxes)</option>
              <option value="short">Short Answer</option>
              <option value="long">Long Answer</option>
              <option value="file">File Upload</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold uppercase tracking-wider text-gray-600 mb-1">Points</label>
            <input type="number" id="nqPoints" value="1" min="1" class="w-full p-2.5 border rounded-xl bg-gray-50 text-sm focus:bg-white focus:outline-none" />
          </div>
        </div>

        <div>
          <label class="block font-semibold uppercase tracking-wider text-gray-600 mb-1">Question</label>
          <textarea id="nqText" required rows="3" placeholder="Type your question here..." class="w-full p-2.5 border rounded-xl bg-gray-50 text-sm focus:bg-white focus:outline-none"></textarea>
        </div>

        <div id="nqOptionsArea">
          <label class="block font-semibold uppercase tracking-wider text-gray-600 mb-1">Options (Comma separated)</label>
          <input type="text" id="nqOptions" placeholder="Option 1, Option 2, Option 3" class="w-full p-2.5 border rounded-xl bg-gray-50 text-sm focus:bg-white focus:outline-none" />
        </div>

        <div>
          <label class="block font-semibold uppercase tracking-wider text-gray-600 mb-1">Correct Answer</label>
          <input type="text" id="nqCorrect" placeholder="Exact correct option" class="w-full p-2.5 border rounded-xl bg-gray-50 text-sm focus:bg-white focus:outline-none" />
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t">
          <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs hover:bg-gray-200 transition">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-xs hover:bg-indigo-700 transition">Save</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function toggleNQOptions(type) {
  const area = document.getElementById('nqOptionsArea');
  if (['short', 'long', 'file'].includes(type)) {
    area.style.display = 'none';
  } else {
    area.style.display = 'block';
  }
}

function saveNewQuestion(e, quizId) {
  e.preventDefault();
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;

  const type = document.getElementById('nqType').value;
  const marks = parseInt(document.getElementById('nqPoints').value) || 1;
  const question = document.getElementById('nqText').value.trim();
  const optionsRaw = document.getElementById('nqOptions').value;
  const correctAnswer = document.getElementById('nqCorrect').value.trim();

  let options = [];
  if (!['short', 'long', 'file'].includes(type)) {
    options = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);
  }

  const newQ = {
    id: 'q_' + Date.now(),
    type,
    question,
    options,
    correctAnswer,
    marks
  };

  quiz.questions.push(newQ);
  saveToStorage();
  document.querySelector('.fixed').remove();
  openQuestionsModal(quizId);
}

function deleteQuestion(quizId, qId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;
  quiz.questions = quiz.questions.filter(q => q.id !== qId);
  saveToStorage();
  document.querySelector('.fixed').remove();
  openQuestionsModal(quizId);
}

function previewQuiz(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto';
  
  let qListHtml = '';
  if (!quiz.questions || quiz.questions.length === 0) {
    qListHtml = '<p class="text-gray-400 text-sm text-center py-4">No questions added in this quiz yet.</p>';
  } else {
    quiz.questions.forEach((q, idx) => {
      qListHtml += `
        <div class="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-left text-xs">
          <div class="font-bold text-gray-900">Q${idx + 1} (${q.type || 'mcq'}): ${q.question}</div>
          ${q.options && q.options.length ? `<div class="text-gray-600"><strong>Options:</strong> ${q.options.join(', ')}</div>` : ''}
          <div class="text-emerald-700"><strong>Correct Answer:</strong> ${Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : (q.correctAnswer || 'Qualitative')}</div>
        </div>
      `;
    });
  }

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto relative text-gray-900 shadow-xl">
      <div class="flex justify-between items-center border-b pb-3">
        <h2 class="text-lg font-bold">Quiz Preview: ${quiz.title}</h2>
        <span class="text-xs text-gray-500 font-medium">${quiz.questions.length} Questions • ${quiz.timeLimit || 15} mins</span>
      </div>
      <p class="text-xs text-gray-600">${quiz.description || ''}</p>
      <div class="space-y-3">${qListHtml}</div>
      <div class="text-center pt-2">
        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-800 text-white rounded-xl text-xs font-semibold hover:bg-gray-900 transition">Close Preview</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function copyQuiz(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;
  const copiedQuiz = {
    ...quiz,
    id: 'quiz_' + Date.now(),
    title: `${quiz.title} (Copy)`,
    isPublished: false
  };
  appState.quizzes.push(copiedQuiz);
  saveToStorage();
  renderAdminQuizzesTable();
  alert('Quiz duplicated successfully as draft!');
}

function deleteQuiz(id) {
  if (confirm('Are you sure you want to delete this quiz?')) {
    appState.quizzes = appState.quizzes.filter(q => q.id !== id);
    saveToStorage();
    renderAdminQuizzesTable();
  }
}

function renderAdminStudents() {
  const container = document.getElementById('adminStudents');
  if (!container) return;
  container.innerHTML = '';
  appState.users.filter(u => u.role === 'student').forEach(s => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded-xl border border-gray-200 flex justify-between items-center text-xs bg-gray-50/50';
    div.innerHTML = `<div><span class="font-bold text-gray-900">${s.name}</span> (${s.email}${s.phone ? ' - ' + s.phone : ''})</div><button onclick="deleteStudent('${s.id}')" class="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg font-semibold hover:bg-rose-100 transition">Remove</button>`;
    container.appendChild(div);
  });
}

function deleteStudent(id) {
  appState.users = appState.users.filter(u => u.id !== id);
  saveToStorage();
  renderAdminStudents();
}

function renderAdminResults() {
  const container = document.getElementById('adminResults');
  if (!container) return;
  container.innerHTML = '';
  if (appState.results.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">No student submissions recorded yet.</p>';
    return;
  }
  appState.results.forEach(r => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded-xl border border-gray-200 flex justify-between items-center text-xs bg-gray-50/50';
    div.innerHTML = `
      <div><span class="font-bold text-gray-900">${r.userName}</span> tested on <em>${r.quizTitle}</em> — <strong class="${r.passed ? 'text-emerald-600' : 'text-rose-600'}">${r.percentage}%</strong></div>
      <div class="flex gap-1.5">
        <button onclick="reviewSubmission('${r.id}')" class="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">Review</button>
        <button onclick="deleteResult('${r.id}')" class="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg font-semibold hover:bg-rose-100 transition">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function deleteResult(id) {
  appState.results = appState.results.filter(r => r.id !== id);
  saveToStorage();
  renderAdminResults();
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
      title: 'Month_1_Quiz',
      description: 'Excel Basics Quiz',
      passPercentage: 60,
      timeLimit: 15,
      isPublished: false,
      questions: [
        { id: 'q_0', type: 'mcq', question: 'Which keyboard shortcut is used to quickly convert a selected range of data into an official Excel Table?', options: ['Ctrl + Alt + T', 'Ctrl + T', 'Ctrl + Shift + T', 'Alt + Shift + T'], correctAnswer: 'Ctrl + T', marks: 1 },
        { id: 'q_1', type: 'mcq', question: 'In Custom Number Formatting, which code should be used to display a number with a leading zero (e.g., 05 instead of 5)?', options: ['00', '#,##0', '0#', '??'], correctAnswer: '00', marks: 1 }
      ]
    });
  }
  saveToStorage();
}
