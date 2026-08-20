import axiosInstance from "../utils/axiosInstance";

export const login = (email, password) => {
  return axiosInstance.post("/auth/login", { email, password });
};

export const logout = () => {
  return axiosInstance.post("/auth/logout");
};

export const getMe = () => {
  return axiosInstance.get("/auth/me");
};
