import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LuxuryProductSearch from './LuxuryProductSearch';
import AdminPanel from './AdminPanel';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [promptAttempted, setPromptAttempted] = useState(false);

  const isBrowser = typeof window !== 'undefined';
  const isAdminRoute = useMemo(() => {
    if (!isBrowser) return false;
    return window.location.pathname.startsWith('/admin');
  }, [isBrowser]);

  // Check if already logged in on mount
  useEffect(() => {
    const savedAdminKey = sessionStorage.getItem('admin_key');
    if (savedAdminKey) {
      setIsAdmin(true);
    }
  }, []);

  const handleAdminLogin = useCallback(() => {
    const password = prompt('请输入管理员密钥:');
    if (password !== null && password.trim()) {
      sessionStorage.setItem('admin_key', password.trim());
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (isAdminRoute && !isAdmin && !promptAttempted) {
      setPromptAttempted(true);
      handleAdminLogin();
    }
  }, [isAdminRoute, isAdmin, promptAttempted, handleAdminLogin]);

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_key');
    setIsAdmin(false);
    if (isAdminRoute) {
      setPromptAttempted(false);
    }
  };

  // Admin Panel View
  if (isAdmin) {
    return <AdminPanel onLogout={handleAdminLogout} />;
  }

  if (isAdminRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 space-y-4 text-center border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">管理员入口</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            这是一个隐藏的管理界面入口。请输入管理员密钥以继续。如果您不是授权管理员，可点击下方按钮返回首页。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleAdminLogin}
              className="px-4 py-2 rounded-lg bg-black text-white font-medium hover:bg-gray-900 transition"
            >
              输入管理员密钥
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            >
              返回首页
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Regular User View
  return <LuxuryProductSearch />;
}

export default App;
