export const MESSAGE = {
  ADMIN: {
    APPROVE_SHOP_SUCCESS: 'Duyệt cửa hàng thành công',
    BAN_SHOP_SUCCESS: 'Khóa cửa hàng thành công',
    BAN_USER_SUCCESS: 'Khóa người dùng thành công',
    GET_STATS_SUCCESS: 'Lấy thống kê hệ thống thành công',
    GET_PENDING_SHOPS_SUCCESS: 'Lấy danh sách cửa hàng chờ duyệt thành công',
    GET_USERS_SUCCESS: 'Lấy danh sách người dùng thành công',
    GET_ORDERS_SUCCESS: 'Lấy danh sách đơn hàng thành công',
    SHOP_NOT_FOUND: 'Cửa hàng không tồn tại',
    SHOP_ALREADY_APPROVED: 'Cửa hàng đã được duyệt',
    USER_NOT_FOUND: 'Người dùng không tồn tại',
  },

  AUTH: {
    REGISTER_SUCCESS: 'Đăng ký tài khoản thành công',
    LOGIN_SUCCESS: 'Đăng nhập thành công',
    LOGOUT_SUCCESS: 'Đăng xuất thành công',
    REFRESH_TOKEN_SUCCESS: 'Lấy token mới thành công',
    EMAIL_ALREADY_EXISTS: 'Email đã tồn tại',
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác',
    REFRESH_TOKEN_NOT_FOUND: 'Refresh token không tồn tại',
    SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn',
    SESSION_INVALID: 'Phiên đăng nhập không hợp lệ',
    SECURITY_BREACH: 'Cảnh báo bảo mật, vui lòng đăng nhập lại',
    FORGOT_PASSWORD_SUCCESS:
      'Yêu cầu đặt lại mật khẩu thành công. Chúng tôi đã gửi xác thực đến email của bạn',
    RESET_PASSWORD_SUCCESS: 'Đặt lại mật khẩu thành công',
    CHANGE_PASSWORD_SUCCESS: 'Thay đổi mật khẩu thành công',
    NOT_FOUND_EMAIL: 'Email không tồn tại',
    INVALID_OR_EXPIRED_TOKEN: 'Token không đúng hoặc đã hết hạn',
    VERIFY_EMAIL_SUCCESS:
      'Xác thực email thành công. Bạn có thể đăng nhập ngay bây giờ',
  },

  SHOP: {
    NOT_FOUND: 'Cửa hàng không tồn tại',
    NOT_ACTIVE: 'Cửa hàng chưa được duyệt hoặc đã bị khóa',
    ALREADY_REGISTERED: 'Bạn đã đăng ký cửa hàng rồi',
    REGISTER_SUCCESS: 'Đăng ký cửa hàng thành công',
    GET_MY_SHOP_SUCCESS: 'Lấy thông tin cửa hàng thành công',
    UPDATE_MY_SHOP_SUCCESS: 'Cập nhật thông tin cửa hàng thành công',
    GET_ORDERS_SUCCESS: 'Lấy danh sách đơn hàng thành công',
    UPDATE_ORDER_STATUS_SUCCESS: 'Cập nhật trạng thái đơn hàng thành công',
    GET_ANALYTICS_SUCCESS: 'Lấy phân tích cửa hàng thành công',
    ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng',
    ORDER_ALREADY_DELIVERED: 'Đơn hàng đã hoàn tất',
  },

  USER: {
    GET_PROFILE_SUCCESS: 'Lấy thông tin người dùng thành công',
    UPDATE_PROFILE_SUCCESS: 'Cập nhật thông tin người dùng thành công',
    GET_ADDRESS_LIST_SUCCESS: 'Lấy danh sách địa chỉ thành công',
    ADD_ADDRESS_SUCCESS: 'Thêm địa chỉ thành công',
    UPDATE_ADDRESS_SUCCESS: 'Cập nhật địa chỉ thành công',
    DELETE_ADDRESS_SUCCESS: 'Xóa địa chỉ thành công',
    ADDRESS_NOT_FOUND: 'Địa chỉ không tồn tại',
    NOT_FOUND: 'Người dùng không tồn tại',
  },

  CATEGORY: {
    NOT_FOUND: 'Danh mục không tồn tại',
    PARENT_NOT_FOUND: 'Danh mục cha không tồn tại',
    HAS_CHILDREN: 'Không thể xóa danh mục có danh mục con',
    CREATED_SUCCESS: 'Tạo danh mục thành công',
    UPDATED_SUCCESS: 'Cập nhật danh mục thành công',
    DELETED_SUCCESS: 'Xóa danh mục thành công',
    GET_LIST_SUCCESS: 'Lấy danh sách danh mục thành công',
    GET_DETAIL_SUCCESS: 'Lấy chi tiết danh mục thành công',
  },

  PRODUCT: {
    NOT_FOUND: 'Sản phẩm không tồn tại',
    CREATED_SUCCESS: 'Tạo sản phẩm thành công',
    UPDATED_SUCCESS: 'Cập nhật sản phẩm thành công',
    DELETED_SUCCESS: 'Xóa sản phẩm thành công',
    GET_LIST_SUCCESS: 'Lấy danh sách sản phẩm thành công',
    GET_DETAIL_SUCCESS: 'Lấy chi tiết sản phẩm thành công',
  },

  CART: {
    GET_DETAIL_SUCCESS: 'Lấy giỏ hàng thành công',
    ADD_PRODUCT_SUCCESS: 'Thêm sản phẩm vào giỏ hàng thành công',
    UPDATE_SUCCESS: 'Cập nhật giỏ hàng thành công',
    REMOVE_PRODUCT_SUCCESS: 'Xóa sản phẩm khỏi giỏ hàng thành công',
    CLEAR_SUCCESS: 'Xóa toàn bộ giỏ hàng thành công',
    PRODUCT_NOT_FOUND: 'Sản phẩm không tồn tại',
    PRODUCT_NOT_IN_CART: 'Sản phẩm không có trong giỏ hàng',
    QUANTITY_EXCEEDS_STOCK: 'Số lượng sản phẩm vượt quá tồn kho',
  },

  ORDER: {
    CHECKOUT_SUCCESS: 'Thanh toán thành công',
    GET_LIST_SUCCESS: 'Lấy danh sách đơn hàng thành công',
    GET_DETAIL_SUCCESS: 'Lấy chi tiết đơn hàng thành công',
    UPDATE_STATUS_SUCCESS: 'Cập nhật trạng thái đơn hàng thành công',
    EMPTY_CART: 'Giỏ hàng rỗng',
    INVALID_PRODUCTS: 'Một số sản phẩm không hợp lệ',
    INSUFFICIENT_STOCK: 'Sản phẩm không đủ tồn kho',
    NOT_FOUND: 'Đơn hàng không tồn tại',
    FORBIDDEN_UPDATE_STATUS:
      'Bạn không có quyền thay đổi trạng thái đơn hàng này',
  },

  IMAGE: {
    INVALID_TYPE: 'Chỉ chấp nhận file ảnh (jpg, png, gif, webp)',
    TOO_LARGE: 'File ảnh vượt quá kích thước cho phép',
  },

  COMMON: {
    INTERNAL_ERROR: 'Đã xảy ra lỗi hệ thống',
    UNAUTHORIZED: 'Bạn chưa đăng nhập',
    FORBIDDEN: 'Bạn không có quyền thực hiện hành động này',
  },
};
