// ============================================================================
// NivNish Training Hub - Core Application Logic
// Pure For Sure LMS - Full-featured application with Firebase & localStorage
// ============================================================================

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let appState = {
  currentUser: null,
  currentView: 'auth',
  users: [], // {id, name, email, password, role, createdAt}
  quizzes: [], // {id, title, description, questions, createdBy, createdAt, passPercentage}
  results: [], // {id, userId, quizId, score, answers, submittedAt, status}
  discussions: [], // {id, userId, userName, message, createdAt}
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('✓ App initializing...', new Date().toLocaleTimeString());
  loadFromStorage();
  console.log('✓ Storage loaded');
  initializeEventListeners();
  console.log('✓ Event listeners initialized');
  initializeTheme();
  console.log('✓ Theme initialized');
  loadSampleData();
  console.log('✓ Sample data loaded');
  checkAuthState();
  console.log('✓ Auth state checked - Current view:', appState.currentView);
});

function initializeEventListeners() {
  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Navigation
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.target.dataset.nav;
      if (view === 'auth') logout();
      else navigateTo(view);
    });
  });

  // Mobile nav
  document.getElementById('mobileNavBtn').addEventListener('click', toggleMobileNav);

  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', (e) => switchAuthTab(e.target.dataset.tab));
  });

  // Auth forms
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('demoLogin').addEventListener('click', demoStudentLogin);

  // Dashboard
  document.getElementById('quizSearch').addEventListener('input', filterQuizzes);
  document.getElementById('btnMyHistory').addEventListener('click', () => navigateTo('history'));
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('postDiscussion').addEventListener('click', postDiscussion);

  // Admin
  document.getElementById('btnCreateQuiz').addEventListener('click', openCreateQuizModal);
  document.getElementById('btnBulkImport').addEventListener('click', () => {
    document.getElementById('bulkFile').click();
  });
  document.getElementById('bulkFile').addEventListener('change', handleBulkImport);
  document.getElementById('sendReminders').addEventListener('click', sendReminderEmails);

  // Quiz runner
  document.getElementById('exitQuiz').addEventListener('click', exitQuiz);
  document.getElementById('prevQ').addEventListener('click', previousQuestion);
  document.getElementById('nextQ').addEventListener('click', nextQuestion);
  document.getElementById('submitQuiz').addEventListener('click', submitQuiz);
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  if (isDark) {
    html.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    document.getElementById('themeIcon').className = 'fas fa-moon';
  } else {
    html.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    document.getElementById('themeIcon').className = 'fas fa-sun';
  }
}

function initializeTheme() {
  const theme = localStorage.getItem('theme') || 'light';
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.getElementById('themeIcon').className = 'fas fa-sun';
  } else {
    document.getElementById('themeIcon').className = 'fas fa-moon';
  }
}

function toggleMobileNav() {
  const nav = document.querySelector('nav');
  nav.classList.toggle('hidden');
}

// ============================================================================
// AUTHENTICATION
// ============================================================================
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const messageEl = document.getElementById('loginMessage');

  const user = appState.users.find(u => u.email === email && u.password === password);
  if (!user) {
    messageEl.textContent = 'Invalid email or password';
    return;
  }

  appState.currentUser = user;
  saveToStorage();
  messageEl.textContent = '';
  navigateTo(user.role === 'admin' ? 'admin' : 'dashboard');
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;
  const messageEl = document.getElementById('registerMessage');

  if (appState.users.find(u => u.email === email)) {
    messageEl.textContent = 'Email already registered';
    return;
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    name,
    email,
    password,
    role,
    createdAt: new Date().toISOString(),
  };

  appState.users.push(newUser);
  appState.currentUser = newUser;
  saveToStorage();
  messageEl.textContent = '';
  navigateTo(role === 'admin' ? 'admin' : 'dashboard');
}

function demoStudentLogin() {
  const demoUser = appState.users.find(u => u.email === 'student@demo.com');
  if (!demoUser) {
    const newDemoUser = {
      id: 'usr_demo_' + Date.now(),
      name: 'Demo Student',
      email: 'student@demo.com',
      password: 'demo123',
      role: 'student',
      createdAt: new Date().toISOString(),
    };
    appState.users.push(newDemoUser);
    appState.currentUser = newDemoUser;
  } else {
    appState.currentUser = demoUser;
  }
  saveToStorage();
  navigateTo('dashboard');
}

function logout() {
  appState.currentUser = null;
  saveToStorage();
  navigateTo('auth');
  document.getElementById('loginForm').reset();
  document.getElementById('registerForm').reset();
}

function checkAuthState() {
  if (appState.currentUser) {
    navigateTo(appState.currentUser.role === 'admin' ? 'admin' : 'dashboard');
  } else {
    navigateTo('auth');
  }
}

// ============================================================================
// NAVIGATION & VIEWS
// ============================================================================
function navigateTo(viewName) {
  if (!appState.currentUser && viewName !== 'auth') {
    navigateTo('auth');
    return;
  }

  appState.currentView = viewName;
  document.querySelectorAll('section[id^="view-"]').forEach(s => s.classList.add('hidden'));
  document.getElementById(`view-${viewName}`).classList.remove('hidden');

  switch (viewName) {
    case 'auth':
      switchAuthTab('login');
      break;
    case 'dashboard':
      loadStudentDashboard();
      break;
    case 'history':
      loadStudentHistory();
      break;
    case 'admin':
      loadAdminDashboard();
      break;
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`auth-${tab}`).classList.remove('hidden');
}

// ============================================================================
// STUDENT DASHBOARD
// ============================================================================
function loadStudentDashboard() {
  document.getElementById('userDisplay').textContent = appState.currentUser.name;
  renderStudentQuizzes();
  renderDiscussionForum();
}

function renderStudentQuizzes() {
  const grid = document.getElementById('quizzesGrid');
  grid.innerHTML = '';

  appState.quizzes.forEach(quiz => {
    const completed = appState.results.find(r => r.userId === appState.currentUser.id && r.quizId === quiz.id);
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-700 rounded-lg p-4 shadow hover:shadow-lg cursor-pointer transition';
    card.innerHTML = `
      <h3 class="font-semibold text-lg mb-2">${quiz.title}</h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">${quiz.description || 'No description'}</p>
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">
        <div>${quiz.questions.length} questions</div>
        <div>Pass: ${quiz.passPercentage || 60}%</div>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold ${completed ? 'text-green-600' : 'text-yellow-600'}">
          ${completed ? '✓ Completed' : 'Not Attempted'}
        </span>
        <button class="px-3 py-1 rounded text-sm ${completed ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white'}"
                ${completed ? 'disabled' : 'onclick="startQuiz(\'' + quiz.id + '\')"'}>
          ${completed ? 'Completed' : 'Start'}
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
    alert('You have already attempted this quiz. Only one attempt is allowed.');
    return;
  }

  // Randomize question order if option is set
  const questions = quiz.randomizeQuestions
    ? [...quiz.questions].sort(() => Math.random() - 0.5)
    : quiz.questions;

  appState.currentQuiz = {
    ...quiz,
    questions,
    currentQuestion: 0,
    answers: {},
    startTime: Date.now(),
    timeLimit: quiz.timeLimit || 30, // minutes
  };

  appState.quizState = appState.currentQuiz;
  renderQuizRunner();
  navigateTo('quiz');
}

// ============================================================================
// QUIZ RUNNER
// ============================================================================
function renderQuizRunner() {
  const quiz = appState.currentQuiz;
  document.getElementById('quizTitle').textContent = quiz.title;

  const form = document.getElementById('quizForm');
  form.innerHTML = '';

  const q = quiz.questions[quiz.currentQuestion];
  const container = document.createElement('div');
  container.className = 'space-y-4 mb-6';

  // Question header
  const header = document.createElement('div');
  header.className = 'flex items-start justify-between';
  header.innerHTML = `
    <div class="flex-1">
      <div class="font-semibold text-lg mb-2">
        Question ${quiz.currentQuestion + 1} of ${quiz.questions.length}
        ${q.mandatory ? '<span class="text-red-600">*</span>' : ''}
      </div>
      ${q.imageUrl ? `<img src="${q.imageUrl}" alt="Question" class="mb-3 max-w-full h-64 object-cover rounded" />` : ''}
      <div class="text-base">${q.question}</div>
    </div>
  `;
  container.appendChild(header);

  // Question type rendering
  const answerKey = `q_${quiz.currentQuestion}`;
  let inputElement;

  switch (q.type) {
    case 'mcq':
      inputElement = createMCQInput(q, answerKey);
      break;
    case 'checkbox':
      inputElement = createCheckboxInput(q, answerKey);
      break;
    case 'short':
      inputElement = createShortAnswerInput(q, answerKey);
      break;
    case 'long':
      inputElement = createLongAnswerInput(q, answerKey);
      break;
    case 'file':
      inputElement = createFileUploadInput(q, answerKey);
      break;
    default:
      inputElement = createShortAnswerInput(q, answerKey);
  }

  container.appendChild(inputElement);
  form.appendChild(container);

  // Update progress
  document.getElementById('questionProgress').textContent = `${quiz.currentQuestion + 1} / ${quiz.questions.length}`;

  // Update buttons
  document.getElementById('prevQ').style.display = quiz.currentQuestion === 0 ? 'none' : '';
  document.getElementById('nextQ').style.display = quiz.currentQuestion === quiz.questions.length - 1 ? 'none' : '';

  startQuizTimer();
}

function createMCQInput(q, key) {
  const div = document.createElement('div');
  div.className = 'space-y-2';

  const options = q.randomizeOptions ? [...q.options].sort(() => Math.random() - 0.5) : q.options;

  options.forEach((opt, idx) => {
    const label = document.createElement('label');
    label.className = 'flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700';
    label.innerHTML = `
      <input type="radio" name="${key}" value="${opt}" class="mr-2" ${appState.currentQuiz.answers[key] === opt ? 'checked' : ''} />
      <span>${opt}</span>
    `;
    div.appendChild(label);
  });

  return div;
}

function createCheckboxInput(q, key) {
  const div = document.createElement('div');
  div.className = 'space-y-2';

  const options = q.randomizeOptions ? [...q.options].sort(() => Math.random() - 0.5) : q.options;

  options.forEach(opt => {
    const label = document.createElement('label');
    label.className = 'flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700';
    const isChecked = (appState.currentQuiz.answers[key] || []).includes(opt);
    label.innerHTML = `
      <input type="checkbox" name="${key}" value="${opt}" class="mr-2" ${isChecked ? 'checked' : ''} />
      <span>${opt}</span>
    `;
    div.appendChild(label);
  });

  return div;
}

function createShortAnswerInput(q, key) {
  const div = document.createElement('div');
  const input = document.createElement('input');
  input.type = 'text';
  input.name = key;
  input.placeholder = 'Enter your answer';
  input.value = appState.currentQuiz.answers[key] || '';
  input.className = 'w-full p-3 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-700';
  div.appendChild(input);
  return div;
}

function createLongAnswerInput(q, key) {
  const div = document.createElement('div');
  const textarea = document.createElement('textarea');
  textarea.name = key;
  textarea.placeholder = 'Enter your answer';
  textarea.value = appState.currentQuiz.answers[key] || '';
  textarea.rows = 6;
  textarea.className = 'w-full p-3 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-700';
  div.appendChild(textarea);
  return div;
}

function createFileUploadInput(q, key) {
  const div = document.createElement('div');
  div.className = 'border-2 border-dashed rounded p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700';
  div.innerHTML = `
    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
    <p class="text-sm mb-2">Click to upload file or drag and drop</p>
    <input type="file" name="${key}" class="hidden" accept=".pdf,.doc,.docx,.txt,.jpg,.png" />
    <div class="text-xs text-gray-500">Supported: PDF, DOC, TXT, JPG, PNG</div>
    ${appState.currentQuiz.answers[key] ? `<div class="text-sm text-green-600 mt-2">✓ File uploaded: ${appState.currentQuiz.answers[key].name}</div>` : ''}
  `;
  const input = div.querySelector('input');
  div.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => {
    appState.currentQuiz.answers[`${key}`] = e.target.files[0];
  });
  return div;
}

function previousQuestion() {
  saveCurrentAnswer();
  appState.currentQuiz.currentQuestion--;
  renderQuizRunner();
}

function nextQuestion() {
  saveCurrentAnswer();
  appState.currentQuiz.currentQuestion++;
  renderQuizRunner();
}

function saveCurrentAnswer() {
  const quiz = appState.currentQuiz;
  const q = quiz.questions[quiz.currentQuestion];
  const key = `q_${quiz.currentQuestion}`;

  if (q.type === 'checkbox') {
    const checked = Array.from(document.querySelectorAll(`input[name="${key}"]:checked`)).map(x => x.value);
    quiz.answers[key] = checked;
  } else if (q.type === 'file') {
    const fileInput = document.querySelector(`input[name="${key}"]`);
    if (fileInput.files[0]) {
      quiz.answers[key] = fileInput.files[0];
    }
  } else {
    const input = document.querySelector(`[name="${key}"]`);
    quiz.answers[key] = input ? input.value : '';
  }
}

function submitQuiz() {
  saveCurrentAnswer();
  const quiz = appState.currentQuiz;

  // Check mandatory questions
  for (let i = 0; i < quiz.questions.length; i++) {
    if (quiz.questions[i].mandatory && !quiz.answers[`q_${i}`]) {
      alert(`Question ${i + 1} is mandatory. Please answer it.`);
      quiz.currentQuestion = i;
      renderQuizRunner();
      return;
    }
  }

  calculateAndSaveResult();
  navigateTo('dashboard');
}

function calculateAndSaveResult() {
  const quiz = appState.currentQuiz;
  let score = 0;
  let totalMarks = 0;

  quiz.questions.forEach((q, idx) => {
    const key = `q_${idx}`;
    const answer = quiz.answers[key];
    const marks = q.marks || 1;
    totalMarks += marks;

    // Simple grading: check if answer matches correctAnswer
    let isCorrect = false;
    if (q.type === 'checkbox') {
      const userAnswers = (answer || []).sort().join(',');
      const correctAnswers = (typeof q.correctAnswer === 'string' ? q.correctAnswer.split(',') : q.correctAnswer || []).sort().join(',');
      isCorrect = userAnswers === correctAnswers;
    } else if (q.type === 'mcq') {
      isCorrect = answer === q.correctAnswer;
    } else if (q.type === 'short') {
      isCorrect = answer.toLowerCase().trim() === (q.correctAnswer || '').toLowerCase().trim();
    } else {
      // Long answer and file uploads need manual grading
      isCorrect = false;
    }

    if (isCorrect) {
      score += marks;
    }
  });

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
    answers: quiz.answers,
    submittedAt: new Date().toISOString(),
    status: 'submitted',
  };

  appState.results.push(result);
  saveToStorage();

  alert(`Quiz submitted! Score: ${score}/${totalMarks} (${percentage}%)\n${passed ? '✓ Passed!' : '✗ Failed'}`);
}

function startQuizTimer() {
  const quiz = appState.currentQuiz;
  const timerEl = document.getElementById('quizTimer');

  const interval = setInterval(() => {
    const elapsed = Date.now() - quiz.startTime;
    const remainingMs = (quiz.timeLimit * 60 * 1000) - elapsed;
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (remainingMs <= 0) {
      clearInterval(interval);
      alert('Time limit exceeded. Quiz auto-submitted.');
      submitQuiz();
    }
  }, 1000);

  document.addEventListener('pagechange', () => clearInterval(interval), { once: true });
}

function exitQuiz() {
  if (confirm('Are you sure? Your progress will not be saved.')) {
    appState.currentQuiz = null;
    navigateTo('dashboard');
  }
}

// ============================================================================
// STUDENT HISTORY & CERTIFICATES
// ============================================================================
function loadStudentHistory() {
  const list = document.getElementById('resultsList');
  list.innerHTML = '';

  const userResults = appState.results.filter(r => r.userId === appState.currentUser.id);

  if (userResults.length === 0) {
    list.innerHTML = '<p class="text-gray-500">No quiz results yet.</p>';
    return;
  }

  userResults.forEach(result => {
    const card = document.createElement('div');
    card.className = 'bg-gray-50 dark:bg-gray-700 p-4 rounded border-l-4 ' + (result.passed ? 'border-green-600' : 'border-red-600');
    card.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <div>
          <h3 class="font-semibold">${result.quizTitle}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">Submitted: ${new Date(result.submittedAt).toLocaleDateString()}</p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}">${result.percentage}%</div>
          <div class="text-sm text-gray-600 dark:text-gray-300">${result.score}/${result.totalMarks}</div>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="px-3 py-1 text-sm bg-blue-600 text-white rounded" onclick="viewResultDetails('${result.id}')">View Details</button>
        ${result.passed ? `<button class="px-3 py-1 text-sm bg-green-600 text-white rounded" onclick="generateCertificate('${result.id}')">Certificate</button>` : ''}
      </div>
    `;
    list.appendChild(card);
  });
}

function generateCertificate(resultId) {
  const result = appState.results.find(r => r.id === resultId);
  if (!result) return;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-96 overflow-auto p-6">
      <div class="certificate">
        <div class="text-center">
          <div class="text-sm tracking-widest text-gray-600 mb-4">CERTIFICATE OF ACHIEVEMENT</div>
          <h2 class="text-4xl font-bold mb-4" style="color: var(--brand);">NivNish Training Hub</h2>
          <div class="text-sm text-gray-600 mb-8">Pure For Sure LMS</div>
        </div>

        <div class="border-t-2 border-b-2 border-gray-400 py-8 my-8 text-center">
          <p class="text-sm text-gray-600">This is to certify that</p>
          <p class="text-2xl font-bold my-3">${result.userName}</p>
          <p class="text-sm text-gray-600">has successfully completed and passed</p>
          <p class="text-xl font-semibold my-3">${result.quizTitle}</p>
          <p class="text-sm text-gray-600">with a score of <strong>${result.percentage}%</strong></p>
        </div>

        <div class="text-center text-sm text-gray-600 mb-4">
          <p>Date: ${new Date(result.submittedAt).toLocaleDateString()}</p>
          <p>Certificate ID: ${result.id}</p>
        </div>

        <div class="flex justify-center items-end gap-12 mt-12">
          <div class="text-center">
            <div class="border-t-2 border-gray-800 w-32 mb-2"></div>
            <p class="text-xs font-semibold">Authorized by</p>
            <p class="text-xs">NivNish Training Hub</p>
          </div>
        </div>
      </div>

      <div class="mt-4 flex gap-2 justify-center">
        <button class="px-4 py-2 bg-blue-600 text-white rounded" onclick="window.print()">Print</button>
        <button class="px-4 py-2 bg-green-600 text-white rounded" onclick="downloadCertificate('${resultId}')">Download PDF</button>
        <button class="px-4 py-2 bg-gray-400 text-white rounded" onclick="this.closest('.fixed').remove()">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function downloadCertificate(resultId) {
  alert('PDF download functionality requires a backend service. For now, use the Print option to save as PDF.');
}

function viewResultDetails(resultId) {
  const result = appState.results.find(r => r.id === resultId);
  const quiz = appState.quizzes.find(q => q.id === result.quizId);
  if (!result || !quiz) return;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-96 overflow-auto p-6">
      <h2 class="text-2xl font-semibold mb-4">${result.quizTitle} - Detailed Results</h2>
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Score</div>
            <div class="text-2xl font-bold">${result.score}/${result.totalMarks}</div>
          </div>
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Percentage</div>
            <div class="text-2xl font-bold">${result.percentage}%</div>
          </div>
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Status</div>
            <div class="text-2xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}">${result.passed ? 'PASS' : 'FAIL'}</div>
          </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 class="font-semibold mb-2">Question Review</h3>
          <div class="space-y-3 max-h-48 overflow-auto">
            ${quiz.questions.map((q, idx) => {
              const answer = result.answers[`q_${idx}`];
              return `
                <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div class="font-semibold text-sm mb-1">Q${idx + 1}: ${q.question.substring(0, 50)}...</div>
                  <div class="text-xs text-gray-600 dark:text-gray-300">Your answer: ${Array.isArray(answer) ? answer.join(', ') : answer || '(No answer)'}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="mt-4 flex gap-2 justify-end">
        <button class="px-4 py-2 bg-gray-400 text-white rounded" onclick="this.closest('.fixed').remove()">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// ============================================================================
// COURSE DISCUSSION FORUM
// ============================================================================
function renderDiscussionForum() {
  const list = document.getElementById('discussionList');
  list.innerHTML = '';

  appState.discussions.slice(-5).forEach(disc => {
    const item = document.createElement('div');
    item.className = 'text-xs p-2 bg-gray-100 dark:bg-gray-700 rounded';
    item.innerHTML = `
      <div class="font-semibold">${disc.userName}</div>
      <div class="text-gray-600 dark:text-gray-300">${disc.message.substring(0, 60)}...</div>
      <div class="text-gray-500 text-xs mt-1">${new Date(disc.createdAt).toLocaleDateString()}</div>
    `;
    list.appendChild(item);
  });
}

function postDiscussion() {
  const input = document.getElementById('discussionInput');
  const message = input.value.trim();

  if (!message) {
    alert('Please enter a message');
    return;
  }

  const discussion = {
    id: 'disc_' + Date.now(),
    userId: appState.currentUser.id,
    userName: appState.currentUser.name,
    message,
    createdAt: new Date().toISOString(),
  };

  appState.discussions.push(discussion);
  input.value = '';
  saveToStorage();
  renderDiscussionForum();
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
function loadAdminDashboard() {
  renderAdminQuizzes();
  renderAdminStudents();
  renderAdminResults();
  renderAnalytics();
}

function renderAdminQuizzes() {
  const container = document.getElementById('adminQuizzes');
  container.innerHTML = '';

  appState.quizzes.forEach(quiz => {
    const resultsCount = appState.results.filter(r => r.quizId === quiz.id).length;
    const div = document.createElement('div');
    div.className = 'p-4 bg-gray-50 dark:bg-gray-700 rounded border';
    div.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <div>
          <h4 class="font-semibold">${quiz.title}</h4>
          <div class="text-xs text-gray-600 dark:text-gray-300">${quiz.questions.length} questions • ${resultsCount} submissions</div>
        </div>
      </div>
      <div class="flex gap-2 mt-2">
        <button class="px-2 py-1 text-xs bg-blue-600 text-white rounded" onclick="editQuiz('${quiz.id}')">Edit</button>
        <button class="px-2 py-1 text-xs bg-purple-600 text-white rounded" onclick="cloneQuiz('${quiz.id}')">Clone</button>
        <button class="px-2 py-1 text-xs bg-red-600 text-white rounded" onclick="deleteQuiz('${quiz.id}')">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderAdminStudents() {
  const container = document.getElementById('adminStudents');
  container.innerHTML = '';

  const students = appState.users.filter(u => u.role === 'student');

  if (students.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">No students registered yet.</p>';
    return;
  }

  students.forEach(student => {
    const quizzesTaken = appState.results.filter(r => r.userId === student.id).length;
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 border rounded';
    div.innerHTML = `
      <div>
        <div class="font-semibold text-sm">${student.name}</div>
        <div class="text-xs text-gray-600 dark:text-gray-300">${student.email} • ${quizzesTaken} quizzes taken</div>
      </div>
      <button class="px-2 py-1 text-xs bg-red-600 text-white rounded" onclick="deleteStudent('${student.id}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

function renderAdminResults() {
  const container = document.getElementById('adminResults');
  container.innerHTML = '';

  if (appState.results.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">No submissions yet.</p>';
    return;
  }

  appState.results.forEach(result => {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 border rounded';
    div.innerHTML = `
      <div>
        <div class="font-semibold text-sm">${result.userName} - ${result.quizTitle}</div>
        <div class="text-xs text-gray-600 dark:text-gray-300">${result.percentage}% • ${new Date(result.submittedAt).toLocaleDateString()}</div>
      </div>
      <div class="flex gap-2">
        <select class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded" onchange="updateResultStatus('${result.id}', this.value)">
          <option value="${result.status}">${result.status}</option>
          <option value="graded">Mark Graded</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <button class="px-2 py-1 text-xs bg-orange-600 text-white rounded" onclick="manuallyGradeResult('${result.id}')">Grade</button>
        <button class="px-2 py-1 text-xs bg-red-600 text-white rounded" onclick="deleteResult('${result.id}')">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderAnalytics() {
  const canvas = document.getElementById('gradesChart');
  if (!canvas) return;

  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  appState.results.forEach(r => {
    if (r.percentage >= 90) grades.A++;
    else if (r.percentage >= 80) grades.B++;
    else if (r.percentage >= 70) grades.C++;
    else if (r.percentage >= 60) grades.D++;
    else grades.F++;
  });

  const ctx = canvas.getContext('2d');
  if (window.gradesChartInstance) {
    window.gradesChartInstance.destroy();
  }

  window.gradesChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['A (90-100)', 'B (80-89)', 'C (70-79)', 'D (60-69)', 'F (<60)'],
      datasets: [{
        data: [grades.A, grades.B, grades.C, grades.D, grades.F],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
      }],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
  });
}

// ============================================================================
// ADMIN ACTIONS
// ============================================================================
function openCreateQuizModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-auto p-6">
      <h2 class="text-2xl font-semibold mb-4">Create New Quiz</h2>
      <form id="createQuizForm" class="space-y-4">
        <div>
          <label class="block text-sm font-semibold mb-1">Quiz Title</label>
          <input required type="text" id="quizTitle" placeholder="e.g., JavaScript Basics" class="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-700" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">Description</label>
          <textarea id="quizDesc" rows="2" placeholder="Brief description" class="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-700"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold mb-1">Pass Percentage</label>
            <input type="number" id="quizPassPercent" value="60" min="0" max="100" class="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Time Limit (minutes)</label>
            <input type="number" id="quizTimeLimit" value="30" min="1" class="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-700" />
          </div>
        </div>
        <div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="quizRandomizeQuestions" />
            <span class="text-sm">Randomize question order</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer mt-2">
            <input type="checkbox" id="quizRandomizeOptions" />
            <span class="text-sm">Randomize option order</span>
          </label>
        </div>

        <div class="border-t border-gray-300 dark:border-gray-700 pt-4">
          <h3 class="font-semibold mb-3">Add Questions</h3>
          <div id="questionsList" class="space-y-3 max-h-48 overflow-auto mb-3"></div>
          <button type="button" class="px-3 py-2 bg-indigo-600 text-white rounded text-sm" onclick="addQuestionField(this.closest('.modal-card'))">+ Add Question</button>
        </div>

        <div class="flex gap-2 justify-end">
          <button type="button" class="px-4 py-2 bg-gray-400 text-white rounded" onclick="this.closest('.fixed').remove()">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded">Create Quiz</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Add initial question field
  addQuestionField(modal.querySelector('.max-w-2xl'));

  document.getElementById('createQuizForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveNewQuiz(modal);
  });
}

function addQuestionField(container) {
  const list = container.querySelector('#questionsList');
  const idx = list.children.length;
  const field = document.createElement('div');
  field.className = 'p-3 bg-gray-100 dark:bg-gray-700 rounded space-y-3 question-field';
  field.innerHTML = `
    <div class="flex items-center justify-between">
      <label class="font-semibold text-sm">Question ${idx + 1}</label>
      <button type="button" class="text-red-600 text-sm" onclick="this.closest('.question-field').remove()">Remove</button>
    </div>
    <input type="text" placeholder="Question text" class="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-700 q-text" required />
    <select class="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-700 q-type" onchange="updateQuestionType(this)">
      <option value="mcq">MCQ (Single Choice)</option>
      <option value="checkbox">Checkbox (Multiple)</option>
      <option value="short">Short Answer</option>
      <option value="long">Long Answer</option>
      <option value="file">File Upload</option>
    </select>
    <div class="q-options space-y-1"></div>
    <input type="text" placeholder="Correct answer / answer key" class="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-700 q-answer" />
    <div class="grid grid-cols-2 gap-2">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" class="q-mandatory" />
        <span class="text-sm">Mandatory</span>
      </label>
      <input type="number" placeholder="Marks" value="1" min="1" class="p-2 border rounded dark:bg-gray-900 dark:border-gray-700 q-marks" />
    </div>
  `;
  list.appendChild(field);
  updateQuestionType(field.querySelector('.q-type'));
}

function updateQuestionType(select) {
  const field = select.closest('.question-field');
  const optionsContainer = field.querySelector('.q-options');
  const type = select.value;

  optionsContainer.innerHTML = '';

  if (type === 'mcq' || type === 'checkbox') {
    for (let i = 0; i < 4; i++) {
      const option = document.createElement('input');
      option.type = 'text';
      option.placeholder = `Option ${i + 1}`;
      option.className = 'w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-700 q-option';
      optionsContainer.appendChild(option);
    }
  }
}

function saveNewQuiz(modal) {
  const title = document.getElementById('quizTitle').value;
  const description = document.getElementById('quizDesc').value;
  const passPercentage = parseInt(document.getElementById('quizPassPercent').value);
  const timeLimit = parseInt(document.getElementById('quizTimeLimit').value);
  const randomizeQuestions = document.getElementById('quizRandomizeQuestions').checked;
  const randomizeOptions = document.getElementById('quizRandomizeOptions').checked;

  const questions = [];
  document.querySelectorAll('.question-field').forEach((field, idx) => {
    const type = field.querySelector('.q-type').value;
    const text = field.querySelector('.q-text').value;
    const answer = field.querySelector('.q-answer').value;
    const mandatory = field.querySelector('.q-mandatory').checked;
    const marks = parseInt(field.querySelector('.q-marks').value) || 1;

    const options = type === 'mcq' || type === 'checkbox'
      ? Array.from(field.querySelectorAll('.q-option')).map(o => o.value).filter(o => o)
      : [];

    questions.push({
      id: 'q_' + idx,
      type,
      question: text,
      options,
      correctAnswer: answer,
      mandatory,
      marks,
      randomizeOptions,
    });
  });

  const quiz = {
    id: 'quiz_' + Date.now(),
    title,
    description,
    questions,
    passPercentage,
    timeLimit,
    randomizeQuestions,
    randomizeOptions,
    createdBy: appState.currentUser.id,
    createdAt: new Date().toISOString(),
  };

  appState.quizzes.push(quiz);
  saveToStorage();
  loadAdminDashboard();
  modal.remove();
  alert('Quiz created successfully!');
}

function editQuiz(quizId) {
  alert('Edit functionality: Load quiz data and open edit modal');
}

function cloneQuiz(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;

  const cloned = {
    ...JSON.parse(JSON.stringify(quiz)),
    id: 'quiz_' + Date.now(),
    title: quiz.title + ' (Copy)',
    createdAt: new Date().toISOString(),
  };

  appState.quizzes.push(cloned);
  saveToStorage();
  loadAdminDashboard();
  alert('Quiz cloned successfully!');
}

function deleteQuiz(quizId) {
  if (confirm('Are you sure? This will not delete existing results.')) {
    appState.quizzes = appState.quizzes.filter(q => q.id !== quizId);
    saveToStorage();
    loadAdminDashboard();
  }
}

function deleteStudent(userId) {
  if (confirm('Are you sure? This will delete the student account.')) {
    appState.users = appState.users.filter(u => u.id !== userId);
    appState.results = appState.results.filter(r => r.userId !== userId);
    saveToStorage();
    loadAdminDashboard();
  }
}

function deleteResult(resultId) {
  if (confirm('Are you sure?')) {
    appState.results = appState.results.filter(r => r.id !== resultId);
    saveToStorage();
    loadAdminDashboard();
  }
}

function updateResultStatus(resultId, status) {
  const result = appState.results.find(r => r.id === resultId);
  if (result) {
    result.status = status;
    saveToStorage();
  }
}

function manuallyGradeResult(resultId) {
  const result = appState.results.find(r => r.id === resultId);
  if (!result) return;

  const newScore = prompt(`Current score: ${result.score}/${result.totalMarks}\nEnter new score:`, result.score);
  if (newScore !== null) {
    result.score = parseInt(newScore) || result.score;
    result.percentage = Math.round((result.score / result.totalMarks) * 100);
    result.status = 'manually_graded';
    saveToStorage();
    loadAdminDashboard();
  }
}

function handleBulkImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const csv = evt.target.result;
    const lines = csv.trim().split('\n');
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const [name, email, role] = lines[i].split(',').map(s => s.trim());
      if (name && email) {
        const existing = appState.users.find(u => u.email === email);
        if (!existing) {
          appState.users.push({
            id: 'usr_' + Date.now() + i,
            name,
            email,
            password: 'DefaultPass123!', // Should be changed on first login
            role: role || 'student',
            createdAt: new Date().toISOString(),
          });
          imported++;
        }
      }
    }

    saveToStorage();
    loadAdminDashboard();
    alert(`Imported ${imported} students from CSV file.`);
  };

  reader.readAsText(file);
  e.target.value = ''; // Reset file input
}

function sendReminderEmails() {
  const pending = appState.users.filter(u => u.role === 'student' && !appState.results.find(r => r.userId === u.id));
  alert(`Simulated: Sending reminder emails to ${pending.length} students with pending quizzes.\n\nIn production, this would integrate with an email service like SendGrid or Mailgun.`);
}

function exportResults(format) {
  if (format === 'csv') {
    let csv = 'Student Name,Email,Quiz Title,Score,Total,Percentage,Status,Date\n';
    appState.results.forEach(r => {
      const user = appState.users.find(u => u.id === r.userId);
      csv += `${user.name},${user.email},${r.quizTitle},${r.score},${r.totalMarks},${r.percentage}%,${r.status},${new Date(r.submittedAt).toLocaleDateString()}\n`;
    });
    downloadAsFile(csv, 'results.csv', 'text/csv');
  } else if (format === 'pdf') {
    alert('PDF export requires a backend library like pdfkit. For now, use browser print functionality.');
  }
}

function downloadAsFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// STORAGE & PERSISTENCE
// ============================================================================
function saveToStorage() {
  localStorage.setItem('nivnish_appState', JSON.stringify(appState));
}

function loadFromStorage() {
  const stored = localStorage.getItem('nivnish_appState');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      appState = { ...appState, ...parsed };
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }
}

// ============================================================================
// SAMPLE DATA
// ============================================================================
function loadSampleData() {
  // Only load sample data if no quizzes exist
  if (appState.quizzes.length > 0) return;

  // Create admin account
  if (!appState.users.find(u => u.email === 'admin@nivnish.com')) {
    appState.users.push({
      id: 'usr_admin',
      name: 'Admin User',
      email: 'admin@nivnish.com',
      password: 'admin123',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
  }

  // Create sample quizzes
  const sampleQuizzes = [
    {
      id: 'quiz_001',
      title: 'JavaScript Fundamentals',
      description: 'Test your knowledge of JavaScript basics',
      questions: [
        {
          id: 'q_0',
          type: 'mcq',
          question: 'What is the correct way to declare a variable in JavaScript?',
          options: ['var x = 5;', 'variable x = 5;', 'v x = 5;', 'declare x = 5;'],
          correctAnswer: 'var x = 5;',
          mandatory: true,
          marks: 1,
          randomizeOptions: true,
        },
        {
          id: 'q_1',
          type: 'short',
          question: 'What keyword is used to store a function in a variable?',
          options: [],
          correctAnswer: 'function',
          mandatory: true,
          marks: 1,
        },
        {
          id: 'q_2',
          type: 'checkbox',
          question: 'Which of the following are valid JavaScript data types? (Select all)',
          options: ['string', 'number', 'boolean', 'alphabet', 'object'],
          correctAnswer: 'string,number,boolean,object',
          mandatory: false,
          marks: 2,
        },
      ],
      passPercentage: 60,
      timeLimit: 15,
      randomizeQuestions: false,
      randomizeOptions: true,
      createdBy: 'usr_admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'quiz_002',
      title: 'HTML Essentials',
      description: 'HTML structure and semantics',
      questions: [
        {
          id: 'q_0',
          type: 'mcq',
          question: 'What does HTML stand for?',
          options: ['Hypertext Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlinks Text Markup Language'],
          correctAnswer: 'Hypertext Markup Language',
          mandatory: true,
          marks: 1,
        },
        {
          id: 'q_1',
          type: 'long',
          question: 'Describe the purpose of semantic HTML elements.',
          options: [],
          correctAnswer: '',
          mandatory: false,
          marks: 3,
        },
      ],
      passPercentage: 60,
      timeLimit: 10,
      randomizeQuestions: false,
      randomizeOptions: false,
      createdBy: 'usr_admin',
      createdAt: new Date().toISOString(),
    },
  ];

  appState.quizzes = sampleQuizzes;
  saveToStorage();
}

// ============================================================================
// FIREBASE INTEGRATION PLACEHOLDER
// ============================================================================
/*
To enable Firebase, uncomment the Firebase SDK links in index.html and use the functions below:

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Firestore data loading
async function loadFromFirestore() {
  const usersSnap = await db.collection('users').get();
  appState.users = usersSnap.docs.map(d => d.data());
  
  const quizzesSnap = await db.collection('quizzes').get();
  appState.quizzes = quizzesSnap.docs.map(d => d.data());
}

// Firestore data saving
async function saveToFirestore() {
  for (const user of appState.users) {
    await db.collection('users').doc(user.id).set(user);
  }
  for (const quiz of appState.quizzes) {
    await db.collection('quizzes').doc(quiz.id).set(quiz);
  }
}
*/
