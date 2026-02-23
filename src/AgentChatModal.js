import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DEFAULT_GREETING = '您好，我是Feel智能助手，您可以给我商品具体名称或者识别码我来帮您查询它们对应的价格，如果您想要我在线查询某个商品的信息请说在线查询XX品牌的商品';

const QUICK_PROMPTS = [
  '我想查 Dior Lady Dior 的价格',
  '在线查询 Dior 最新裙子',
  '我想找一只通勤包，预算 2000€，偏简约',
  '帮我对比 Gucci 和 Prada 的经典款入门包',
];

const bubbleBase =
  'max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed border';

/**
 * 简单的文本格式化：
 * - 将 URL 转为可点击链接
 * - 将 **text** 转为粗体
 * - 将换行符转为 <br>
 */
function formatMessage(text) {
  if (!text) return null;

  const stripUrlTrailingPunct = (value) => {
    if (!value) return value;
    let out = String(value);
    while (out.length > 0) {
      const last = out[out.length - 1];
      if (')]}>,.，。;；!！?？:：》】）`'.includes(last)) {
        out = out.slice(0, -1);
        continue;
      }
      break;
    }
    return out;
  };
  
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
      const urlMatch = remaining.match(/(https?:\/\/[^\s<>"'`]+)/);
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
        const rawUrl = urlMatch[0];
        const cleanedUrl = stripUrlTrailingPunct(rawUrl);
        // 添加链接前的文本
        if (urlIndex > 0) {
          parts.push(<span key={partIndex++}>{remaining.substring(0, urlIndex)}</span>);
        }
        // 添加链接
        parts.push(
          <a
            key={partIndex++}
            href={cleanedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-900 underline decoration-gold-400/70 decoration-2 underline-offset-4 hover:decoration-gold-500 break-all"
          >
            {cleanedUrl}
          </a>
        );
        remaining = remaining.substring(urlIndex + rawUrl.length);
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
    { role: 'assistant', text: DEFAULT_GREETING },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesRef = useRef(messages);
  
  // 用于自动滚动到底部
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // 滚动到底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当消息更新或 loading 状态改变时，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const toHistoryPayload = (sourceMessages) => {
    return (sourceMessages || [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
      .map((m) => ({ role: m.role, content: m.text }));
  };

  const copyToClipboard = async (text, index) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1200);
    } catch {
      setError('复制失败，请手动选择文本复制');
    }
  };

  // 处理图片选择
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证是否为图片文件
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('图片文件大小不能超过10MB');
      return;
    }

    setSelectedImage(file);
    
    // 创建图片预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  // 移除选中的图片
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 打开文件选择器
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const requestAssistant = async ({ query, baseMessages }) => {
    const history = toHistoryPayload(baseMessages);
    const resp = await fetch(`${API_URL}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, messages: history }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data?.message || '不知道';
  };

  const sendText = async (text) => {
    const query = (text || '').trim();
    
    // 检查是否有图片或文字内容
    if (!query && !selectedImage) return;
    if (loading) return;

    setError('');
    const base = messagesRef.current || [];
    
    // 如果有图片，创建包含图片的消息
    if (selectedImage) {
      // capture file reference before clearing state
      const imageFile = selectedImage;
      const nextMessages = [...base, { 
        role: 'user', 
        text: query || '发送了一张图片',
        image: imagePreview 
      }];
      setMessages(nextMessages);
      setInput('');
      handleRemoveImage();
      setLoading(true);

      try {
        const formData = new FormData();
        formData.append('file', imageFile);
        const res = await fetch(`${API_URL}/api/reverse-image-search`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        const data = await res.json();
        const results = data.results || [];
        const replyText = results.length > 0
          ? results.map(r => `📌 ${r.title}\n   🔗 ${r.link}`).join('\n\n')
          : '未找到相關圖片搜索結果。';
        setMessages((prev) => [...prev, { role: 'assistant', text: replyText }]);
      } catch (e) {
        console.error('[ReverseImg]', e);
        setMessages((prev) => [...prev, { role: 'assistant', text: `圖片搜索失敗：${e.message}` }]);
      }
      setLoading(false);
      return;
    }

    // 正常的文字消息处理
    const nextMessages = [...base, { role: 'user', text: query }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await requestAssistant({ query, baseMessages: nextMessages });
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      setError('服务异常，请稍后再试');
      setMessages((prev) => [...prev, { role: 'assistant', text: '不好意思，服务暂时不可用。' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (loading) return;
    setError('');
    setCopiedIndex(null);
    setMessages([{ role: 'assistant', text: DEFAULT_GREETING }]);
    setInput('');
    handleRemoveImage();
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRegenerate = async () => {
    if (loading) return;
    const base = messagesRef.current || [];
    const lastUserIndex = (() => {
      for (let i = base.length - 1; i >= 0; i -= 1) {
        if (base[i]?.role === 'user') return i;
      }
      return -1;
    })();
    if (lastUserIndex === -1) return;

    const trimmedBase = base.slice(0, lastUserIndex + 1);
    const query = (trimmedBase[lastUserIndex]?.text || '').trim();
    if (!query) return;

    setError('');
    setMessages(trimmedBase);
    setLoading(true);
    try {
      const reply = await requestAssistant({ query, baseMessages: trimmedBase });
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setError('服务异常，请稍后再试');
      setMessages((prev) => [...prev, { role: 'assistant', text: '不好意思，服务暂时不可用。' }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    await sendText(input);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-luxury border border-ink-200 flex flex-col h-[600px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
          <div>
            <p className="text-xs tracking-[0.35em] uppercase text-ink-500">FeeL</p>
            <p className="mt-1 text-lg font-medium text-ink-900 font-serif">智能助手</p>
            <div className="mt-3 h-px w-16 bg-gold-400" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              disabled={loading}
              className="lux-button-ghost disabled:opacity-60 disabled:cursor-not-allowed"
            >
              清空
            </button>
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="lux-button-ghost disabled:opacity-60 disabled:cursor-not-allowed"
            >
              重新生成
            </button>
            <button
              onClick={onClose}
              className="lux-button-ghost"
            >
              关闭
            </button>
          </div>
        </div>

        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-ink-50"
        >
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={
                  bubbleBase +
                  (msg.role === 'assistant'
                    ? ' bg-white text-ink-900 border-ink-200'
                    : ' bg-black text-white border-black')
                }
              >
                {/* 如果消息包含图片，显示图片预览 */}
                {msg.image && (
                  <img 
                    src={msg.image} 
                    alt="上传的图片" 
                    className="max-w-[200px] max-h-[200px] rounded-lg mb-2 object-cover"
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">{formatMessage(msg.text)}</div>
                  {msg.role === 'assistant' && msg.text ? (
                    <button
                      onClick={() => copyToClipboard(msg.text, idx)}
                      className="text-xs text-ink-400 hover:text-ink-800 transition whitespace-nowrap"
                      title="复制回答"
                      type="button"
                    >
                      {copiedIndex === idx ? '已复制' : '复制'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {/* 加载中提示 */}
          {loading && (
            <div className="flex justify-start">
              <div className={bubbleBase + ' bg-white text-ink-600 border-ink-200'}>
                <span className="inline-flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                  <span>正在思考...</span>
                </span>
              </div>
            </div>
          )}
          {/* 滚动定位点 */}
          <div ref={messagesEndRef} />
        </div>

        {error && <div className="px-5 py-2 text-sm text-red-600">{error}</div>}

        <div className="px-5 pb-3 pt-1 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((text) => (
            <button
              key={text}
              type="button"
              disabled={loading}
              onClick={() => {
                setInput(text);
                window.setTimeout(() => {
                  inputRef.current?.focus();
                }, 0);
              }}
              className="px-4 h-9 rounded-full border border-ink-200 bg-white text-xs text-ink-800 hover:bg-ink-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {text}
            </button>
          ))}
        </div>

        <div className="border-t border-ink-200 px-5 py-4 bg-white rounded-b-3xl">
          {/* 图片预览区域 */}
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img 
                src={imagePreview} 
                alt="预览" 
                className="max-w-[120px] max-h-[120px] rounded-lg border-2 border-ink-200 object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                title="移除图片"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            
            {/* 图片上传按钮 */}
            <button
              onClick={handleImageButtonClick}
              disabled={loading}
              className="w-11 h-11 rounded-full border border-ink-300 bg-white hover:bg-ink-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center transition"
              title="上传图片"
            >
              <ImagePlus size={20} className="text-ink-600" />
            </button>
            
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="输入商品名称或参考号..."
              className="flex-1 h-11 rounded-full border border-ink-300 px-4 py-2 focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="lux-button-primary h-11 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

