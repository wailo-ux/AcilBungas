import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useMqttStore } from '../store/useMqttStore';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  const loginUser = useMqttStore((state) => state.loginUser);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.status === 'success') {
        loginUser(response.data.data);
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Terjadi kesalahan koneksi ke server.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 px-4">
      {<div className="flex gap-4 mb-6">
        <img src="/logo-top.png" alt="Logo TOP" className="h-12" />
        <img src="/logo-turangga.png" alt="Logo Turangga" className="h-12" />
      </div>}
      
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Login</h2>
      
        
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-6 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              placeholder="Masukkan username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition-colors duration-200">
            Masuk
          </button>
        </form>
        <div className="mt-6 text-center text-sm flex flex-col gap-2">
          <a href="/forgot-password" className="text-blue-600 font-medium hover:underline">Lupa Password?</a>
          <p className="text-gray-600">
            Belum punya akun? <a href="/register" className="text-blue-600 font-bold hover:underline">Daftar sekarang</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;