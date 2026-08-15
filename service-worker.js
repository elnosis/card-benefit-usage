// 상단 버전 수정 시 메인 화면 버전 배지도 자동으로 업데이트됩니다.
const APP_VERSION = 'v1.0.24';
const CACHE_NAME = `card-picker-cherry-${APP_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

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

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

async function scheduleAlerts(schedules) {
  if (!schedules || !schedules.length) return;
  const hasTrigger = typeof TimestampTrigger !== 'undefined';

  for (const s of schedules) {
    const tag = 'remaining-alert-' + s.id;
    const options = {
      body: s.body || '이 달의 남은 카드 혜택을 확인해 보세요.',
      tag: tag,
      renotify: true,
      data: { action: 'open-remaining-list' },
      icon: './icon-192.png',
      badge: './icon-192.png'
    };

    if (hasTrigger && s.timestamp && s.timestamp > Date.now()) {
      try {
        options.showTrigger = new TimestampTrigger(s.timestamp);
        await self.registration.showNotification('🍒 남은 혜택 알림', options);
      } catch (err) {
        // Trigger 미지원 시 무시
      }
    }
  }
}

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

// 알림 클릭 → 남은 혜택 목록 화면
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL('index.html', self.registration.scope);
  targetUrl.searchParams.set('open', 'remaining-list');

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of clientList) {
      try {
        // 이미 열린 탭이 있으면 해당 URL로 이동 + 포커스 + 메시지
        if ('navigate' in client) {
          await client.navigate(targetUrl.href);
        }
        if ('focus' in client) {
          await client.focus();
        }
        client.postMessage({ type: 'OPEN_REMAINING_LIST' });
        return;
      } catch (err) {
        // 다음 클라이언트 시도
      }
    }

    // 열린 창이 없으면 새로 열기
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl.href);
    }
  })());
});
