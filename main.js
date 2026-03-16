// IndexedDB Setup
const DB_NAME = 'ScamDetectionDB';
const DB_VERSION = 2; // Incremented version for new store
const RECORDINGS_STORE = 'recordings';
const RESULTS_STORE = 'results';

let db;
const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);

dbRequest.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
    db.createObjectStore(RECORDINGS_STORE, { keyPath: 'id', autoIncrement: true });
  }
  if (!db.objectStoreNames.contains(RESULTS_STORE)) {
    db.createObjectStore(RESULTS_STORE, { keyPath: 'id', autoIncrement: true });
  }
};

dbRequest.onsuccess = (event) => {
  db = event.target.result;
  console.log('Database initialized');
  if (window.location.pathname.includes('recordings.html')) {
    loadRecordings();
    loadResults();
  }
};

// UI Elements & State
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
const currentUser = localStorage.getItem('currentUser') || 'Guest';

// Common UI Logic (Theme & Login)
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  if (window.location.pathname.includes('login.html')) {
    initLoginPage();
  }
});

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

function initNav() {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.textContent = isLoggedIn ? `${currentUser} (로그아웃)` : '로그인';
    loginBtn.addEventListener('click', () => {
      if (isLoggedIn) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        window.location.reload();
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
      loginMsg.textContent = '로그인 성공! 이동 중...';
      loginMsg.style.color = 'green';
      setTimeout(() => window.location.href = '/', 1000);
    } else {
      loginMsg.textContent = '아이디를 입력해주세요.';
      loginMsg.style.color = 'red';
    }
  });
}

// Recording Logic
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusSpan = document.getElementById('status');
const recordingsList = document.getElementById('recordingsList');

let mediaRecorder;
let chunks = [];

if (startButton) {
  startButton.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          analyzeChunk(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        chunks = [];
        await saveRecording(blob);
      };

      mediaRecorder.start(5000); 
      startButton.disabled = true;
      stopButton.disabled = false;
      statusSpan.textContent = '진단 중 (실시간 분석 활성화)';
      statusSpan.style.color = 'red';
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('마이크 접근 권한이 필요합니다.');
    }
  });
}

if (stopButton) {
  stopButton.addEventListener('click', () => {
    mediaRecorder.stop();
    startButton.disabled = false;
    stopButton.disabled = true;
    statusSpan.textContent = '대기 중';
    statusSpan.style.color = 'var(--text-color)';
  });
}

function analyzeChunk(blob) {
  const isScamSuspected = Math.random() > 0.9; 
  if (isScamSuspected) {
    const message = "보이스피싱이 의심됩니다. 통화를 주의하시거나 종료하세요.";
    speakAlert(message);
    statusSpan.textContent = '⚠️ 사기 의심됨! ⚠️';
  }
}

function speakAlert(message) {
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'ko-KR';
  window.speechSynthesis.speak(utterance);
}

// Text/Image Checker Logic
const textInput = document.getElementById('textInput');
const imageInput = document.getElementById('imageInput');
const checkButton = document.getElementById('checkButton');
const resultSpan = document.getElementById('result');

if (checkButton) {
  checkButton.addEventListener('click', async () => {
    const text = textInput.value;
    const image = imageInput.files[0];
    let analysisResult = '';

    if (text) {
      analysisResult = simulateTextAnalysis(text);
    } else if (image) {
      resultSpan.textContent = '이미지 분석 중...';
      await new Promise(r => setTimeout(r, 1500));
      analysisResult = '이미지 분석 결과: 사기 의심 정황 없음 (안전)';
    } else {
      resultSpan.textContent = '분석할 내용이 없습니다.';
      return;
    }

    resultSpan.textContent = analysisResult;
    resultSpan.style.color = analysisResult.includes('⚠️') ? 'red' : 'green';
    
    // Save Result
    await saveResult({
      type: text ? 'Text' : 'Image',
      content: text || image.name,
      result: analysisResult,
      timestamp: new Date().toLocaleString(),
      user: currentUser
    });
  });
}

function simulateTextAnalysis(text) {
  const scamKeywords = ['검찰', '입금', '대출', '수사관', '계좌', '본인확인'];
  const foundKeywords = scamKeywords.filter(keyword => text.includes(keyword));
  return foundKeywords.length > 0 
    ? `⚠️ 사기 의심! 탐지된 키워드: ${foundKeywords.join(', ')}`
    : '정상적인 내용으로 보입니다.';
}

// Database Operations
async function saveRecording(blob) {
  const transaction = db.transaction([RECORDINGS_STORE], 'readwrite');
  const store = transaction.objectStore(RECORDINGS_STORE);
  const recording = {
    blob: blob,
    timestamp: new Date().toLocaleString(),
    name: `통화 녹음 - ${new Date().toLocaleTimeString()}`,
    user: currentUser
  };
  store.add(recording);
  transaction.oncomplete = () => alert('녹음이 저장되었습니다.');
}

async function saveResult(data) {
  const transaction = db.transaction([RESULTS_STORE], 'readwrite');
  const store = transaction.objectStore(RESULTS_STORE);
  store.add(data);
  transaction.oncomplete = () => console.log('Result saved');
}

async function loadRecordings() {
  if (!db) return;
  const transaction = db.transaction([RECORDINGS_STORE], 'readonly');
  const store = transaction.objectStore(RECORDINGS_STORE);
  const request = store.getAll();

  request.onsuccess = () => {
    const recordings = request.result.filter(r => r.user === currentUser);
    const list = document.getElementById('recordingsList');
    list.innerHTML = recordings.length ? '' : '<p>저장된 녹음이 없습니다.</p>';
    recordings.forEach((rec) => {
      const li = document.createElement('li');
      li.className = 'recording-item';
      li.innerHTML = `
        <p><strong>${rec.name}</strong> (${rec.timestamp})</p>
        <audio controls src="${URL.createObjectURL(rec.blob)}"></audio>
        <br>
        <button onclick="deleteItem('${RECORDINGS_STORE}', ${rec.id})">삭제</button>
      `;
      list.appendChild(li);
    });
  };
}

async function loadResults() {
  if (!db) return;
  const transaction = db.transaction([RESULTS_STORE], 'readonly');
  const store = transaction.objectStore(RESULTS_STORE);
  const request = store.getAll();

  request.onsuccess = () => {
    const results = request.result.filter(r => r.user === currentUser);
    const list = document.getElementById('resultsList');
    list.innerHTML = results.length ? '' : '<p>저장된 결과가 없습니다.</p>';
    results.forEach((res) => {
      const li = document.createElement('li');
      li.className = 'result-item';
      li.innerHTML = `
        <p><strong>[${res.type}]</strong> ${res.timestamp}</p>
        <p>내용: ${res.content.substring(0, 50)}${res.content.length > 50 ? '...' : ''}</p>
        <p>결과: ${res.result}</p>
        <button onclick="deleteItem('${RESULTS_STORE}', ${res.id})">삭제</button>
      `;
      list.appendChild(li);
    });
  };
}

window.deleteItem = (storeName, id) => {
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  store.delete(id);
  transaction.oncomplete = () => {
    if (storeName === RECORDINGS_STORE) loadRecordings();
    else loadResults();
  };
};
