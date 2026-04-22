import http from 'k6/http';
import { sleep, check } from 'k6';
import { SharedArray } from 'k6/data';

// 1. Load danh sách ID từ file JSON (SharedArray giúp tiết kiệm RAM cho k6)
const productSlugs = new SharedArray('product ids', function () {
  return JSON.parse(open('./product_ids.json'));
});

// 1. Cấu hình kịch bản (Options)
export const options = {
  stages: [
    { duration: '30s', target: 2000 }, // Tăng dần từ 0 lên 50 users trong 30s
    { duration: '1m', target: 5000 }, // Duy trì 50 users trong 1 phút
    { duration: '30s', target: 0 }, // Giảm dần về 0 (hạ nhiệt)
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% request phải dưới 200ms (Nếu không sẽ báo Fail)
    http_req_failed: ['rate<0.01'], // Tỉ lệ lỗi phải dưới 1%
  },
};

// 2. Kịch bản mô phỏng User (Default function)
export default function () {
  const randomSlug = productSlugs[Math.floor(Math.random() * productSlugs.length)];
  // Thay URL bằng endpoint thật của bạn
  const url = `http://localhost:3000/api/products/${randomSlug}`;

  const res = http.get(url);

  // Kiểm tra xem có đúng là trả về 200 không
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has data': (r) => r.json().data !== undefined,
  });

  // Nghỉ 1 giây giữa mỗi lần request để giống người thật (không phải bot spam)
  sleep(0.5);
}
