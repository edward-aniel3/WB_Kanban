import axiosInstance from "../utils/axiosInstance";

export const getEmployees = () => {
  return axiosInstance.get("/employees");
};

export const addEmployee = (data) => {
  return axiosInstance.post("/employees", data);
};

export const toggleEmployeeStatus = (userId) => {
  return axiosInstance.patch(`/employees/${userId}`);
};

export const deleteUser = (userId) => {
  return axiosInstance.delete(`/employees/${userId}`);
};
