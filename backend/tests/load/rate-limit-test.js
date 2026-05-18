import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3000/api';

export const options = {
  scenarios: {
    // Luồng 1: Giả lập cuộc tấn công DDoS nhỏ hoặc hành vi "cào" dữ liệu
    // Mục tiêu: Bắn thủng giới hạn 200 req/phút của publicLimiter cực nhanh
    spam_public_api: {
      executor: 'constant-vus',
      vus: 10, // Khởi tạo 10 VUs (người dùng ảo)
      duration: '15s', // Bắn liên tục trong 15 giây
      exec: 'spamPublicApi',
    },
  },
  thresholds: {
    // ĐẶC BIỆT: Ở bài test này, ta KỲ VỌNG hệ thống phải trả về lỗi (429)
    // Nếu tỷ lệ lỗi (bị block) lớn hơn 50% -> Khiên hoạt động tốt -> Bài test Pass!
    http_req_failed: ['rate>0.5'],
  },
};

// --- CÁC HÀM THỰC THI ---
export function spamPublicApi() {
  // 1. Bắn thẳng vào một API public bất kỳ (ví dụ: lấy danh sách sản phẩm)
  // Không cần query string phức tạp vì ta chỉ test cái "cổng bảo vệ" ngoài cùng
  const url = `${BASE_URL}/products`;
  const res = http.get(url);

  // 2. Kiểm tra và phân loại kết quả trả về
  check(res, {
    'Status 200 (Passed Limiter)': (r) => r.status === 200,
    'Status 429 (Rate Limited)': (r) => r.status === 429,
    // (Tuỳ chọn) Bắt các lỗi sập server (500) nếu rate limiter làm sập Redis
    'Status 500 (Internal Server Error)': (r) => r.status === 500,
  });

  // 3. Tốc độ spam của Hacker/Tool:
  // Nghỉ cực kỳ ngắn (10 mili-giây) để mỗi VU dội cả trăm request mỗi giây
  sleep(0.01);
}