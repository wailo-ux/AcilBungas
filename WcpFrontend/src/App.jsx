import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Layout & State
import AppLayout from './layouts/AppLayout';
import { useMqttStore } from './store/useMqttStore';

// Import Semua Halaman
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import UserManagement from './pages/UserManagement';

function App() {
  const user = useMqttStore((state) => state.user);

  return (
    <Router>
      <Routes>
        {/* Redirect dari Root (/) */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        
        {/* Rute Bebas (Tanpa Sidebar/Layout) */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
        
        {/* Rute Terkunci (Menggunakan Sidebar & Wajib Login) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          
          <Route path="/wcp1" element={user ? <ComingSoon /> : <Navigate to="/login" />} />
          <Route path="/wcp2" element={user ? <ComingSoon /> : <Navigate to="/login" />} />
          <Route path="/wcp3" element={user ? <ComingSoon /> : <Navigate to="/login" />} />
          
          <Route path="/user-management" element={user ? <UserManagement /> : <Navigate to="/login" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;