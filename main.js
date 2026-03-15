// IndexedDB Setup
const DB_NAME = 'ScamDetectionDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

let db;
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
  }
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log('Database initialized');
  if (window.location.pathname.includes('recordings.html')) {
    loadRecordings();
  }
};

// UI Elements
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusSpan = document.getElementById('status');
const recordingsList = document.getElementById('recordingsList');
const textInput = document.getElementById('textInput');
const imageInput = document.getElementById('imageInput');
const checkButton = document.getElementById('checkButton');
const resultSpan = document.getElementById('result');

let mediaRecorder;
let chunks = [];
let analysisInterval;

// Audio Real-time Analysis Logic
if (startButton) {
  startButton.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          analyzeChunk(e.data); // Real-time simulation
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        chunks = [];
        await saveRecording(blob);
        alert('녹음이 저장되었습니다.');
      };

      // Start recording with 5-second intervals for real-time analysis
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
    statusSpan.style.color = 'black';
  });
}

// Real-time AI Simulation & Voice Alert
function analyzeChunk(blob) {
  console.log('Analyzing audio chunk...');
  // Simulate AI detection (randomly or by some criteria)
  // In a real app, this would send the blob to a server/AI model
  const isScamSuspected = Math.random() > 0.8; // 20% chance of alert for demo

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

// Database Operations
async function saveRecording(blob) {
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const recording = {
    blob: blob,
    timestamp: new Date().toLocaleString(),
    name: `통화 녹음 - ${new Date().toLocaleTimeString()}`
  };
  store.add(recording);
}

async function loadRecordings() {
  if (!db) return;
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = () => {
    const recordings = request.result;
    recordingsList.innerHTML = '';
    recordings.forEach((rec) => {
      const li = document.createElement('li');
      li.className = 'recording-item';
      
      const title = document.createElement('p');
      title.textContent = `${rec.name} (${rec.timestamp})`;
      
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = URL.createObjectURL(rec.blob);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '삭제';
      deleteBtn.onclick = () => deleteRecording(rec.id);

      li.appendChild(title);
      li.appendChild(audio);
      li.appendChild(deleteBtn);
      recordingsList.appendChild(li);
    });
  };
}

function deleteRecording(id) {
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(id);
  transaction.oncomplete = () => loadRecordings();
}

// Text/Image Checker Logic
if (checkButton) {
  checkButton.addEventListener('click', () => {
    const text = textInput.value;
    const image = imageInput.files[0];

    if (text) {
      simulateTextAnalysis(text);
    } else if (image) {
      resultSpan.textContent = '이미지 분석 중...';
      setTimeout(() => {
        resultSpan.textContent = '이미지 분석 결과: 사기 의심 정황 없음 (안전)';
        resultSpan.style.color = 'green';
      }, 1500);
    } else {
      resultSpan.textContent = '분석할 내용이 없습니다.';
      resultSpan.style.color = 'black';
    }
  });
}

function simulateTextAnalysis(text) {
  const scamKeywords = ['검찰', '입금', '대출', '수사관', '계좌', '본인확인'];
  const foundKeywords = scamKeywords.filter(keyword => text.includes(keyword));

  if (foundKeywords.length > 0) {
    resultSpan.textContent = `⚠️ 사기 의심! 탐지된 키워드: ${foundKeywords.join(', ')}`;
    resultSpan.style.color = 'red';
  } else {
    resultSpan.textContent = '정상적인 내용으로 보입니다.';
    resultSpan.style.color = 'green';
  }
}
