import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = 'http://localhost:3000/api';

const tokens = new SharedArray('Checkout Users', function () {
  return JSON.parse(open('./checkout-users.json'));
});

export const options = {
  scenarios: {
    overselling_test: {
      executor: 'per-vu-iterations',
      vus: 100, // 100 user checkout cùng lúc
      iterations: 1,
      maxDuration: '10s',
      exec: 'checkoutProduct',
    },
  },

  thresholds: {
    // Không được có server error
    checks: ['rate>0.99'],
    http_req_duration: ['p(95)<2000'],
  },
};

export function checkoutProduct() {
  // 1. Rút token cho từng VU để đảm bảo 100 ông là 100 người khác nhau
  // Biến __VU của k6 bắt đầu từ 1 đến số max VUs
  const tokenIndex = (__VU - 1) % tokens.length;
  const token = tokens[tokenIndex];

  // 2. Setup Request
  const url = `${BASE_URL}/orders`;
  const payload = JSON.stringify({
    paymentMethod: 'MOCK_PAYMENT',
    shippingName: 'Gia Võ',
    shippingAddress: '15 Võ Văn Kiệt',
    shippingPhone: '0847090205',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  // 3. 100 ông cùng bấm "Đặt hàng"
  const res = http.post(url, payload, params);

  // 4. Phân tích kết quả
  check(res, {
    'Valid response status': (r) =>
      r.status === 201 || r.status === 409 || r.status === 400 || r.status === 404,
    'No Internal Server Error': (r) => r.status !== 500,
  });
}
