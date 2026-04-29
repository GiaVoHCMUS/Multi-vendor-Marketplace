import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axiosClient from "../api/axiosClient";
import { loginSuccess } from "../store/slices/authSlice";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axiosClient.post("/auth/login", {
        email,
        password,
      });
      const { success, message, data } = response.data;

      if (success) {
        toast.success(message || "Đăng nhập thành công", {
          style: { border: "1px solid #10B981", color: "#10B981" },
        });

        // Lưu vào Redux
        dispatch(loginSuccess(data));

        // Điều hướng sau khi login (ví dụ về trang chủ)
        navigate("/");
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Đã có lỗi xảy ra";
      toast.error(errorMsg, {
        style: { border: "1px solid #EF4444", color: "#EF4444" },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Chào mừng trở lại!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Đăng nhập để quản lý cửa hàng của bạn
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="quocgia@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
