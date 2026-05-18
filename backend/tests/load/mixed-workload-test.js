import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { vu } from 'k6/execution';

// TEST DATA
const productSlugs = new SharedArray('Product Slugs', function () {
  return JSON.parse(open('./product_slugs.json'));
});

const categorySlugs = new SharedArray('Category Slugs', function () {
  return JSON.parse(open('./category_slugs.json'));
});

// User token để test cart/checkout
const userTokens = new SharedArray('User Tokens', function () {
  return JSON.parse(open('./user_tokens.json'));
});

// Seller token để test update product
const sellerTokens = new SharedArray('Seller Tokens', function () {
  return JSON.parse(open('./seller_tokens.json'));
});

// Product IDs cho seller update
const productIds = new SharedArray('Product IDs', function () {
  return JSON.parse(open('./product_ids.json'));
});

const BASE_URL = 'http://localhost:3000/api';

export const options = {
  scenarios: {
    // 40% - Browse Product List
    browse_products: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 40 }, // Tăng từ từ lên 40
        { duration: '1m', target: 40 }, // Giữ nguyên trong 1 phút
        { duration: '30s', target: 0 }, // Hạ nhiệt về 0
      ],
      exec: 'browseProducts',
    },

    // 30% - View Product Detail
    view_product_detail: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '1m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      exec: 'viewProductDetail',
    },

    // 30% - Shopping Flow
    shopping_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 15 },
        { duration: '1m', target: 15 },
        { duration: '30s', target: 0 },
      ],
      exec: 'shoppingFlow',
    },

    // 5% - Seller Update Product
    seller_update_product: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '1m', target: 3 },
        { duration: '30s', target: 0 },
      ],
      exec: 'sellerUpdateProduct',
    },

    // 5% - Search / Filter
    search_products: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
      ],
      exec: 'searchProducts',
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
    'http_req_duration{scenario:checkout_flow}': ['p(95)<2000'],
    'http_req_duration{scenario:view_product_detail}': ['p(95)<150'],
  },
};

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomUserToken() {
  return randomItem(userTokens);
}

function randomSellerToken() {
  return randomItem(sellerTokens);
}

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

// 1. BROWSE PRODUCTS (READ)
export function browseProducts() {
  const sortOptions = ['price:desc', 'price:asc', ''];
  const sort = randomItem(sortOptions);

  let queryParams = `limit=20`;

  if (sort) {
    queryParams += `&sort=${sort}`;
  }

  if (Math.random() > 0.4) {
    const category = randomItem(categorySlugs);
    queryParams += `&categorySlug=${category}`;
  }

  const url = `${BASE_URL}/products?${queryParams}`;

  const res = http.get(url);

  check(res, {
    'Browse Products - status 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 2 + 1);
}

// 2. VIEW PRODUCT DETAIL (READ HOT CACHE)
export function viewProductDetail() {
  const slug = randomItem(productSlugs);
  const res = http.get(`${BASE_URL}/products/${slug}`);

  check(res, {
    'View Detail - status 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 2 + 1);
}

export function shoppingFlow() {
  const token = userTokens[(vu.idInTest - 1) % userTokens.length];
  const productId = randomItem(productIds);

  const cartPayload = JSON.stringify({
    productId,
    quantity: Math.floor(Math.random() * 2) + 1, // Mua ngẫu nhiên 1-2 món
  });
  const cartRes = http.post(`${BASE_URL}/cart`, cartPayload, authHeaders(token));

  check(cartRes, {
    'Cart - Add success': (r) => r.status === 200 || r.status === 201,
  });

  // Nếu thêm giỏ hàng thất bại (ví dụ: hết hàng), user thoát luôn
  if (cartRes.status !== 200 && cartRes.status !== 201) return;

  // Tỷ lệ 70% người dùng chỉ bỏ vào giỏ rồi ngắm (Thoát)
  if (Math.random() > 0.3) {
    return;
  }

  // 30% người dùng còn lại vào thanh toán
  sleep(Math.random() * 2 + 1);

  const orderPayload = JSON.stringify({
    paymentMethod: 'MOCK_PAYMENT',
    shippingName: 'Gia Võ',
    shippingAddress: '15 Võ Văn Kiệt',
    shippingPhone: '0847090205',
  });

  const orderRes = http.post(`${BASE_URL}/orders`, orderPayload, authHeaders(token));

  // Cảm biến bắt lỗi: In ra log nếu Backend từ chối đơn hàng
  if (orderRes.status === 500) {
    console.log(`\n[ORDER ERROR] Status: ${orderRes.status} | Body: ${orderRes.body}`);
  }

  check(orderRes, {
    'Checkout - success': (r) => r.status === 200 || r.status === 201,
  });

  // User đặt hàng xong, nán lại trang Thank You vài giây
  sleep(Math.random() * 3 + 2);
}

// // 3. ADD TO CART (REDIS WRITE)
// export function addToCart() {
//   const token = randomUserToken();

//   const productId = randomItem(productIds);

//   const payload = JSON.stringify({
//     productId,
//     quantity: Math.floor(Math.random() * 3) + 1,
//   });

//   const res = http.post(`${BASE_URL}/cart`, payload, authHeaders(token));

//   check(res, {
//     'Add To Cart - status 200/201': (r) => r.status === 200 || r.status === 201,
//   });

//   sleep(Math.random() * 2 + 1);
// }

// // 4. CHECKOUT FLOW (TRANSACTION)
// export function checkoutFlow() {
//   const token = randomUserToken();
//   const productId = randomItem(productIds);

//   // Bước 1: Add to cart
//   const cartPayload = JSON.stringify({ productId, quantity: 1 });
//   const cartRes = http.post(`${BASE_URL}/cart`, cartPayload, authHeaders(token));

//   check(cartRes, {
//     'Add To Cart - success': (r) => r.status === 201,
//   });
//   // Nếu Add to cart thất bại (ví dụ hết hàng), ngừng luôn luồng này
//   if (cartRes.status !== 201) return;

//   const payload = JSON.stringify({
//     paymentMethod: 'MOCK_PAYMENT',
//     shippingName: 'Gia Võ',
//     shippingAddress: '15 Võ Văn kiệt',
//     shippingPhone: '0847090205',
//   });

//   const res = http.post(`${BASE_URL}/order`, payload, authHeaders(token));

//   // ---> CẢM BIẾN BẮT BUG NẰM Ở ĐÂY <---
//   if (res.status !== 200 && res.status !== 201) {
//     console.log(`\n[LỖI ORDER] Status: ${res.status} | Body: ${res.body}`);
//   }

//   check(res, {
//     'Checkout - success': (r) => r.status === 201,
//   });
//   sleep(Math.random() * 5 + 2);
// }

// 5. SELLER UPDATE PRODUCT
// (WRITE + CACHE INVALIDATION)
export function sellerUpdateProduct() {
  const token = randomSellerToken();

  const productId = randomItem(productIds);

  const randomPrice = Math.floor(Math.random() * 1000) * 1000 + 50000;

  const payload = JSON.stringify({
    price: randomPrice,
    stock: Math.floor(Math.random() * 100),
  });

  const res = http.patch(`${BASE_URL}/products/${productId}`, payload, authHeaders(token));

  check(res, {
    'Seller Update Product - success': (r) => r.status === 200,
  });

  sleep(Math.random() * 5 + 3);
}

// 6. SEARCH PRODUCTS
export function searchProducts() {
  const keywords = ['iphone', 'gaming', 'laptop', 'hot', 'sale', 'keyboard'];
  const keyword = randomItem(keywords);

  const url = `${BASE_URL}/products?search=${encodeURIComponent(keyword)}&limit=20`;
  const res = http.get(url);

  check(res, {
    'Search Products - status 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 2 + 1);
}
