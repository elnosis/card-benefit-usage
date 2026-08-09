// 상단 버전 수정 시 메인 화면 버전 배지도 자동으로 업데이트됩니다.
const APP_VERSION = 'v1.0.0'; 
const CACHE_NAME = `growth-app-${APP_VERSION}`; 

// 캐싱할 주요 정적 리소스 목록
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. 설치: 이전 서비스 워커를 기다리지 않고 즉시 설치 및 기본 리소스 캐싱
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. 활성화: 구버전 캐시 삭제 및 클라이언트 제어 권한 확보
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 페치: 캐시 우선, 없으면 네트워크 요청
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

// 4. 메인 스크립트(index.html)로부터 버전 요청 시 응답
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'GET_VERSION') {
    if (e.ports && e.ports[0]) {
      e.ports[0].postMessage({ version: APP_VERSION });
    }
  }
});
