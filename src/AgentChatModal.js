import React, { useState, useRef, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const bubbleBase =
  'max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm border';

/**
 * 简单的文本格式化：
 * - 将 URL 转为可点击链接
 * - 将 **text** 转为粗体
 * - 将换行符转为 <br>
 */
function formatMessage(text) {
  if (!text) return null;
  
  // 分割文本为行
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    // 处理每一行
    const parts = [];
    let remaining = line;
    let partIndex = 0;
    
    // 处理 **粗体** 和链接
    while (remaining.length > 0) {
      // 查找链接 (https://... 或 http://...)
      const urlMatch = remaining.match(/(https?:\/\/[^\s<>）】\]]+)/);
      // 查找粗体 **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      
      // 找出哪个匹配先出现
      const urlIndex = urlMatch ? remaining.indexOf(urlMatch[0]) : -1;
      const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
      
      if (urlIndex === -1 && boldIndex === -1) {
        // 没有更多匹配，添加剩余文本
        if (remaining) parts.push(<span key={partIndex++}>{remaining}</span>);
        break;
      }
      
      // 确定先处理哪个
      const handleUrl = urlIndex !== -1 && (boldIndex === -1 || urlIndex < boldIndex);
      const handleBold = boldIndex !== -1 && (urlIndex === -1 || boldIndex < urlIndex);
      
      if (handleUrl) {
        // 添加链接前的文本
        if (urlIndex > 0) {
          parts.push(<span key={partIndex++}>{remaining.substring(0, urlIndex)}</span>);
        }
        // 添加链接
        parts.push(
          <a
            key={partIndex++}
            href={urlMatch[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {urlMatch[0]}
          </a>
        );
        remaining = remaining.substring(urlIndex + urlMatch[0].length);
      } else if (handleBold) {
        // 添加粗体前的文本
        if (boldIndex > 0) {
          parts.push(<span key={partIndex++}>{remaining.substring(0, boldIndex)}</span>);
        }
        // 添加粗体
        parts.push(<strong key={partIndex++} className="font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.substring(boldIndex + boldMatch[0].length);
      }
    }
    
    // 返回行内容，如果不是最后一行则添加换行
    return (
      <React.Fragment key={lineIndex}>
        {parts.length > 0 ? parts : line}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export default function AgentChatModal({ open, onClose }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '您好，我是Feel智能助手，您可以给我商品具体名称或者识别码我来帮您查询它们对应的价格，如果您想要我在线查询某个商品的信息请说在线查询XX品牌的商品' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 用于自动滚动到底部
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // 滚动到底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当消息更新或 loading 状态改变时，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[600px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-base font-semibold text-gray-900">FeeL 智能助手</p>
            <p className="text-xs text-gray-500">本地价格查询 · 在线搜索</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition text-sm"
          >
            关闭
          </button>
        </div>

        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50"
        >
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
                {formatMessage(msg.text)}
              </div>
            </div>
          ))}
          {/* 加载中提示 */}
          {loading && (
            <div className="flex justify-start">
              <div className={bubbleBase + ' bg-white text-gray-500 border-gray-200'}>
                <span className="inline-flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                  <span>正在思考...</span>
                </span>
              </div>
            </div>
          )}
          {/* 滚动定位点 */}
          <div ref={messagesEndRef} />
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

