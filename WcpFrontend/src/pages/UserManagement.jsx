import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Proteksi Lapis 2: Tendang jika bukan SPV
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role !== 'spv') {
        alert('Akses Ditolak! Anda bukan Supervisor.');
        navigate('/dashboard');
      } else {
        fetchUsers();
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Gagal mengambil data user", error);
    } finally {
      setIsLoading(false);
    }
  };

  const approveUser = async (id) => {
    if (window.confirm('Setujui akun ini untuk mengakses sistem?')) {
      try {
        await api.post('/users/approve', { id });
        fetchUsers();
      } catch (error) {
        alert('Gagal menyetujui akun.');
      }
    }
  };

  const deleteUser = async (id) => {
    if (window.confirm('Yakin ingin menghapus akun ini secara permanen?')) {
      try {
        await api.post('/users/delete', { id });
        fetchUsers();
      } catch (error) {
        alert('Gagal menghapus akun.');
      }
    }
  };

  const resetPassword = async (id, name) => {
    if (window.confirm(`Reset password untuk ${name} menjadi default?`)) {
      try {
        const res = await api.post('/users/reset', { id });
        if (res.data.status === 'success') {
          alert(`Password berhasil direset!\n\nPassword baru untuk ${name} adalah: ${res.data.message}`);
          fetchUsers();
        }
      } catch (error) {
        alert('Gagal mereset password.');
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <h1 className="font-bold text-3xl text-gray-800">Manajemen Akun Crew</h1>
        <button onClick={fetchUsers} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-slate-500">refresh</span>
        </button>
      </div>

      {/* Main Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-full">
        <p className="text-sm text-slate-500 mb-6">Kelola persetujuan akses dan reset sandi untuk akun Crew Lapangan.</p>
        
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <th className="p-4 border-b">Nama Lengkap</th>
                <th className="p-4 border-b">Username</th>
                <th className="p-4 border-b">Status Akses</th>
                <th className="p-4 border-b text-right">Tindakan (Action)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">Memuat data...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">Belum ada akun Crew yang terdaftar.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{user.fullName || user.full_name}</td>
                    <td className="p-4 text-slate-500">@{user.username}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {user.status === 'active' ? 'AKTIF' : 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      {user.status === 'pending' && (
                        <button onClick={() => approveUser(user.id)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">
                          TERIMA (ACC)
                        </button>
                      )}
                      
                      <button onClick={() => resetPassword(user.id, (user.fullName || user.full_name))} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors">
                        RESET SANDI
                      </button>
                      <button onClick={() => deleteUser(user.id)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg text-xs font-bold transition-colors">
                        HAPUS
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;