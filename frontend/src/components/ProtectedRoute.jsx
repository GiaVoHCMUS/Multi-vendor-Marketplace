import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Nếu chưa đăng nhập, đá về trang login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Nếu đã đăng nhập, cho phép truy cập vào các route con
  return <Outlet />;
};

export default ProtectedRoute;
