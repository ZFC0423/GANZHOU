import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

const request = axios.create({
  baseURL: apiBase,
  timeout: 10000
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

export default request;
