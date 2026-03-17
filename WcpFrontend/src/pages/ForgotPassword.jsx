import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tahap 1: Ambil pertanyaan keamanan
  const handleCheckUsername = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await api.post('/auth/forgot-password/question', { username });
      if (response.data.status === 'success') {
        setQuestion(response.data.question);
        setStep(2);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Username tidak ditemukan.');
    }
  };

  // Tahap 2: Jawab pertanyaan dan reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await api.post('/auth/forgot-password/reset', { username, answer, newPassword });
      if (response.data.status === 'success') {
        setSuccessMsg(response.data.message);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Jawaban salah atau terjadi kesalahan.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Pemulihan Sandi</h2>
        <p className="text-sm text-center text-gray-500 mb-6 font-medium">Jawab pertanyaan keamanan Anda</p>
        
        {errorMsg && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm mb-4 text-center border border-red-200">{errorMsg}</div>}
        {successMsg && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm mb-4 text-center border border-green-200">{successMsg}</div>}

        {step === 1 ? (
          <form onSubmit={handleCheckUsername} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan username Anda" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition-colors">Cari Akun</button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Pertanyaan Keamanan Anda:</p>
              <p className="text-sm font-semibold text-slate-800">{question}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Jawaban Anda</label>
              <input type="text" required value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan jawaban..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password Baru</label>
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buat password baru" />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition-colors">Reset Password</button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="text-blue-600 font-bold hover:underline">Kembali ke Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;