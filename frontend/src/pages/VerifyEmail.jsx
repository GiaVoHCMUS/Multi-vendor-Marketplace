import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import toast from "react-hot-toast";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading"); // 'loading', 'success', 'error'
  const navigate = useNavigate();
  const token = searchParams.get("token");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        return;
      }
      try {
        // Giả sử API của bạn là GET /auth/verify-email?token=...
        const response = await axiosClient.get(
          `/auth/verify-email?token=${token}`,
        );
        if (response.data.success) {
          setStatus("success");
          toast.success("Xác thực email thành công!");
          // Tự động chuyển hướng về login sau 3 giây
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (error) {
        setStatus("error");
        toast.error(error.response?.data?.message || "Xác thực thất bại");
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full">
        {status === "loading" && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Đang xác thực tài khoản của bạn...
            </p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="text-success text-5xl mb-4">✔</div>
            <h2 className="text-2xl font-bold text-gray-800">Thành công!</h2>
            <p className="text-gray-600 mt-2">
              Email đã được xác thực. Bạn sẽ được chuyển hướng về trang đăng
              nhập.
            </p>
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="text-error text-5xl mb-4">✘</div>
            <h2 className="text-2xl font-bold text-gray-800">Thất bại!</h2>
            <p className="text-gray-600 mt-2">
              Link xác thực không hợp lệ hoặc đã hết hạn.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="mt-4 text-primary font-medium underline"
            >
              Quay lại trang đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
