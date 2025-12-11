import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const bubbleBase =
  'max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm border';

export default function AgentChatModal({ open, onClose }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '您好，我是 Feel 智能助手，请输入商品名称或参考号。' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || loading) return;

    setError('');
    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const reply = data?.message || '不知道';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      setError('服务异常，请稍后再试');
      setMessages((prev) => [...prev, { role: 'assistant', text: '不好意思，服务暂时不可用。' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[520px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-base font-semibold text-gray-900">FeeL 聊天助手</p>
            <p className="text-xs text-gray-500">查询本地产品价格 · Deepseek</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition text-sm"
          >
            关闭
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={
                  bubbleBase +
                  (msg.role === 'assistant'
                    ? ' bg-white text-gray-800 border-gray-200'
                    : ' bg-black text-white border-black/80')
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

        <div className="border-t border-gray-100 px-3 py-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="输入商品名称或参考号..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

