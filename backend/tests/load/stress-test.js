import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // Kịch bản bóp nghẹt hệ thống từ từ rồi giáng một đòn đột biến
  stages: [
    { duration: '30s', target: 200 }, // Khởi động: Lên 200 VUs (Mức mà bạn đã biết là hệ thống chạy mượt)
    { duration: '30s', target: 200 }, // Giữ nguyên 200 VUs để làm bước đệm (Baseline)
    { duration: '1m', target: 600 }, // Ép xung: Tăng vọt lên 600 VUs trong 1 phút
    { duration: '1m', target: 600 }, // Duy trì 600 VUs xem RAM/CPU có bị tràn hay cạn Connection Pool không
    { duration: '30s', target: 1200 }, // ĐỘT BIẾN (Spike): Vọt thẳng lên 1200 VUs! Thường các hệ thống demo sẽ sập ở đây.
    { duration: '30s', target: 0 }, // Rút quân hạ nhiệt để xem hệ thống có tự phục hồi (recover) lại được không.
  ],
  thresholds: {
    // Khi stress test, chúng ta nới lỏng tiêu chuẩn một chút
    http_req_duration: ['p(95)<500'], // 95% request phải dưới 500ms (Nửa giây)
    http_req_failed: ['rate<0.05'], // Tỷ lệ lỗi không được vượt quá 5%
  },
};

// Đổi lại cho đúng với cấu hình cổng API của bạn (ví dụ 3000 hoặc 8000)
const BASE_URL = 'http://localhost:8000/api/v1';

export default function () {
  // Giả lập user liên tục F5 trang danh sách sản phẩm (Read-heavy)
  const res = http.get(`${BASE_URL}/products?page=1&limit=20`);

  // Kiểm tra tính toàn vẹn của kết quả
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has data': (r) => r.json('data') !== undefined, // Đảm bảo server không trả về object rỗng
  });

  // TỐI QUAN TRỌNG: Mô phỏng thời gian user đọc web (Think Time)
  // Nếu bạn bỏ sleep(1), 1000 VUs của k6 sẽ biến thành một cuộc tấn công DDoS đánh sập server ngay lập tức.
  sleep(1);
}
