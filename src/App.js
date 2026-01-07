import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LuxuryProductSearch from './LuxuryProductSearch';
import AdminPanel from './AdminPanel';
import AgentChatModal from './AgentChatModal';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [promptAttempted, setPromptAttempted] = useState(false);
  const [showAgent, setShowAgent] = useState(false);

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
    return (
      <>
        <AdminPanel onLogout={handleAdminLogout} />
        <button
          onClick={() => setShowAgent(true)}
          className="fixed bottom-6 right-6 z-40 lux-button-primary shadow-luxury"
          aria-label="打开聊天助手"
        >
          聊天助手
        </button>
        <AgentChatModal open={showAgent} onClose={() => setShowAgent(false)} />
      </>
    );
  }

  if (isAdminRoute) {
  return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <div className="max-w-md w-full lux-card p-8 space-y-4 text-center">
          <p className="text-xs tracking-[0.35em] uppercase text-ink-500">FeeL</p>
          <h1 className="text-3xl font-medium text-ink-900 font-serif">管理员入口</h1>
          <div className="mx-auto h-px w-16 bg-gold-400" />
          <p className="text-sm text-ink-600 leading-relaxed">
            这是一个隐藏的管理界面入口。请输入管理员密钥以继续。如果您不是授权管理员，可点击下方按钮返回首页。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        onClick={handleAdminLogin}
              className="lux-button-primary"
      >
              输入管理员密钥
      </button>
            <a
              href="/"
              className="lux-button-ghost"
            >
              返回首页
            </a>
          </div>
        </div>
    </div>
  );
  }

  // Regular User View (chat助手隐藏)
  return <LuxuryProductSearch />;
}

export default App;
