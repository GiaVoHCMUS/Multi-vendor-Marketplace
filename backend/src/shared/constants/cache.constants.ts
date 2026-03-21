// Cấu hình chung
const PREFIX = 'marketplace';

// Setup thời gian
export const CACHE_TTL = {
  TINY: 60, // 1 phút
  SHORT: 300, // 5 phút
  MEDIUM: 3600, // 1 giờ
  LONG: 86400, // 1 ngày
  WEEK: 604800, // 1 tuần
};

// Quản lý key và tag
export const CACHE_KEYS = {
  PRODUCT: {
    TRACKER_LIST: `${PREFIX}:products:tracker:list`,
    LIST: (version: string, query: string) =>
      `${PREFIX}:products:v${version}:list:${query}`,
    DETAIL: (id: string | number) => `${PREFIX}:products:detail:id_${id}`,
    SLUG: (slug: string) => `${PREFIX}:products:slug:${slug}`,
  },

  CATEGORY: {
    TRACKER_LIST: `${PREFIX}:categories:tracker:list`,
    LIST: (version: string) => `${PREFIX}:categories:v${version}:list`,
    // Đổi từ slug thành id -> Phục vụ cho việc truy vấn ở Products
    ID_BY_SLUG: (slug: string) => `${PREFIX}:categories:slug:${slug}`,
    SLUG: (slug: string) => `${PREFIX}:categories:slug:${slug}`,
  },

  SHOP: {
    // Đổi từ slug thành id -> Phục vụ cho việc truy vấn ở Products
    ID_BY_SLUG: (slug: string) => `${PREFIX}:shops:slug:${slug}`,
    DETAIL: (id: string | number) => `${PREFIX}:shops:detail:id_${id}`,
    ANALYTICS: (id: string | number) => `${PREFIX}:shops:analytics:id_${id}`,
  },

  USER: {
    PROFILE: (id: string | number) => `${PREFIX}:users:profile:id_${id}`,
    ADDRESS_LIST: (userId: string | number) =>
      `${PREFIX}:users:addresses:uid_${userId}`,
  },

  ORDER: {
    DETAIL: (id: string | number) => `${PREFIX}:orders:detail:id_${id}`,
  },

  ADMIN: {
    DASHBOARD: `${PREFIX}:admin:dashboard`,
  },
};

/**
Quy tắc TTL:
1. Độ biến động dữ liệu

  - Dữ liệu tĩnh: Cấu hình hệ thống, danh mục, menu, tỉnh/thành phố ...
    + TTL: LONG/WEEK
    + Chiến lược: Xóa tag khi cập nhật (Hoặc dùng Tracker version)

  - Dữ liệu bán tĩnh: User profile, nội dung bài viết, chi tiết sản phẩm
    + TTL: MEDIUM (1 giờ, vài giờ)
    + Chiến lược: Xóa Tag khi update

  - Dữ liệu biến động cao: Giá sản phẩm, số lượng tồn kho, lượt xem
    + TTL: Tiny/Short
    + Chiến lược: Để tự cập nhật, tránh dùng Tag -> Dễ gây áp lực lên Redis

2. Phân cấp TTL

  2.1 Nếu dùng Tracker Version
    - List key: Nên đặt TTL ngắn (10 - 30 phút)
    - Version Tracker Key: Nên đặt TTL dài hoặc không bao giờ hết hạn
  
  2.2 Nếu dùng Cache Tags
    - List key: TTL ngắn
    - Detail key: TTL dài hơn
    => List key ngắn hơn Detail key

3. Không để cache hết hạn cùng lúc

  const jitter = Math.floor(Math.random() * 3600) --> 0 - 5 phút
*/
