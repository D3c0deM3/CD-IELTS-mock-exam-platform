import axios from 'axios';
import authHeader from './auth-header';

const API_URL = '/api/tests';

const getAllTests = () => {
  return axios.get(API_URL, { headers: authHeader() });
};

const getTest = (id) => {
  return axios.get(`${API_URL}/${id}`, { headers: authHeader() });
};

const submitTest = (id, answers) => {
  return axios.post(`${API_URL}/${id}/submit`, { answers }, { headers: authHeader() });
};

const testService = {
  getAllTests,
  getTest,
  submitTest,
};

export default testService;
