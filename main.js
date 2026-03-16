// --- 1. 다국어 데이터 ---
const translations = {
  ko: {
    nav_home: "실시간 진단", nav_list: "저장 목록", nav_text: "문자/이미지 진단",
    welcome_title: "실시간 사기 탐지 서비스", welcome_desc: "AI 기술로 보이스피싱으로부터 보호합니다.",
    btn_login: "로그인", btn_signup: "회원가입", btn_logout: "로그아웃",
    btn_theme: "테마 변경", btn_lang: "English",
    diag_title: "실시간 통화 사기 진단", diag_desc: "통화 중 실시간으로 분석합니다.",
    btn_start: "진단 시작", btn_stop: "진단 중지",
    status_idle: "대기 중", status_active: "진단 중...",
    no_data: "데이터가 없습니다.",
    login_success: "로그인 성공!", signup_success: "가입 성공! 로그인해주세요.",
    login_fail: "정보를 확인해주세요.", id_taken: "이미 있는 아이디입니다.",
    fill_all: "모두 입력해주세요.", login_title: "로그인 / 회원가입"
  },
  en: {
    nav_home: "Diagnosis", nav_list: "Records", nav_text: "Text Check",
    welcome_title: "Fraud Detection", welcome_desc: "Protecting you from phishing with AI.",
    btn_login: "Login", btn_signup: "Sign Up", btn_logout: "Logout",
    btn_theme: "Theme", btn_lang: "한국어",
    diag_title: "Live Call Diagnosis", diag_desc: "Real-time AI analysis active.",
    btn_start: "Start", btn_stop: "Stop",
    status_idle: "Idle", status_active: "Analyzing...",
    no_data: "No data.",
    login_success: "Welcome!", signup_success: "Signed up! Please login.",
    login_fail: "Check ID/PW.", id_taken: "ID exists.",
    fill_all: "Fill all fields.", login_title: "Login / Signup"
  }
};

// --- 2. 상태 및 설정 ---
let currentLang = localStorage.getItem('lang') || 'ko';
let db;

// --- 3. 데이터베이스 초기화 (Promise) ---
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ScamDetectionDB', 3);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('results')) db.createObjectStore('results', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'username' });
    };
    request.onsuccess = (e) => { db = e.target.result; resolve(db); };
    request.onerror = (e) => reject(e);
  });
}

// --- 4. 공통 UI 함수 ---
function applyLang() {
  const lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = translations[lang][key];
      else el.textContent = translations[lang][key];
    }
  });
  
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    const user = localStorage.getItem('currentUser');
    loginBtn.textContent = user ? `${user} (${translations[lang].btn_logout})` : translations[lang].btn_login;
  }
}

function updateAuthView() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const guestSection = document.getElementById('guestSection');
  const mainSection = document.getElementById('mainSection');
  const nav = document.querySelector('nav');

  if (isLoggedIn) {
    if (guestSection) guestSection.classList.add('hidden');
    if (mainSection) mainSection.classList.remove('hidden');
    if (nav) nav.classList.remove('hidden');
  } else {
    if (guestSection) guestSection.classList.remove('hidden');
    if (mainSection) mainSection.classList.add('hidden');
    if (nav) nav.classList.add('hidden');
    
    // 보호된 페이지 접근 제한 (로그인 페이지와 인덱스가 아닌 경우 홈으로)
    const isLoginPage = !!document.getElementById('doLogin');
    const isGuestPage = !!document.getElementById('guestSection');
    if (!isLoginPage && !isGuestPage) {
      window.location.href = './index.html';
    }
  }
}

// --- 5. 페이지별 로직 ---
async function setupPages() {
  // 테마/언어 설정 (공통)
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  });

  document.getElementById('langToggle')?.addEventListener('click', () => {
    currentLang = currentLang === 'ko' ? 'en' : 'ko';
    localStorage.setItem('lang', currentLang);
    applyLang();
  });

  document.getElementById('loginBtn')?.addEventListener('click', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
      localStorage.clear(); // 로그아웃 시 전체 초기화
      window.location.href = './index.html';
    } else {
      window.location.href = './login.html';
    }
  });

  // 로그인/회원가입 페이지
  const doLogin = document.getElementById('doLogin');
  const doSignup = document.getElementById('doSignup');
  if (doLogin && doSignup) {
    const userIn = document.getElementById('username');
    const passIn = document.getElementById('password');
    const msg = document.getElementById('loginMsg');

    doLogin.onclick = () => {
      const tx = db.transaction('users', 'readonly');
      const request = tx.objectStore('users').get(userIn.value.trim());
      request.onsuccess = () => {
        const user = request.result;
        if (user && user.password === passIn.value.trim()) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', user.username);
          msg.textContent = translations[currentLang].login_success;
          setTimeout(() => window.location.href = './index.html', 500);
        } else {
          msg.textContent = translations[currentLang].login_fail;
        }
      };
    };

    doSignup.onclick = () => {
      const username = userIn.value.trim();
      const password = passIn.value.trim();
      if (!username || !password) {
        msg.textContent = translations[currentLang].fill_all;
        return;
      }
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const check = store.get(username);
      check.onsuccess = () => {
        if (check.result) {
          msg.textContent = translations[currentLang].id_taken;
        } else {
          store.add({ username, password });
          msg.textContent = translations[currentLang].signup_success;
        }
      };
    };
  }

  // 실시간 진단 (index.html)
  const startBtn = document.getElementById('startButton');
  if (startBtn) {
    let mediaRecorder;
    let chunks = [];
    const stopBtn = document.getElementById('stopButton');
    const status = document.getElementById('status');

    startBtn.onclick = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        chunks = [];
        const tx = db.transaction('recordings', 'readwrite');
        tx.objectStore('recordings').add({ 
          blob, user: localStorage.getItem('currentUser'), 
          timestamp: new Date().toLocaleString(), name: 'Call ' + new Date().toLocaleTimeString() 
        });
        alert('저장 완료!');
      };
      mediaRecorder.start();
      startBtn.disabled = true; stopBtn.disabled = false;
      status.textContent = translations[currentLang].status_active;
    };
    if (stopBtn) stopBtn.onclick = () => {
      mediaRecorder.stop();
      startBtn.disabled = false; stopBtn.disabled = true;
      status.textContent = translations[currentLang].status_idle;
    };
  }

  // 목록 로드 (recordings.html)
  if (document.getElementById('recordingsList')) {
    const user = localStorage.getItem('currentUser');
    db.transaction('recordings', 'readonly').objectStore('recordings').getAll().onsuccess = (e) => {
      const list = document.getElementById('recordingsList');
      const items = e.target.result.filter(r => r.user === user);
      list.innerHTML = items.length ? '' : translations[currentLang].no_data;
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'recording-item';
        div.innerHTML = `<p>${item.name}</p><audio controls src="${URL.createObjectURL(item.blob)}"></audio>
          <button onclick="deleteItem('recordings', ${item.id})">Delete</button>`;
        list.appendChild(div);
      });
    };
    db.transaction('results', 'readonly').objectStore('results').getAll().onsuccess = (e) => {
      const list = document.getElementById('resultsList');
      const items = e.target.result.filter(r => r.user === user);
      list.innerHTML = items.length ? '' : translations[currentLang].no_data;
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `<p>${item.timestamp}</p><p>${item.result}</p>
          <button onclick="deleteItem('results', ${item.id})">Delete</button>`;
        list.appendChild(div);
      });
    };
  }

  // 문자 진단 (text_checker.html)
  const checkBtn = document.getElementById('checkButton');
  if (checkBtn) {
    checkBtn.onclick = () => {
      const text = document.getElementById('textInput').value;
      const resEl = document.getElementById('result');
      const scam = text.includes('검찰') || text.includes('입금');
      const result = scam ? '⚠️ 사기 의심' : '정상';
      resEl.textContent = result;
      db.transaction('results', 'readwrite').objectStore('results').add({
        user: localStorage.getItem('currentUser'), result, timestamp: new Date().toLocaleString()
      });
    };
  }
}

// 전역 삭제 함수
window.deleteItem = (store, id) => {
  db.transaction(store, 'readwrite').objectStore(store).delete(id).onsuccess = () => window.location.reload();
};

// --- 6. 실행 시작 ---
(async () => {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
  updateAuthView(); // 즉시 UI 처리
  await initDB();
  applyLang();
  await setupPages();
})();
