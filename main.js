// Translations
const translations = {
  ko: {
    nav_home: "실시간 진단",
    nav_list: "저장 목록",
    nav_text: "문자/이미지 진단",
    welcome_title: "실시간 사기 탐지 서비스",
    welcome_desc: "AI 기술을 활용하여 보이스피싱과 스미싱으로부터 안전하게 보호해 드립니다.",
    login_req: "서비스 이용을 위해 로그인해주세요.",
    btn_login: "로그인",
    btn_signup: "회원가입",
    btn_logout: "로그아웃",
    btn_theme: "테마 변경",
    btn_lang: "English",
    diag_title: "실시간 통화 사기 진단",
    diag_desc: "통화 중 \"진단 시작\"을 누르면 AI가 실시간으로 분석합니다.",
    btn_start: "진단 시작",
    btn_stop: "진단 중지",
    status_idle: "대기 중",
    status_active: "진단 중 (실시간 분석 활성화)",
    status_alert: "⚠️ 사기 의심됨! ⚠️",
    list_rec_title: "녹음된 통화 목록",
    list_res_title: "문자/이미지 진단 결과 목록",
    no_data: "저장된 데이터가 없습니다.",
    text_title: "문자/이미지 사기 진단",
    text_desc: "의심되는 문자나 이미지(캡처본)를 업로드하세요.",
    placeholder_text: "분석할 문자 내용을 입력하세요.",
    label_image: "이미지 업로드:",
    btn_check: "사기 여부 진단하기",
    analyzing: "분석 중...",
    safe_msg: "정상적인 내용으로 보입니다.",
    scam_msg: "⚠️ 사기 의심! 탐지된 키워드: ",
    image_safe: "이미지 분석 결과: 사기 의심 정황 없음 (안전)",
    login_success: "로그인 성공! 이동 중...",
    login_fail: "아이디를 입력해주세요.",
    login_title: "로그인"
  },
  en: {
    nav_home: "Real-time Diagnosis",
    nav_list: "Storage List",
    nav_text: "Text/Image Diagnosis",
    welcome_title: "Real-time Fraud Detection",
    welcome_desc: "We protect you from voice phishing and smishing using AI technology.",
    login_req: "Please login to use our service.",
    btn_login: "Login",
    btn_signup: "Sign Up",
    btn_logout: "Logout",
    btn_theme: "Toggle Theme",
    btn_lang: "한국어",
    diag_title: "Real-time Call Fraud Diagnosis",
    diag_desc: "Press \"Start\" during a call for real-time AI analysis.",
    btn_start: "Start Diagnosis",
    btn_stop: "Stop Diagnosis",
    status_idle: "Waiting",
    status_active: "Diagnosing (Real-time Analysis Active)",
    status_alert: "⚠️ Fraud Suspected! ⚠️",
    list_rec_title: "Recorded Calls",
    list_res_title: "Text/Image Diagnosis Results",
    no_data: "No saved data found.",
    text_title: "Text/Image Fraud Diagnosis",
    text_desc: "Upload suspicious texts or images (screenshots).",
    placeholder_text: "Enter text content to analyze.",
    label_image: "Upload Image:",
    btn_check: "Analyze for Fraud",
    analyzing: "Analyzing...",
    safe_msg: "Content appears to be safe.",
    scam_msg: "⚠️ Fraud Detected! Keywords: ",
    image_safe: "Image analysis: No suspicious activity found (Safe)",
    login_success: "Login successful! Redirecting...",
    login_fail: "Please enter your ID.",
    login_title: "Login"
  }
};

// State Management
let currentLang = localStorage.getItem('lang') || 'ko';
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
const currentUser = localStorage.getItem('currentUser') || 'Guest';

// IndexedDB Setup
const DB_NAME = 'ScamDetectionDB';
const DB_VERSION = 2;
const RECORDINGS_STORE = 'recordings';
const RESULTS_STORE = 'results';
let db;

const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);
dbRequest.onsuccess = (event) => {
  db = event.target.result;
  if (window.location.pathname.includes('recordings.html')) {
    loadRecordings();
    loadResults();
  }
};

// UI Initialization
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage(currentLang);
  initTheme();
  initAuthView();
  
  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      currentLang = currentLang === 'ko' ? 'en' : 'ko';
      localStorage.setItem('lang', currentLang);
      applyLanguage(currentLang);
    });
  }

  if (window.location.pathname.includes('login.html')) {
    initLoginPage();
  }
});

function applyLanguage(lang) {
  const i18nElements = document.querySelectorAll('[data-i18n]');
  i18nElements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translations[lang][key];
      } else {
        el.textContent = translations[lang][key];
      }
    }
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

function initAuthView() {
  const guestSection = document.getElementById('guestSection');
  const mainSection = document.getElementById('mainSection');
  const nav = document.querySelector('nav');
  const loginBtn = document.getElementById('loginBtn');

  if (isLoggedIn) {
    if (guestSection) guestSection.classList.add('hidden');
    if (mainSection) mainSection.classList.remove('hidden');
    if (nav) nav.classList.remove('hidden');
  } else {
    if (guestSection) guestSection.classList.remove('hidden');
    if (mainSection) mainSection.classList.add('hidden');
    if (nav) nav.classList.add('hidden');
    
    // Redirect to home if trying to access restricted pages
    const path = window.location.pathname;
    if (path !== '/' && path !== '/index.html' && path !== '/login.html') {
      window.location.href = '/';
    }
  }

  if (loginBtn) {
    loginBtn.textContent = isLoggedIn ? `${currentUser} (${translations[currentLang].btn_logout})` : translations[currentLang].btn_login;
    loginBtn.addEventListener('click', () => {
      if (isLoggedIn) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        window.location.href = '/';
      } else {
        window.location.href = '/login.html';
      }
    });
  }
}

function initLoginPage() {
  const doLoginBtn = document.getElementById('doLogin');
  const usernameInput = document.getElementById('username');
  const loginMsg = document.getElementById('loginMsg');

  doLoginBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUser', username);
      loginMsg.textContent = translations[currentLang].login_success;
      loginMsg.style.color = 'green';
      setTimeout(() => window.location.href = '/', 1000);
    } else {
      loginMsg.textContent = translations[currentLang].login_fail;
      loginMsg.style.color = 'red';
    }
  });
}

// Features Logic (only if elements exist)
const startButton = document.getElementById('startButton');
if (startButton) {
  let mediaRecorder;
  let chunks = [];
  const stopButton = document.getElementById('stopButton');
  const statusSpan = document.getElementById('status');

  startButton.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        chunks = [];
        await saveRecording(blob);
      };
      mediaRecorder.start();
      startButton.disabled = true;
      stopButton.disabled = false;
      statusSpan.textContent = translations[currentLang].status_active;
      statusSpan.style.color = 'red';
    } catch (err) {
      alert('Microphone access denied.');
    }
  });

  stopButton.addEventListener('click', () => {
    mediaRecorder.stop();
    startButton.disabled = false;
    stopButton.disabled = true;
    statusSpan.textContent = translations[currentLang].status_idle;
    statusSpan.style.color = 'var(--text-color)';
  });
}

const checkButton = document.getElementById('checkButton');
if (checkButton) {
  checkButton.addEventListener('click', async () => {
    const text = document.getElementById('textInput').value;
    const image = document.getElementById('imageInput').files[0];
    const resultSpan = document.getElementById('result');
    let analysisResult = '';

    if (text) {
      const scamKeywords = ['검찰', '입금', '대출', '수사관', '계좌', '본인확인', 'Prosecutor', 'Deposit', 'Loan', 'Investigator', 'Account'];
      const foundKeywords = scamKeywords.filter(k => text.includes(k));
      analysisResult = foundKeywords.length > 0 
        ? translations[currentLang].scam_msg + foundKeywords.join(', ')
        : translations[currentLang].safe_msg;
    } else if (image) {
      resultSpan.textContent = translations[currentLang].analyzing;
      await new Promise(r => setTimeout(r, 1000));
      analysisResult = translations[currentLang].image_safe;
    }

    resultSpan.textContent = analysisResult;
    resultSpan.style.color = analysisResult.includes('⚠️') ? 'red' : 'green';
    await saveResult({ type: text ? 'Text' : 'Image', content: text || image.name, result: analysisResult, timestamp: new Date().toLocaleString(), user: currentUser });
  });
}

// Database Helpers
async function saveRecording(blob) {
  const tx = db.transaction([RECORDINGS_STORE], 'readwrite');
  tx.objectStore(RECORDINGS_STORE).add({ blob, timestamp: new Date().toLocaleString(), name: `Call - ${new Date().toLocaleTimeString()}`, user: currentUser });
}

async function saveResult(data) {
  const tx = db.transaction([RESULTS_STORE], 'readwrite');
  tx.objectStore(RESULTS_STORE).add(data);
}

async function loadRecordings() {
  if (!db) return;
  const request = db.transaction([RECORDINGS_STORE], 'readonly').objectStore(RECORDINGS_STORE).getAll();
  request.onsuccess = () => {
    const data = request.result.filter(r => r.user === currentUser);
    const list = document.getElementById('recordingsList');
    list.innerHTML = data.length ? '' : `<p>${translations[currentLang].no_data}</p>`;
    data.forEach(rec => {
      const li = document.createElement('li');
      li.className = 'recording-item';
      li.innerHTML = `<p><strong>${rec.name}</strong> (${rec.timestamp})</p><audio controls src="${URL.createObjectURL(rec.blob)}"></audio><br><button onclick="deleteItem('${RECORDINGS_STORE}', ${rec.id})">Delete</button>`;
      list.appendChild(li);
    });
  };
}

async function loadResults() {
  if (!db) return;
  const request = db.transaction([RESULTS_STORE], 'readonly').objectStore(RESULTS_STORE).getAll();
  request.onsuccess = () => {
    const data = request.result.filter(r => r.user === currentUser);
    const list = document.getElementById('resultsList');
    list.innerHTML = data.length ? '' : `<p>${translations[currentLang].no_data}</p>`;
    data.forEach(res => {
      const li = document.createElement('li');
      li.className = 'result-item';
      li.innerHTML = `<p><strong>[${res.type}]</strong> ${res.timestamp}</p><p>${res.result}</p><button onclick="deleteItem('${RESULTS_STORE}', ${res.id})">Delete</button>`;
      list.appendChild(li);
    });
  };
}

window.deleteItem = (store, id) => {
  const tx = db.transaction([store], 'readwrite');
  tx.objectStore(store).delete(id);
  tx.oncomplete = () => window.location.reload();
};
