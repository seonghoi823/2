// Firebase Configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 0. Mock System (For testing without Firebase) ---
const isMock = firebaseConfig.apiKey === "YOUR_API_KEY";

let auth, fs;
let mockUser = JSON.parse(localStorage.getItem('mockUser') || 'null');
const mockListeners = [];

const mockAuth = {
  get currentUser() { return mockUser; }
};

const mockOnAuthStateChanged = (authObj, callback) => {
  mockListeners.push(callback);
  // Execute callback with current mockUser state
  setTimeout(() => callback(mockUser), 0);
  return () => {
    const idx = mockListeners.indexOf(callback);
    if (idx > -1) mockListeners.splice(idx, 1);
  };
};

const mockSignOut = async () => {
  mockUser = null;
  localStorage.removeItem('mockUser');
  mockListeners.forEach(cb => cb(null));
};

const mockSignIn = async (authObj, email, password) => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const request = store.get(email.split('@')[0]);
      request.onsuccess = () => {
        const user = request.result;
        if (user && user.password === password) {
          mockUser = { uid: email, email: email };
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
          mockListeners.forEach(cb => cb(mockUser));
          resolve({ user: mockUser });
        } else {
          reject({ code: 'auth/wrong-password', message: '아이디 또는 비밀번호가 틀립니다.' });
        }
      };
      request.onerror = () => reject({ code: 'auth/user-not-found', message: '사용자를 찾을 수 없습니다.' });
    } catch (e) {
      reject({ code: 'auth/unknown', message: '로그인 도중 오류가 발생했습니다: ' + e.message });
    }
  });
};

const mockSignUp = async (authObj, email, password) => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const username = email.split('@')[0];
      const checkRequest = store.get(username);
      checkRequest.onsuccess = () => {
        if (checkRequest.result) {
          reject({ code: 'auth/email-already-in-use', message: '이미 존재하는 아이디입니다.' });
        } else {
          const addRequest = store.add({ username, password });
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject({ code: 'auth/unknown', message: '가입 저장 중 오류가 발생했습니다.' });
        }
      };
      checkRequest.onerror = () => reject({ code: 'auth/unknown', message: '아이디 확인 중 오류가 발생했습니다.' });
    } catch (e) {
      reject({ code: 'auth/unknown', message: '데이터베이스 연결 오류: ' + e.message });
    }
  });
};

// Firestore Mock
const mockFs = {
  // Very basic mock for firestore
};

if (!isMock) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  fs = getFirestore(app);
} else {
  console.warn("Firebase API Key is missing. Using Mock Auth (IndexedDB).");
  auth = mockAuth;
}

// Wrap Firebase functions to use mocks if necessary
const _onAuthStateChanged = isMock ? mockOnAuthStateChanged : onAuthStateChanged;
const _signInWithEmailAndPassword = isMock ? mockSignIn : signInWithEmailAndPassword;
const _createUserWithEmailAndPassword = isMock ? mockSignUp : createUserWithEmailAndPassword;
const _signOut = isMock ? mockSignOut : signOut;

// --- 1. 다국어 데이터 ---
const translations = {
  ko: {
    nav_home: "실시간 진단", nav_list: "저장 목록", nav_text: "문자/이미지 진단",
    welcome_title: "실시간 사기 탐지 서비스", welcome_desc: "AI 기술로 보이스피싱으로부터 보호합니다.",
    btn_login: "로그인", btn_signup: "회원가입", btn_logout: "로그아웃",
    btn_theme: "테마 변경", btn_lang: "English", btn_community: "소통과 공감",
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
    btn_theme: "Theme", btn_lang: "한국어", btn_community: "Community",
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

// --- 3. 데이터베이스 초기화 (IndexedDB - 로컬 보조용) ---
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ScamDetectionDB', 4);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('results')) db.createObjectStore('results', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'username' });
      if (!db.objectStoreNames.contains('posts')) db.createObjectStore('posts', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = (e) => { db = e.target.result; resolve(db); };
    request.onerror = (e) => { console.error('DB Error:', e); reject(e); };
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
    const user = auth.currentUser;
    loginBtn.textContent = user ? `${user.email.split('@')[0]} (${translations[lang].btn_logout})` : translations[lang].btn_login;
  }
}

function updateAuthView(user) {
  const isLoggedIn = !!user;
  const guestSection = document.getElementById('guestSection');
  const mainSection = document.getElementById('mainSection');
  const nav = document.querySelector('nav');
  const communityBtns = document.querySelectorAll('.community-btn');

  if (isLoggedIn) {
    if (guestSection) guestSection.classList.add('hidden');
    if (mainSection) mainSection.classList.remove('hidden');
    if (nav) nav.classList.remove('hidden');
    communityBtns.forEach(btn => btn.classList.remove('hidden'));
  } else {
    if (guestSection) guestSection.classList.remove('hidden');
    if (mainSection) mainSection.classList.add('hidden');
    if (nav) nav.classList.add('hidden');
    communityBtns.forEach(btn => btn.classList.add('hidden'));
    
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html') || path.endsWith('/login');
    const isGuestPage = !!document.getElementById('guestSection');
    const isPartnershipPage = path.includes('partnership.html') || path.endsWith('/partnership');
    
    if (!isLoginPage && !isGuestPage && !isPartnershipPage) {
      window.location.href = './index.html';
    }
  }
  applyLang();
}

// --- 5. 커뮤니티 로직 (Firestore 연동) ---
async function setupCommunity() {
  const listSection = document.getElementById('listSection');
  if (!listSection) return;

  const writeSection = document.getElementById('writeSection');
  const detailSection = document.getElementById('detailSection');
  const postList = document.getElementById('postList');
  const showWriteBtn = document.getElementById('showWriteForm');
  const submitBtn = document.getElementById('submitPost');
  const cancelBtn = document.getElementById('cancelWrite');
  const backBtn = document.getElementById('backToList');
  const likeBtn = document.getElementById('likeButton');

  // Firestore 리스너 (실시간 동기화)
  if (!isMock) {
    const q = query(collection(fs, "posts"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
      const posts = [];
      snapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() });
      });
      renderList(posts);
    });
  } else {
    // Mock for community list
    const updateMockList = () => {
      const tx = db.transaction('posts', 'readonly');
      const store = tx.objectStore('posts');
      const request = store.getAll();
      request.onsuccess = () => {
        const posts = request.result.sort((a, b) => b.timestamp - a.timestamp);
        renderList(posts);
      };
    };
    updateMockList();
    window.addEventListener('post-added', updateMockList);
  }

  const renderList = (posts) => {
    postList.innerHTML = posts.length ? '' : '<p>첫 번째 글을 작성해보세요!</p>';
    posts.forEach(post => {
      const div = document.createElement('div');
      div.className = 'recording-item';
      div.style.cursor = 'pointer';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0;">${post.title}</h3>
          <span style="color: var(--danger-color);">❤️ ${post.likes || 0}</span>
        </div>
        <p style="font-size: 12px; color: #888; margin-top: 5px;">${post.isAnonymous ? '익명' : post.authorName} | ${post.timestamp ? new Date(isMock ? post.timestamp : post.timestamp.seconds * 1000).toLocaleString() : ''}</p>
      `;
      div.onclick = () => showDetail(post);
      postList.appendChild(div);
    });
  };

  const showDetail = (post) => {
    document.getElementById('detailTitle').textContent = post.title;
    document.getElementById('detailAuthor').textContent = post.isAnonymous ? '익명' : post.authorName;
    document.getElementById('detailDate').textContent = post.timestamp ? new Date(isMock ? post.timestamp : post.timestamp.seconds * 1000).toLocaleString() : '';
    document.getElementById('detailContent').textContent = post.content;
    document.getElementById('detailLikes').textContent = post.likes || 0;

    listSection.classList.add('hidden');
    writeSection.classList.add('hidden');
    detailSection.classList.remove('hidden');

    if (typeof loadDisqus === 'function') {
      loadDisqus(post.id, post.title);
    }

    likeBtn.onclick = async () => {
      if (!isMock) {
        const postRef = doc(fs, "posts", post.id);
        await updateDoc(postRef, {
          likes: (post.likes || 0) + 1
        });
      } else {
        const tx = db.transaction('posts', 'readwrite');
        const store = tx.objectStore('posts');
        post.likes = (post.likes || 0) + 1;
        store.put(post);
      }
      document.getElementById('detailLikes').textContent = (post.likes || 0) + 1;
    };
  };

  showWriteBtn.onclick = () => {
    listSection.classList.add('hidden');
    writeSection.classList.remove('hidden');
  };

  cancelBtn.onclick = () => {
    writeSection.classList.add('hidden');
    listSection.classList.remove('hidden');
  };

  backBtn.onclick = () => {
    detailSection.classList.add('hidden');
    listSection.classList.remove('hidden');
  };

  submitBtn.onclick = async () => {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const isAnonymous = document.getElementById('isAnonymous').checked;
    
    if (!title || !content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    const user = auth.currentUser;
    const newPost = {
      title,
      content,
      isAnonymous,
      authorId: user.uid,
      authorName: user.email.split('@')[0],
      likes: 0,
      timestamp: new Date()
    };

    if (!isMock) {
      await addDoc(collection(fs, "posts"), newPost);
    } else {
      const tx = db.transaction('posts', 'readwrite');
      const store = tx.objectStore('posts');
      store.add(newPost);
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('post-added'));
      };
    }
    
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    writeSection.classList.add('hidden');
    listSection.classList.remove('hidden');
  };
}

// --- 6. 페이지별 로직 ---
async function setupPages() {
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

  document.getElementById('loginBtn')?.addEventListener('click', async () => {
    if (auth.currentUser) {
      await _signOut(auth);
      window.location.href = './index.html';
    } else {
      window.location.href = './login.html';
    }
  });

  await setupCommunity();

  // 로그인/회원가입 페이지
  const doLogin = document.getElementById('doLogin');
  const doSignup = document.getElementById('doSignup');
  if (doLogin && doSignup) {
    const userIn = document.getElementById('username');
    const passIn = document.getElementById('password');
    const msg = document.getElementById('loginMsg');

    doLogin.addEventListener('click', async () => {
      const email = userIn.value.trim() + "@temp.com"; // 기존 아이디 방식을 이메일 형식으로 보완
      const password = passIn.value.trim();
      if (!userIn.value.trim() || !password) {
        msg.textContent = translations[currentLang].fill_all;
        return;
      }
      try {
        await _signInWithEmailAndPassword(auth, email, password);
        msg.textContent = translations[currentLang].login_success;
        setTimeout(() => window.location.href = './index.html', 500);
      } catch (err) {
        console.error(err);
        msg.textContent = translations[currentLang].login_fail;
      }
    });

    doSignup.addEventListener('click', async () => {
      const email = userIn.value.trim() + "@temp.com";
      const password = passIn.value.trim();
      if (!userIn.value.trim() || !password) {
        msg.textContent = translations[currentLang].fill_all;
        return;
      }
      if (password.length < 6) {
        msg.textContent = "비밀번호는 6자리 이상이어야 합니다.";
        return;
      }
      try {
        await _createUserWithEmailAndPassword(auth, email, password);
        msg.textContent = translations[currentLang].signup_success;
      } catch (err) {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
          msg.textContent = translations[currentLang].id_taken;
        } else {
          msg.textContent = "가입 실패: " + err.message;
        }
      }
    });
  }

  // 실시간 진단 (index.html)
  const startBtn = document.getElementById('startButton');
  if (startBtn) {
    let mediaRecorder;
    let chunks = [];
    const stopBtn = document.getElementById('stopButton');
    const status = document.getElementById('status');

    startBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          chunks = [];
          const tx = db.transaction('recordings', 'readwrite');
          tx.objectStore('recordings').add({ 
            blob, user: auth.currentUser?.uid, 
            timestamp: new Date().toLocaleString(), name: 'Call ' + new Date().toLocaleTimeString() 
          });
          alert('저장 완료!');
        };
        mediaRecorder.start();
        startBtn.disabled = true; stopBtn.disabled = false;
        status.textContent = translations[currentLang].status_active;
      } catch (err) {
        alert('마이크 권한이 필요합니다.');
      }
    };
    if (stopBtn) stopBtn.onclick = () => {
      if (mediaRecorder) mediaRecorder.stop();
      startBtn.disabled = false; stopBtn.disabled = true;
      status.textContent = translations[currentLang].status_idle;
    };
  }
}

// --- 7. 실행 시작 ---
(async () => {
  try {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
    await initDB();
    
    // Auth 상태 변경 리스너
    _onAuthStateChanged(auth, (user) => {
      updateAuthView(user);
    });

    await setupPages();
  } catch (err) {
    console.error('Initialization failed:', err);
  }
})();
