import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// 1. Đọc danh sách 300 product slugs từ file JSON vừa tạo
// Dùng SharedArray để tối ưu RAM cho k6, chỉ đọc file 1 lần duy nhất cho tất cả VUs
const productSlugs = new SharedArray('Product Slugs', function () {
  return JSON.parse(open('./product_ids.json'));
});

// 1. Đọc danh sách category slugs từ file JSON vừa tạo
const categorySlugs = new SharedArray('Category Slugs', function () {
  return JSON.parse(open('./category_slugs.json'));
});

// Cấu hình URL Backend
const BASE_URL = 'http://localhost:3000/api';

export const options = {
  scenarios: {
    // Luồng 1. Lướt danh sách sản phẩm (Chiểm khoảng 60% traffic)
    // Nhóm này sẽ tạo ra các query có filter, thử thách tốc độ của Index trong PostgreSQl
    browse_product_list: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 150 }, // Bơm dần lên 150 VUs
        { duration: '1m', target: 150 }, // Giữ nguyên tải để đo lường
        { duration: '30s', target: 0 }, // Hạ nhiệt
      ],
      exec: 'getListWithFilters',
    },

    // Luồng 2. Xem chi tiết sản phẩm (Chiếm khoảng 40% traffic)
    // Nhóm này sẽ bắn thẳng vào 300 slugs nóng, đây là nơi Redis đạt Cache Hit lớn
    view_product_detail: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 }, // Bơm dần lên 100 VUs
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      exec: 'getDetailBySlug',
    },
  },
  thresholds: {
    // Đặt tiêu chuẩn để k6 in ra console cho đẹp, không bắt buộc pass
    'http_req_duration{scenario:view_product_detail}': ['p(95)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

// --- CÁC HÀM THỰC THI ---
export function getListWithFilters() {
  // 1. Giả lập Sort (Map chuẩn với ALLOWED_SORT của Zod)
  // Thêm chuỗi rỗng '' để mô phỏng user không chọn sort
  const sortOptions = ['price:desc', 'price:asc', ''];
  const sort = sortOptions[Math.floor(Math.random() * sortOptions.length)];

  // 2. Giả lập Filter theo giá (Phải pass rule minPrice <= maxPrice của Zod)
  const minPrice = Math.floor(Math.random() * 10) * 50000;
  // maxPrice sẽ bằng minPrice cộng thêm một khoảng từ 100k đến 1 triệu
  const maxPrice = minPrice + Math.floor(Math.random() * 10 + 1) * 100000;

  // 3. Giả lập Search Keyword (Map với rule max 100 chars của Zod)
  // Sử dụng các từ khóa có thể có trong data "Hot Deal" bạn đã seed
  const searchKeywords = ['hot', 'deal', 'sale', 'mới', ''];
  const search = searchKeywords[Math.floor(Math.random() * searchKeywords.length)];

  // 4. Build Query String động
  // Luôn có limit (ví dụ 20)
  let queryParams = `limit=20`;

  if (sort) queryParams += `&sort=${sort}`;

  // Tỷ lệ 50% user sẽ xài bộ lọc giá
  if (Math.random() > 0.5) {
    queryParams += `&minPrice=${minPrice}&maxPrice=${maxPrice}`;
  }

  // Tỷ lệ 30% user sẽ gõ ô tìm kiếm
  if (Math.random() > 0.7 && search) {
    queryParams += `&search=${encodeURIComponent(search)}`;
  }

  // Tỷ lệ 60% user sẽ click vào một Category cụ thể để xem hàng
  if (Math.random() > 0.4) {
    const randomCategory = categorySlugs[Math.floor(Math.random() * categorySlugs.length)];
    queryParams += `&categorySlug=${randomCategory}`;
  }

  // 5. Bắn API
  const url = `${BASE_URL}/products?${queryParams}`;
  const res = http.get(url);

  // 6. Kiểm tra kết quả
  check(res, {
    'List API - status 200': (r) => r.status === 200,
    // (Tuỳ chọn) Bắt lỗi 400 nếu lỡ kịch bản k6 sinh ra param bị Zod chửi
    'List API - no validation error': (r) => r.status !== 400,
  });

  // Tốc độ lướt web của user: nghỉ 1-3 giây trước khi thao tác tiếp
  sleep(Math.random() * 2 + 1);
}

export function getDetailBySlug() {
  // Lấy ngẫu nhiên 1 slug trong tập 300 slugs Hot Data
  const randomSlug = productSlugs[Math.floor(Math.random() * productSlugs.length)];

  // Gọi API detail (Đảm bảo endpoint này trùng khớp với router backend của bạn)
  const res = http.get(`${BASE_URL}/products/${randomSlug}`);

  check(res, {
    'Detail API - status 200': (r) => r.status === 200,
  });

  // Người dùng dừng lại đọc mô tả sản phẩm, xem ảnh
  sleep(Math.random() * 2 + 1);
}