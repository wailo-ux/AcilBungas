import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mqtt from 'mqtt';
import api from '../api/axiosConfig';
import { useMqttStore } from '../store/useMqttStore';
import ReactApexChart from 'react-apexcharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, mqttOnline, espOnline, setMqttOnline, setEspOnline } = useMqttStore();
  
  const clientRef = useRef(null);
  let espWatchdog = useRef(null);

  // --- STATE DATA SENSOR ---
  const [sensorData, setSensorData] = useState({ rain: 0, temp: 0, hum: 0, pump: 0, main_tank: false, mode: 'auto' });
  const [manualMode, setManualMode] = useState(false);
  const [localPump, setLocalPump] = useState(false);
  const [relayStatus, setRelayStatus] = useState(false); // TAMBAHAN: Status fisik relay

  // --- STATE PARAMETER SPV ---
  const [inputRainReset, setInputRainReset] = useState(10);
  const [inputRainDuration, setInputRainDuration] = useState(15);
  const [inputDoseOn, setInputDoseOn] = useState(3);
  const [inputDoseOff, setInputDoseOff] = useState(57);
  
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

  useEffect(() => {
    setMqttOnline(false);
    setEspOnline(false);
    
    const url = `ws://10.167.250.46:9999`; 
    
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

          const rawPayload = JSON.parse(message.toString());
          
          const payload = {
            ...rawPayload,
            main_tank: rawPayload.main_10 === 1 || rawPayload.main_10 === true,
            pump: rawPayload.p,
            relay_status: rawPayload.p_relay // Tangkap status fisik relay
          };
          
          setSensorData(prev => ({ ...prev, ...payload }));
          setLocalPump(payload.pump === 1); 
          setRelayStatus(payload.relay_status === 1); // Update animasi indikator
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
            if (payload.p_dose_on !== undefined) setInputDoseOn(payload.p_dose_on);
            if (payload.p_dose_off !== undefined) setInputDoseOff(payload.p_dose_off);
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
  }, []);

  const sendCommand = (payloadObj) => {
    if (clientRef.current && mqttOnline) {
      clientRef.current.publish('TOP/SHE/WCP4/command', JSON.stringify(payloadObj));
    }
  };

  const changeMode = (isManual) => {
    setManualMode(isManual);
    sendCommand({ mode: isManual ? 'manual' : 'auto' });
  };

  const controlPump = () => {
    sendCommand({ pump: !localPump });
  };

  const saveParameters = () => {
    if (clientRef.current && mqttOnline) {
      sendCommand({ 
        cmd: "set_param", 
        p_reset: Number(inputRainReset), 
        p_durasi: Number(inputRainDuration), 
        p_dose_on: Number(inputDoseOn),
        p_dose_off: Number(inputDoseOff)
      });
      alert("Berhasil! Parameter Interval Dosing telah dikirim ke ESP32.");
    }
  };

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

      {/* 1 CARD STATUS TANGKI SAJA */}
      <div className="w-full">
        <div className={`px-6 py-5 rounded-2xl text-white shadow-md transition-colors flex items-center justify-between ${sensorData.main_tank ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <div>
            <h3 className="font-bold text-sm mb-1 opacity-90 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">water_ec</span> Status Tangki Utama (600L)
            </h3>
            <p className="font-bold text-2xl">{sensorData.main_tank ? 'LEVEL AIR AMAN' : 'KRITIS / KOSONG'}</p>
          </div>
          <span className="material-symbols-outlined text-5xl opacity-80 hidden sm:block">
            {sensorData.main_tank ? 'check_circle' : 'warning'}
          </span>
        </div>
      </div>

      {/* PANEL BAWAH: VALVE, MODE, & PARAMETER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* Kolom 1: Status Aktuator (PERBAIKAN ANIMASI JEDA) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
          <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">settings_applications</span> Status Aktuator
          </h3>
          <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 rounded-xl border border-slate-100 p-6">
            <div className={`p-5 mb-4 rounded-full transition-all duration-300 ${
                !localPump 
                  ? 'bg-slate-200 text-slate-400' 
                  : relayStatus 
                    ? 'bg-green-100 text-green-600 shadow-[0_0_25px_rgba(34,197,94,0.4)]' 
                    : 'bg-amber-100 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
            }`}>
              <span className="material-symbols-outlined text-6xl">water_pump</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-500 mb-2">Dosing Pump WCP 4</p>
              <span className={`px-5 py-2 rounded-full text-sm font-bold tracking-wider transition-colors ${
                  !localPump 
                    ? 'bg-slate-300 text-slate-600' 
                    : relayStatus 
                      ? 'bg-green-500 text-white' 
                      : 'bg-amber-500 text-white'
              }`}>
                {!localPump ? 'POMPA STANDBY' : relayStatus ? 'SEDANG MENYALA (ON)' : 'JEDA INTERVAL (OFF)'}
              </span>
            </div>
          </div>
        </div>

        {/* Kolom 2: Kontrol Manual */}
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-full transition-all duration-300 ${!manualMode ? 'opacity-80' : 'ring-2 ring-amber-400'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">tune</span> Kendali Operasi
            </h3>
            
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
              <button onClick={() => changeMode(false)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${!manualMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>AUTO</button>
              <button onClick={() => changeMode(true)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${manualMode ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>MANUAL</button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-3">
            <button 
              onClick={controlPump} 
              disabled={!manualMode || !sensorData.main_tank} 
              className={`relative overflow-hidden group flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                localPump 
                  ? 'bg-red-50 hover:bg-red-100 border-2 border-red-500 text-red-600' 
                  : 'bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-500 text-emerald-600'
              }`}>
              <span className="material-symbols-outlined text-4xl transition-transform group-hover:scale-110">
                {localPump ? 'power_settings_new' : 'science'}
              </span>
              <span className="font-bold text-base tracking-wider">
                {localPump ? 'MATIKAN POMPA' : 'JALANKAN DOSING'}
              </span>
            </button>
            
            <div className="text-center h-4">
              {!sensorData.main_tank && manualMode ? (
                <p className="text-xs text-red-500 font-bold flex items-center justify-center gap-1 animate-pulse">
                  <span className="material-symbols-outlined text-[14px]">warning</span> Dilarang start (Tangki Kosong)
                </p>
              ) : !manualMode ? (
                <p className="text-xs text-slate-400 font-medium">Ubah ke mode manual untuk kendali aktif.</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Kolom 3: Parameter SPV */}
        {user?.role === 'spv' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500">display_settings</span> Parameter Sistem
            </h3>
            
            <div className="flex flex-col gap-3 flex-1 justify-between">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-600">Reset Hujan</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Jeda sesi kering baru</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={inputRainReset} onChange={e => setInputRainReset(e.target.value)} className="w-16 text-center font-bold text-slate-700 bg-white border border-slate-300 rounded-lg py-1.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  <span className="text-xs font-bold text-slate-400 w-6">mnt</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-600">Syarat Dosing</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Durasi hujan untuk start</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={inputRainDuration} onChange={e => setInputRainDuration(e.target.value)} className="w-16 text-center font-bold text-slate-700 bg-white border border-slate-300 rounded-lg py-1.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  <span className="text-xs font-bold text-slate-400 w-6">mnt</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-600">Dosing ON</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Lama pompa menyala</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={inputDoseOn} onChange={e => setInputDoseOn(e.target.value)} className="w-16 text-center font-bold text-slate-700 bg-white border border-slate-300 rounded-lg py-1.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  <span className="text-xs font-bold text-slate-400 w-6">dtk</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-600">Dosing OFF</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Jeda pompa mati</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={inputDoseOff} onChange={e => setInputDoseOff(e.target.value)} className="w-16 text-center font-bold text-slate-700 bg-white border border-slate-300 rounded-lg py-1.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  <span className="text-xs font-bold text-slate-400 w-6">dtk</span>
                </div>
              </div>

              <button onClick={saveParameters} disabled={!mqttOnline} className="w-full mt-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">cloud_upload</span> Terapkan Parameter
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 h-full shadow-inner">
            <div className="p-4 bg-white rounded-full shadow-sm"><span className="material-symbols-outlined text-blue-500 text-5xl">lock</span></div>
            <div><p className="font-bold text-blue-900">Akses Parameter Terkunci</p><p className="text-xs text-blue-700 font-medium mt-1">Pengaturan sistem ini hanya bisa diubah oleh SPV HSE.</p></div>
          </div>
        )}
      </div>

      {/* GRAFIK APEXCHARTS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-full mt-2">
        <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">show_chart</span> Tren Suhu & Kelembaban (Live)
        </h3>
        <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={280} />
      </div>

      {/* TABEL LOG HUJAN */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-full">
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