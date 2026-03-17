import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', username: '', password: '', securityQuestion: '', securityAnswer: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg(''); setIsLoading(true);

    try {
      const response = await api.post('/auth/register', formData);
      if (response.data.status === 'success') {
        setSuccessMsg(response.data.message);
        setTimeout(() => navigate('/login'), 3000); // Pindah ke login setelah 3 detik
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Terjadi kesalahan saat mendaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Daftar Akun Crew</h2>
        <p className="text-sm text-center text-gray-500 mb-6 font-medium">Sistem Monitoring WCP 4</p>
        
        {errorMsg && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm mb-4 text-center border border-red-200">{errorMsg}</div>}
        {successMsg && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm mb-4 text-center border border-green-200">{successMsg}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap</label>
            <input type="text" name="fullName" required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan nama lengkap" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
            <input type="text" name="username" required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buat username tanpa spasi" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input type="password" name="password" required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buat password" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Pertanyaan Keamanan (Pilih/Buat)</label>
            <input type="text" name="securityQuestion" required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Nama hewan peliharaan pertama?" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Jawaban Keamanan</label>
            <input type="text" name="securityAnswer" required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Jawaban (Ingat baik-baik!)" />
          </div>
          
          <button type="submit" disabled={isLoading} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition-colors disabled:opacity-50">
            {isLoading ? 'Mendaftar...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Sudah punya akun? <Link to="/login" className="text-blue-600 font-bold hover:underline">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;