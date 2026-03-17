import { useEffect } from 'react';
import mqtt from 'mqtt';
import { useMqttStore } from '../store/useMqttStore';

const MqttProvider = () => {
  const setMqttOnline = useMqttStore((state) => state.setMqttOnline);
  const setEspOnline = useMqttStore((state) => state.setEspOnline);

  useEffect(() => {
    // Konek ke Mosquitto via WebSocket di port yang baru (9999)
    const client = mqtt.connect('ws://localhost:9999');

    client.on('connect', () => {
      console.log('React terhubung ke Mosquitto (WebSocket Port 9999)');
      setMqttOnline(true);
      
      // Subscribe ke topik yang ingin dipantau Frontend
      client.subscribe('pt_top/dosing/site_a/status');
      // Anda juga bisa menambahkan subscribe ke '.../data' jika ingin 
      // menampilkan data sensor real-time tanpa harus refresh halaman API
    });

    client.on('message', (topic, message) => {
      if (topic === 'pt_top/dosing/site_a/status') {
        const status = message.toString();
        setEspOnline(status === 'online');
      }
    });

    client.on('offline', () => {
      console.log('Koneksi MQTT terputus...');
      setMqttOnline(false);
      setEspOnline(false);
    });

    // Cleanup: Matikan koneksi jika user menutup halaman
    return () => {
      if (client) {
        client.end();
      }
    };
  }, []); // Array kosong artinya efek ini hanya dijalankan 1x saat website dibuka

  return null; // Komponen ini tidak merender UI (tampilan) apa pun, hanya logika
};

export default MqttProvider;