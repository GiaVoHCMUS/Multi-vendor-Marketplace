import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import axiosClient from "../api/axiosClient";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axiosClient.post("/auth/register", formData);
      const { success, message } = response.data;

      if (success) {
        toast.success(
          message || "Đăng ký thành công! Vui lòng kiểm tra email.",
          {
            duration: 6000, // Để lâu một chút cho user kịp đọc
            style: { border: "1px solid #10B981", color: "#10B981" },
          },
        );
        // Đăng ký xong thường sẽ về trang Login để đợi verify
        navigate("/login");
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Đăng ký thất bại";
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
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Tạo tài khoản mới
        </h2>

        <form className="mt-8 space-y-4" onSubmit={handleRegister}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Họ và tên
            </label>
            <input
              name="fullName"
              type="text"
              required
              className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Võ Quốc Gia"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="quocgia@gmail.com"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              name="password"
              type="password"
              required
              className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="********"
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-indigo-700 transition-all ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-primary font-bold">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
