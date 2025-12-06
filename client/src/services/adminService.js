import axios from 'axios';
import authHeader from './auth-header';

const API_URL = '/api/admin';

const getUsers = () => {
  return axios.get(`${API_URL}/users`, { headers: authHeader() });
};

const deleteUser = (id) => {
  return axios.delete(`${API_URL}/users/${id}`, { headers: authHeader() });
};

const adminService = {
  getUsers,
  deleteUser,
};

export default adminService;
