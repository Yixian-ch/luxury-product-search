import React, { useState, useEffect } from 'react';
import LuxuryProductSearch from './LuxuryProductSearch';
import AdminPanel from './AdminPanel';
import { LogIn } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if already logged in on mount
  useEffect(() => {
    const savedAdminKey = sessionStorage.getItem('admin_key');
    if (savedAdminKey) {
      setIsAdmin(true);
    }
  }, []);

  const handleAdminLogin = () => {
    const password = prompt('请输入管理员密钥:');
    if (password !== null && password.trim()) {
      sessionStorage.setItem('admin_key', password);
      setIsAdmin(true);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_key');
    setIsAdmin(false);
  };

  // Admin Panel View
  if (isAdmin) {
    return <AdminPanel onLogout={handleAdminLogout} />;
  }

  // Regular User View
  return (
    <div>
      <LuxuryProductSearch />

      {/* Floating Admin Login Button */}
      <button
        onClick={handleAdminLogin}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
        title="点击登录为管理员"
      >
        <LogIn size={20} />
        <span className="text-sm font-semibold">管理员登录</span>
      </button>
    </div>
  );
}

export default App;
