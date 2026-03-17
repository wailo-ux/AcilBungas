import { create } from 'zustand';

export const useMqttStore = create((set) => ({
  // State MQTT
  mqttOnline: false,
  espOnline: false,
  
  // State User (Cek apakah ada data user di localStorage saat web dibuka)
  user: JSON.parse(localStorage.getItem('user')) || null,
  
  // Actions MQTT
  setMqttOnline: (status) => set({ mqttOnline: status }),
  setEspOnline: (status) => set({ espOnline: status }),

  // Actions Auth
  loginUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    set({ user: userData });
  },
  logoutUser: () => {
    localStorage.removeItem('user');
    set({ user: null });
  }
}));