import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ProtectedRoute from "./components/ProtectedRoute";

// Component tạm thời cho Dashboard (sau này bạn sẽ tách file sau)
const Dashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Chào mừng bạn đến với trang Quản trị</h1>
    <p className="text-gray-600">
      Dự án Multivendor Marketplace đang hình thành...
    </p>
  </div>
);

function App() {
  return (
    <Router>
      {/* Thông báo toast hiển thị ở góc màn hình */}
      <Toaster position="top-right" reverseOrder={false} />

      <Routes>
        {/* Public Routes: Ai cũng vào được */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Private Routes: Chỉ dành cho người đã đăng nhập */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<div>Trang cá nhân</div>} />
        </Route>

        {/* Redirect nếu vào link không tồn tại */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
