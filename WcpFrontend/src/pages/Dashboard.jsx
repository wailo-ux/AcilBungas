import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mqtt from 'mqtt';
import api from '../api/axiosConfig';
import { useMqttStore } from '../store/useMqttStore';
import ReactApexChart from 'react-apexcharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, mqttOnline, espOnline, setMqttOnline, setEspOnline } = useMqttStore();
  
  // Referensi ke MQTT Client
  const clientRef = useRef(null);
  let espWatchdog = useRef(null);

  // --- STATE DATA SENSOR ---
  const [sensorData, setSensorData] = useState({ rain: 0, temp: 0, hum: 0, r: 0, d: 0, main_10: false, buf_100: false, buf_90: false, mode: 'auto' });
  const [manualMode, setManualMode] = useState(false);
  const [localRefill, setLocalRefill] = useState(false);
  const [localDose, setLocalDose] = useState(false);

  // --- STATE PARAMETER SPV ---
  const [inputRainReset, setInputRainReset] = useState(10);
  const [inputRainDuration, setInputRainDuration] = useState(15);
  const [inputValveDelay, setInputValveDelay] = useState(5);
  const isParamInitialized = useRef(false);

  // --- STATE LOG HUJAN ---
  const [rainLogs, setRainLogs] = useState([]);
  const [isRainLoading, setIsRainLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');

  // --- GRAFIK APEXCHARTS ---
  const [chartSeries, setChartSeries] = useState([
    { name: 'Suhu (°C)', data: [] },
    { name: 'Kelembaban (%)', data: [] }
  ]);
  const [chartCategories, setChartCategories] = useState([]);

  const chartOptions = {
    chart: { 
      type: 'line', 
      animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#f97316', '#22c55e'],
    xaxis: { categories: chartCategories, labels: { show: true, style: { fontSize: '9px', colors: '#94a3b8' } } },
    yaxis: [
      { title: { text: 'Suhu (°C)', style: { color: '#f97316', fontSize: '10px' } }, min: 0, max: 50 },
      { opposite: true, title: { text: 'Kelembaban (%)', style: { color: '#22c55e', fontSize: '10px' } }, min: 0, max: 100 }
    ],
    legend: { position: 'top', horizontalAlign: 'right' },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
  };

  //FETCH API LOGS 
  const fetchRainLogs = async () => {
    setIsRainLoading(true);
    try {
      const response = await api.get('/logs');
      setRainLogs(response.data);
    } catch (error) {
      console.error("Gagal mengambil log:", error);
    } finally {
      setIsRainLoading(false);
    }
  };

  //MQTT CONNECTION 
  useEffect(() => {
    setMqttOnline(false);
    setEspOnline(false);
    
    const url = `ws://localhost:9999`; 
    
    //Konfigurasi Auto-Reconnect
    const mqttClient = mqtt.connect(url, {
      clientId: 'ReactDash-' + Math.random().toString(16).substring(2, 8),
      clean: true,
      keepalive: 30, 
      reconnectPeriod: 1000, 
    });
    
    clientRef.current = mqttClient;

    mqttClient.on('connect', () => {
      setMqttOnline(true);
      mqttClient.subscribe('TOP/SHE/WCP4/data');
      mqttClient.subscribe('TOP/SHE/WCP4/status');
    });

    mqttClient.on('reconnect', () => {
      console.log('🔄 Jaringan kedip, menyambung ulang ke Mosquitto...');
    });

    const handleDisconnect = () => {
      setMqttOnline(false);
      setEspOnline(false);
      clearTimeout(espWatchdog.current);
    };

    mqttClient.on('close', handleDisconnect);
    mqttClient.on('offline', handleDisconnect);
    mqttClient.on('error', handleDisconnect);

    mqttClient.on('message', (topic, message) => {
      if (topic === 'TOP/SHE/WCP4/status') {
        if (message.toString() === 'offline') {
          clearTimeout(espWatchdog.current);
          setEspOnline(false);
        } else if (message.toString() === 'online') {
          setEspOnline(true);
        }
      } else if (topic === 'TOP/SHE/WCP4/data') {
        try {
          clearTimeout(espWatchdog.current);
          setEspOnline(true);
          espWatchdog.current = setTimeout(() => setEspOnline(false), 15000);

          const payload = JSON.parse(message.toString());
          
          setSensorData(prev => ({ ...prev, ...payload }));
          setLocalRefill(payload.r === 1);
          setLocalDose(payload.d === 1);
          setManualMode(payload.mode === 'manual');

          const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          setChartCategories(prev => {
            const newCats = [...prev, timeNow];
            if (newCats.length > 15) newCats.shift();
            return newCats;
          });

          setChartSeries(prev => {
            const newTemp = [...prev[0].data, payload.temp || 0];
            const newHum = [...prev[1].data, payload.hum || 0];
            if (newTemp.length > 15) { newTemp.shift(); newHum.shift(); }
            return [{ name: 'Suhu (°C)', data: newTemp }, { name: 'Kelembaban (%)', data: newHum }];
          });

          if (!isParamInitialized.current && payload.p_reset !== undefined) {
            setInputRainReset(payload.p_reset);
            setInputRainDuration(payload.p_durasi);
            setInputValveDelay(payload.p_delay);
            isParamInitialized.current = true;
          }
        } catch (e) {
          console.error("JSON Error", e);
        }
      }
    });

    fetchRainLogs();
    const interval = setInterval(fetchRainLogs, 10000);

    return () => {
      clearInterval(interval);
      mqttClient.end(true); 
      clearTimeout(espWatchdog.current);
    };
  }, []); // <--- Error Anda sebelumnya ada di sekitar sini. Sekarang sudah bersih!

  // --- KONTROL COMMANDS ---
  const sendCommand = (payloadObj) => {
    if (clientRef.current && mqttOnline) {
      clientRef.current.publish('TOP/SHE/WCP4/command', JSON.stringify(payloadObj));
    }
  };

  const toggleAuto = (e) => {
    const isManual = e.target.checked;
    setManualMode(isManual);
    sendCommand({ mode: isManual ? 'manual' : 'auto' });
  };

  const controlValve = (type) => {
    if (type === 'REFILL') sendCommand({ valve1: !localRefill });
    if (type === 'DOSE') sendCommand({ valve2: !localDose });
  };

  const saveParameters = () => {
    if (clientRef.current && mqttOnline) {
      sendCommand({ cmd: "set_param", p_reset: Number(inputRainReset), p_durasi: Number(inputRainDuration), p_delay: Number(inputValveDelay) });
      alert("Berhasil! Parameter telah dikirim ke mesin.");
    }
  };

  // --- SORTING LOGS ---
  const sortedRainLogs = useMemo(() => {
    return [...rainLogs].sort((a, b) => sortOrder === 'desc' ? b.id - a.id : a.id - b.id);
  }, [rainLogs, sortOrder]);

  const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');

  return (
    <div className="w-full flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
      
      {/* HEADER STATUS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <h1 className="font-bold text-3xl text-gray-800">WCP 4 Site Monitoring</h1>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm transition-colors border ${mqttOnline ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${mqttOnline ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${mqttOnline ? 'text-blue-700' : 'text-red-700'}`}>{mqttOnline ? 'Server OK' : 'Server Terputus'}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm transition-colors border ${espOnline ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${espOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${espOnline ? 'text-green-700' : 'text-slate-500'}`}>{espOnline ? 'ESP32 Aktif' : 'ESP32 Offline'}</span>
          </div>
        </div>
      </div>
      
      {/* 4 CARD SENSOR UTAMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-4 rounded-xl bg-blue-50 text-blue-600"><span className="material-symbols-outlined text-3xl">water_drop</span></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Curah Hujan</p><h2 className="text-2xl font-bold text-slate-800 m-0">{sensorData.rain} <span className="text-lg font-medium">mm</span></h2></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-4 rounded-xl bg-orange-50 text-orange-600"><span className="material-symbols-outlined text-3xl">thermostat</span></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Suhu</p><h2 className="text-2xl font-bold text-slate-800 m-0">{sensorData.temp}°C</h2></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-4 rounded-xl bg-green-50 text-green-600"><span className="material-symbols-outlined text-3xl">cloud</span></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Kelembaban</p><h2 className="text-2xl font-bold text-slate-800 m-0">{sensorData.hum}%</h2></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className={`p-4 rounded-xl ${sensorData.mode === 'auto' ? 'bg-indigo-50 text-indigo-600' : 'bg-yellow-50 text-yellow-600'}`}><span className="material-symbols-outlined text-3xl">{sensorData.mode === 'auto' ? 'smart_toy' : 'back_hand'}</span></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Mode</p><h2 className="text-xl font-bold text-slate-800 m-0 uppercase">{sensorData.mode}</h2></div>
        </div>
      </div>

      {/* GRAFIK APEXCHARTS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-full">
        <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">show_chart</span> Tren Suhu & Kelembaban (Live)
        </h3>
        <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={280} />
      </div>

      {/* 3 CARD STATUS TANGKI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div className={`p-5 rounded-2xl text-white shadow-md transition-colors ${sensorData.main_10 ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <h3 className="font-bold text-sm mb-1 opacity-90">Tangki Utama (1200L)</h3><p className="font-bold text-xl">{sensorData.main_10 ? 'STOK AMAN' : 'KRITIS / KOSONG'}</p>
        </div>
        <div className={`p-5 rounded-2xl text-white shadow-md transition-colors ${sensorData.buf_100 ? 'bg-amber-500' : 'bg-blue-500'}`}>
          <h3 className="font-bold text-sm mb-1 opacity-90">Buffer Atas (100%)</h3><p className="font-bold text-xl">{sensorData.buf_100 ? 'LEVEL PENUH' : 'PENGISIAN...'}</p>
        </div>
        <div className={`p-5 rounded-2xl text-white shadow-md transition-colors ${sensorData.buf_90 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
          <h3 className="font-bold text-sm mb-1 opacity-90">Buffer Bawah (90%)</h3><p className="font-bold text-xl">{sensorData.buf_90 ? 'SIAP DOSING' : 'LEVEL RENDAH'}</p>
        </div>
      </div>

      {/* PANEL BAWAH: VALVE, MODE, & PARAMETER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* Kolom 1: Status Valve */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-blue-500">settings</span> Status Aktuator</h3>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border"><span className="font-bold text-sm">Valve Refill (V1)</span><span className={`px-3 py-1 rounded-full text-xs font-bold ${sensorData.r ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sensorData.r ? 'TERBUKA' : 'TERTUTUP'}</span></div>
            <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border"><span className="font-bold text-sm">Valve Dosing (V2)</span><span className={`px-3 py-1 rounded-full text-xs font-bold ${sensorData.d ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sensorData.d ? 'TERBUKA' : 'TERTUTUP'}</span></div>
          </div>
        </div>

        {/* Kolom 2: Kontrol Manual */}
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all ${!manualMode ? 'bg-slate-50/50' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><span className="material-symbols-outlined text-amber-500">tune</span> Kontrol Manual</h3>
            <label className="flex items-center cursor-pointer bg-slate-100 p-1 rounded-full border border-slate-200">
              <span className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${!manualMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>AUTO</span>
              <input type="checkbox" checked={manualMode} onChange={toggleAuto} className="hidden" />
              <span className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${manualMode ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}>MANUAL</span>
            </label>
          </div>
          <div className="flex flex-col gap-4">
            <button onClick={() => controlValve('REFILL')} disabled={!manualMode || sensorData.buf_100 || !sensorData.main_10} className={`flex items-center justify-center gap-2 h-14 font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 ${localRefill ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}><span className="material-symbols-outlined">{localRefill ? 'stop_circle' : 'play_circle'}</span> {localRefill ? 'STOP REFILL' : 'START REFILL'}</button>
            <button onClick={() => controlValve('DOSE')} disabled={!manualMode || (!sensorData.buf_90 && !sensorData.main_10)} className={`flex items-center justify-center gap-2 h-14 font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 ${localDose ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}><span className="material-symbols-outlined">{localDose ? 'stop_circle' : 'science'}</span> {localDose ? 'STOP DOSING' : 'START DOSING'}</button>
          </div>
        </div>

        {/* Kolom 3: Parameter SPV */}
        {user?.role === 'spv' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-purple-500">display_settings</span> Parameter Sistem</h3>
            <div className="flex flex-col gap-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Reset Hujan</label><div className="relative"><input type="number" value={inputRainReset} onChange={e => setInputRainReset(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"/><span className="absolute right-4 top-3 text-sm font-medium text-slate-400">menit</span></div></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Syarat Dosing</label><div className="relative"><input type="number" value={inputRainDuration} onChange={e => setInputRainDuration(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"/><span className="absolute right-4 top-3 text-sm font-medium text-slate-400">menit</span></div></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Delay Open/Close</label><div className="relative"><input type="number" value={inputValveDelay} onChange={e => setInputValveDelay(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"/><span className="absolute right-4 top-3 text-sm font-medium text-slate-400">detik</span></div></div>
              <button onClick={saveParameters} disabled={!mqttOnline} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 flex justify-center gap-2"><span className="material-symbols-outlined text-base">save</span> Simpan Parameter</button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 shadow-inner">
            <div className="p-4 bg-white rounded-full"><span className="material-symbols-outlined text-blue-600 text-5xl">lock</span></div>
            <div><p className="font-bold text-blue-900">Akses Terbatas</p><p className="text-xs text-blue-700 font-medium mt-1">Pengaturan parameter sistem hanya diubah oleh Supervisor HSE.</p></div>
          </div>
        )}
      </div>

      {/* TABEL LOG HUJAN */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-full mt-2">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><span className="material-symbols-outlined text-blue-500">history_toggle_off</span> Riwayat Sesi Hujan</h3>
          <div className="flex items-center gap-2">
            <button onClick={toggleSort} className="flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 border rounded-lg text-xs font-bold text-slate-600"><span className="material-symbols-outlined text-[16px]">sort</span>{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</button>
            <button onClick={fetchRainLogs} className="p-2 bg-slate-50 hover:bg-slate-100 border rounded-lg flex"><span className="material-symbols-outlined text-slate-500 text-[20px]">refresh</span></button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                <th className="p-4 border-b">Waktu Mulai</th><th className="p-4 border-b">Waktu Selesai</th><th className="p-4 border-b text-center">Durasi Hujan</th><th className="p-4 border-b text-right">Total Curah Hujan</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isRainLoading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-medium">Memuat data...</td></tr>
              ) : sortedRainLogs.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-medium">Belum ada riwayat data sesi hujan.</td></tr>
              ) : (
                sortedRainLogs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600">{log.waktuMulai || '-'}</td>
                    <td className="p-4 text-slate-600">{log.waktuSelesai || '-'}</td>
                    <td className="p-4 text-center font-bold text-slate-800">{log.durasiMenit} Menit</td>
                    <td className="p-4 text-right"><span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{log.totalHujan} mm</span></td>
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

export default Dashboard;