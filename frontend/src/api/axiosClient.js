import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Bạn có thể thêm interceptor để tự động gắn token vào header sau này
export default axiosClient;
