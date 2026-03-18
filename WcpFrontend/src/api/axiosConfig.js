import axios from 'axios';

// PERHATIAN: Cek terminal ASP.NET Anda, port berapa yang digunakan (biasanya 5000, 5001, atau 7xxx)
// Ganti angka 5000 di bawah sesuai dengan port backend ASP.NET Anda.
const api = axios.create({
  baseURL: 'http://topssqco401:5500', 
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;