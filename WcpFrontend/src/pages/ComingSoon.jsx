import React from 'react';
import { Link } from 'react-router-dom';

const ComingSoon = () => {
  return (
    <div className="w-full h-[70vh] flex flex-col items-center justify-center text-center animate-[fadeIn_0.5s_ease-out_forwards]">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl relative z-10">
          <span className="material-symbols-outlined text-7xl text-blue-600">engineering</span>
        </div>
      </div>
      
      <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-3">STATION UNDER CONSTRUCTION</h2>
      <div className="w-16 h-1.5 bg-blue-600 rounded-full mb-6"></div>
      <p className="text-slate-500 text-sm max-w-md leading-relaxed font-medium">
        Modul monitoring dan integrasi panel kontrol (PLC/ESP32) untuk stasiun pemantauan ini sedang dalam tahap instalasi fisik di lapangan😁
      </p>

      <Link 
        to="/dashboard" 
        className="mt-10 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3 tracking-wide"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        KEMBALI KE WCP 4 (ACTIVE)
      </Link>
    </div>
  );
};

export default ComingSoon;