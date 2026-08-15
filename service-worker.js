// 상단 버전 수정 시 메인 화면 버전 배지도 자동으로 업데이트됩니다.
const APP_VERSION = 'v1.0.22';
const CACHE_NAME = `card-picker-cherry-${APP_VERSION}`;

// 캐싱할 주요 정적 리소스 목록
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. 설치
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. 활성화
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

// 3. 페치: 캐시 우선
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

// 예약 알림 등록 (Chrome Android TimestampTrigger 지원 시)
async function scheduleAlerts(schedules) {
  if (!schedules || !schedules.length) return;

  const hasTrigger = typeof TimestampTrigger !== 'undefined';

  for (const s of schedules) {
    const tag = 'remaining-alert-' + s.id;
    const options = {
      body: '이 달의 남은 카드 혜택을 확인해 보세요.',
      tag: tag,
      renotify: true,
      data: { action: 'open-remaining-search' },
      icon: './icon-192.png',
      badge: './icon-192.png'
    };

    if (hasTrigger && s.timestamp && s.timestamp > Date.now()) {
      try {
        options.showTrigger = new TimestampTrigger(s.timestamp);
        await self.registration.showNotification('🍒 남은 혜택 알림', options);
        continue;
      } catch (err) {
        // Trigger 미지원 시 즉시 표시하지 않음
      }
    }
  }
}

// 4. 메시지
self.addEventListener('message', (e) => {
  if (!e.data) return;

  if (e.data.type === 'GET_VERSION') {
    if (e.ports && e.ports[0]) {
      e.ports[0].postMessage({ version: APP_VERSION });
    }
    return;
  }

  if (e.data.type === 'SCHEDULE_REMAINING_ALERTS') {
    e.waitUntil(scheduleAlerts(e.data.schedules || []));
  }
});

// 5. 알림 클릭 → 남은 혜택 검색 화면
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL('./index.html', self.location.href);
  url.searchParams.set('open', 'remaining-search');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'OPEN_REMAINING_SEARCH' });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url.href);
      }
    })
  );
});
