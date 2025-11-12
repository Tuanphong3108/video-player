// Tên Cache và phiên bản hiện tại
const CACHE_NAME = 'video-player-cache-v1';

// Danh sách các tài nguyên cần cache:
// - '/' (hoặc index.html) là trang chính
// - manifest.json
// - Các thư viện bên ngoài (Tailwind, Material Icons, Inter Font)
const urlsToCache = [
    '/',
    'index.html',
    'manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
];

// --- 1. Sự kiện INSTALL (Lắp đặt) ---
self.addEventListener('install', (event) => {
    // Chờ cho đến khi cache hoàn tất (đảm bảo tính nguyên vẹn)
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Đang mở cache và thêm tài nguyên...');
                // Cache tất cả các URL đã định nghĩa
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Lỗi thêm tài nguyên vào cache:', error);
            })
    );
});

// --- 2. Sự kiện ACTIVATE (Kích hoạt/Dọn dẹp) ---
self.addEventListener('activate', (event) => {
    // Xóa các cache cũ không còn dùng nữa
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Đang dọn dẹp cache cũ:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// --- 3. Sự kiện FETCH (Tìm nạp) ---
self.addEventListener('fetch', (event) => {
    // Chiến lược: Cache-First (Ưu tiên Cache)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Trả về từ cache nếu tìm thấy
                if (response) {
                    return response;
                }
                
                // Nếu không có trong cache, fetch từ network
                // Clone request vì request là stream và chỉ có thể được đọc 1 lần
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then(
                    (networkResponse) => {
                        // Kiểm tra Response hợp lệ (Không phải lỗi, không phải CORS rỗng)
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        
                        // Nếu là network request, cache nó lại cho lần sau
                        const responseToCache = networkResponse.clone();
                        
                        // Quan trọng: Chỉ cache GET requests
                        if (event.request.method === 'GET') {
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        
                        return networkResponse;
                    }
                ).catch(error => {
                    console.error('Service Worker: Lỗi tìm nạp hoặc mạng:', error);
                    // Có thể trả về fallback page ở đây nếu muốn
                    // return caches.match('/offline-page.html');
                });
            })
    );
});
