import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useMqttStore } from '../store/useMqttStore'; // Import Zustand

const AppLayout = () => {
  // --- SEMUA HOOKS WAJIB BERADA DI DALAM BLOK INI ---
  const navigate = useNavigate();
  const location = useLocation();
  const logoutUser = useMqttStore((state) => state.logoutUser); // <--- POSISI YANG BENAR
  // ---------------------------------------------------

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({ full_name: 'Guest', role: 'crew' });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUserData(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const logout = () => {
    logoutUser(); // Panggil fungsi dari Zustand untuk menghapus state & localStorage
    navigate('/login'); // Arahkan ke halaman login
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans overflow-x-hidden">
      
      {/* NAVBAR ATAS */}
      <nav className="bg-white text-slate-800 px-4 md:px-6 h-16 shadow-sm border-b border-slate-200 fixed top-0 left-0 right-0 z-[60] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <span className="material-symbols-outlined text-2xl">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 md:p-2 rounded-xl border border-slate-100 shadow-sm">
            <img src="/logo-top.png" alt="TOP" className="h-6 md:h-8 w-auto object-contain" onError={(e) => e.target.src='https://placehold.co/30x30?text=TOP'} />
            <div className="w-px h-5 md:h-6 bg-slate-300 mx-0.5"></div>
            <img src="/logo-turangga.png" alt="Turangga" className="h-6 md:h-8 w-auto object-contain" onError={(e) => e.target.src='https://placehold.co/30x30?text=TR'} />
          </div>
          
          <div className="hidden lg:block ml-2">
            <h1 className="font-bold text-xl tracking-tight text-slate-800">WCP Admin</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex flex-col items-end border-r border-slate-200 pr-4 mr-1 text-right">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider leading-none">
              {userData.role === 'spv' ? 'Supervisor Account' : 'Field Crew Account'}
            </span>
            <span className="text-sm font-semibold text-slate-800">{userData.full_name || userData.fullName}</span>
          </div>
          <button onClick={logout} className="bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 py-2 px-3 md:px-5 rounded-lg transition-all font-bold text-xs flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-base">logout</span>
            <span className="hidden xs:inline">Logout</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 w-full pt-16 relative">
        {/* BACKDROP UNTUK MOBILE */}
        {isSidebarOpen && (
          <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] md:hidden"></div>
        )}

        {/* SIDEBAR KIRI */}
        <aside 
          className={`bg-slate-900 flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] transition-all duration-300 ease-in-out z-50 overflow-y-auto w-72 border-r border-slate-800 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Monitoring Network</h3>
            <nav className="flex flex-col gap-3">
              
              {/* LOOP WCP 1, 2, 3 */}
              {[1, 2, 3].map((n) => (
                <Link key={n} to={`/wcp${n}`} 
                  className={`flex items-center gap-4 p-3.5 rounded-xl transition-all border group shadow-sm ${location.pathname === `/wcp${n}` ? 'bg-blue-600 border-blue-400 text-white' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}
                >
                  <span className="material-symbols-outlined text-xl">construction</span>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-white/90">WCP {n} Site</span>
                    <span className="text-[10px] font-medium text-amber-500/70">Coming Soon</span>
                  </div>
                </Link>
              ))}

              {/* WCP 4 (Dashboard Aktif) */}
              <Link to="/dashboard" 
                className={`flex items-center gap-4 p-3.5 rounded-xl transition-all border group shadow-sm mt-2 ${location.pathname === '/dashboard' ? 'bg-blue-600 border-blue-400 text-white' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}
              >
                <span className="material-symbols-outlined text-xl">monitoring</span>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-white/90">WCP 4 Site</span>
                  <span className="text-[10px] font-medium text-green-400">Active Site</span>
                </div>
              </Link>
            </nav>

            {/* ADMIN PANEL (Hanya untuk SPV) */}
            {userData.role === 'spv' && (
              <div className="mt-8 border-t border-slate-800 pt-6">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Admin Panel</h3>
                <Link to="/user-management" 
                  className={`flex items-center gap-4 p-3.5 rounded-xl transition-all border group shadow-sm ${location.pathname === '/user-management' ? 'bg-purple-600 border-purple-400 text-white' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}
                >
                  <span className="material-symbols-outlined text-xl">manage_accounts</span>
                  <div className="flex flex-col text-left">
                    <span className={`text-sm font-semibold ${location.pathname === '/user-management' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>Manajemen Akun</span>
                    <span className={`text-[9px] font-medium ${location.pathname === '/user-management' ? 'text-purple-200' : 'text-slate-500'}`}>Approval & Reset</span>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* AREA KONTEN UTAMA */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-72">
          <main className="p-4 md:p-8 w-full flex-grow">
            {/* Tempat Komponen Halaman Dirender (Dashboard, dll) */}
            <Outlet /> 
          </main>

          {/* FOOTER */}
          <footer className="p-8 border-t border-slate-200 bg-white">
            <div className="w-full flex flex-col items-center justify-center text-center gap-1.5">
              <p className="text-slate-700 text-sm font-bold">© 2026 PT. Telen Orbit Prima. All rights reserved.</p>
              <p className="text-slate-500 text-xs font-medium max-w-2xl">Proprietary monitoring technology for Safety, Health, and Environment Department.</p>
              <p className="text-slate-400 text-[11px] font-bold mt-2">Made with Gab's <span className="text-red-500">❤️</span>😀</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;