import React, { useState } from 'react';
import { Upload, LogOut, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminPanel = ({ onLogout }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error'
  const [stats, setStats] = useState(null); // { inserted, duplicatesSkipped, total }
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // product being edited
  const [editDraft, setEditDraft] = useState({});
  const [brandToDelete, setBrandToDelete] = useState('');
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessage('');
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      // Helper: normalize header strings
      const normalizeHeader = (h) => {
        if (!h && h !== 0) return '';
        const s = String(h);
        return s
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .replace(/\s+/g, '_')
          .replace(/[-/\\]+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase();
      };

      // Map common incoming headers
      const headerMap = {
        produit: 'produit',
        designation: 'designation',
        motif: 'motif',
        marque: 'marque',
        couleur: 'couleur',
        taille: 'taille',
        reference: 'reference',
        referencee: 'reference',
        'référence': 'reference',
        'Référence': 'reference',  // Direct mapping for capitalized version
        'REFERENCE': 'reference',
        dimension: 'dimension',
        prix_vente: 'prix_vente',
        prixvente: 'prix_vente',
        tarif: 'prix_vente',
        prix_achat: 'prix_achat',
        rayon: 'Rayon',
        famille: 'Famille',
        sousfamille: 'sousfamille',
        matiere: 'matiere',
        lien_externe: 'lien_externe',
        lienexterne: 'lien_externe',
        lien: 'lien_externe',
        link: 'Link',
        pays_production: 'production_pays',
        paysdeproduction: 'production_pays',
        pays_de_production: 'production_pays',
        poids: 'poids'
      };

      const normalizeRow = (row) => {
        const out = {};
        Object.keys(row).forEach((k) => {
          // First try direct mapping (for exact matches like "Référence")
          let mapped = headerMap[k] || headerMap[k.toLowerCase()];
          
          // If not found, normalize and try again
          if (!mapped) {
            const nk = normalizeHeader(k);
            mapped = headerMap[nk];
            
            // Special case: if normalized key contains "reference" (any variant), map to "reference"
            if (!mapped && nk.includes('reference')) {
              mapped = 'reference';
            }
            
            // Fallback to normalized key if still not mapped
            if (!mapped) {
              mapped = nk;
            }
          }
          
          out[mapped] = row[k];
        });

        // Parse price
        if (out.prix_vente !== undefined && out.prix_vente !== null && out.prix_vente !== '') {
          const str = String(out.prix_vente).trim();
          const cleaned = str.replace(/[^0-9,.-]/g, '').replace(/,/g, '.');
          const num = parseFloat(cleaned);
          if (!Number.isNaN(num)) out.prix_vente = num;
        }

        if (out.reference !== undefined && out.reference !== null) {
          out.reference = String(out.reference).trim();
        }

        return out;
      };

      const jsonData = raw.map(normalizeRow);

      // Pre-check: every item must have non-empty reference
      const missing = [];
      jsonData.forEach((item, idx) => {
        const ref = item && item.reference != null ? String(item.reference).trim() : '';
        if (!ref) {
          missing.push(idx + 1); // human-friendly row index
        } else {
          item.reference = ref;
        }
      });
      if (missing.length > 0) {
        setMessage(`✗ 上传失败：以下行缺少 reference 字段：${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' ...' : ''}`);
        setMessageType('error');
        setIsUploading(false);
        event.target.value = '';
        return;
      }

      // Save to localStorage first
      try {
        localStorage.setItem('luxury_products', JSON.stringify(jsonData));
      } catch (e) {
        console.warn('localStorage save failed', e);
      }

      // Get admin key from sessionStorage (set during login)
      const adminKey = sessionStorage.getItem('admin_key');
      if (!adminKey) {
        setMessage('错误: 未找到管理员密钥，请重新登录。');
        setMessageType('error');
        setIsUploading(false);
        return;
      }

      // Debug: log API URL and data size
      console.log('上传数据到:', `${API_URL}/api/products`);
      console.log('数据条数:', jsonData.length);
      console.log('数据大小:', JSON.stringify(jsonData).length, 'bytes');

      // Send to server
      const headers = {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      };

      const response = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(jsonData),
      });

      if (response.ok) {
        const result = await response.json();
        setStats({ inserted: result.inserted, duplicatesSkipped: result.duplicatesSkipped, total: result.total });
        setMessage(`✓ 上传完成：新增 ${result.inserted}，跳过重复 ${result.duplicatesSkipped}，总量 ${result.total}`);
        setMessageType('success');
        // refresh list
        try {
          const listRes = await fetch(`${API_URL}/api/products`);
          const list = await listRes.json();
          if (Array.isArray(list)) setProducts(list);
        } catch {}
      } else if (response.status === 401) {
        setMessage('✗ 管理员密钥无效。请重新登录。');
        setMessageType('error');
        sessionStorage.removeItem('admin_key');
        onLogout();
      } else {
        // 尝试获取服务器返回的错误详情
        let errorDetail = '';
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || '';
        } catch (e) {
          errorDetail = `HTTP ${response.status}`;
        }
        setMessage(`✗ 服务器返回错误：${errorDetail || response.status}。请检查后端连接和配置。`);
        setMessageType('error');
        console.error('Server error:', response.status, errorDetail);
      }
    } catch (error) {
      // 更详细的错误信息
      let errorMsg = '✗ 文件上传失败：';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMsg += `无法连接到服务器 (${API_URL})。请检查：\n1. 后端服务是否运行\n2. API_URL 配置是否正确\n3. 网络连接是否正常`;
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += '未知错误，请检查文件格式和网络连接。';
      }
      setMessage(errorMsg);
      setMessageType('error');
      console.error('Upload error:', error);
    }
    setIsUploading(false);
    event.target.value = '';
  };

  // Load products for management list
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/products`);
        const data = await res.json();
        if (Array.isArray(data)) setProducts(data);
      } catch (e) {
        console.warn('fetch products failed', e);
      }
    })();
  }, []);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p =>
      String(p.reference || '').toLowerCase().includes(term) ||
      String(p.produit || '').toLowerCase().includes(term) ||
      String(p.marque || '').toLowerCase().includes(term)
    );
  }, [products, search]);

  const brandOptions = React.useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const brand = typeof p.marque === 'string' ? p.marque.trim() : '';
      if (brand) set.add(brand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const openEdit = (product) => {
    setEditing(product);
    const draft = { ...product };
    delete draft.reference; // immutable
    setEditDraft(draft);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const adminKey = sessionStorage.getItem('admin_key') || '';
    const res = await fetch(`${API_URL}/api/products/${encodeURIComponent(editing.reference)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      },
      body: JSON.stringify(editDraft)
    });
    if (res.ok) {
      // update local list
      const updated = products.map(p => {
        if (String(p.reference) === String(editing.reference)) {
          return { ...p, ...editDraft };
        }
        return p;
      });
      setProducts(updated);
      setMessage('✓ 商品已更新');
      setMessageType('success');
      setEditing(null);
      setEditDraft({});
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(`✗ 更新失败：${err.error || res.status}`);
      setMessageType('error');
    }
  };

  const handleDeleteBrand = async () => {
    if (!brandToDelete) return;
    const adminKey = sessionStorage.getItem('admin_key') || '';
    if (!adminKey) {
      setMessage('✗ 未找到管理员密钥，请重新登录。');
      setMessageType('error');
      onLogout();
      return;
    }

    const confirmed = window.confirm(`确认删除品牌 "${brandToDelete}" 的所有商品吗？此操作不可恢复。`);
    if (!confirmed) return;

    setIsDeletingBrand(true);
    try {
      const res = await fetch(`${API_URL}/api/brands/${encodeURIComponent(brandToDelete)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey,
        },
      });

      if (res.ok) {
        const result = await res.json();
        setProducts(prev =>
          prev.filter(p => {
            const brand = typeof p.marque === 'string' ? p.marque.trim() : '';
            return brand !== brandToDelete;
          })
        );
        setMessage(`✓ 已删除品牌 "${brandToDelete}" 的 ${result.removed} 条记录，当前总量 ${result.total}`);
        setMessageType('success');
        setStats(null);
        setBrandToDelete('');
      } else if (res.status === 401) {
        setMessage('✗ 管理员密钥无效，请重新登录。');
        setMessageType('error');
        sessionStorage.removeItem('admin_key');
        onLogout();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(`✗ 删除失败：${err.error || res.status}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`✗ 删除失败：${error.message || '网络错误'}`);
      setMessageType('error');
      console.error('Delete brand error:', error);
    } finally {
      setIsDeletingBrand(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">管理员后台</h1>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition"
            >
              <LogOut size={20} />
              退出登录
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6">上传商品数据</h2>

          <div className="space-y-4">
            <p className="text-gray-600">
              选择一个包含商品信息的 Excel 文件（.xlsx 或 .xls）。文件中应包含以下列：
              <span className="text-sm text-gray-500 block mt-2">
                produit, designation, reference, marque, prix_vente, Link, 等
              </span>
            </p>

            <label className="block">
              <div className="flex items-center justify-center w-full px-6 py-8 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition">
                <div className="text-center">
                  <Upload size={48} className="mx-auto text-blue-500 mb-2" />
                  <span className="text-lg font-semibold text-gray-700">
                    {isUploading ? '上传中...' : '点击选择文件或拖拽放入'}
                  </span>
                  <span className="text-sm text-gray-500 block mt-1">支持 .xlsx 和 .xls 格式</span>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            </label>

            {message && (
              <div
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  messageType === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <AlertCircle
                  size={20}
                  className={messageType === 'success' ? 'text-green-600' : 'text-red-600 flex-shrink-0 mt-0.5'}
                />
                <div className={messageType === 'success' ? 'text-green-700' : 'text-red-700'}>
                  <p className="whitespace-pre-line">{message}</p>
                  {messageType === 'error' && (
                    <p className="text-xs mt-2 text-gray-600">
                      提示：打开浏览器控制台（F12）查看详细错误信息
                    </p>
                  )}
                </div>
              </div>
            )}
            {stats && (
              <div className="text-sm text-gray-600">
                新增 {stats.inserted} · 跳过重复 {stats.duplicatesSkipped} · 服务器总量 {stats.total}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">提示</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 上传后的数据会自动保存到服务器</li>
            <li>• 如果服务器密钥验证失败，数据仍会保存到本地浏览器</li>
            <li>• 普通用户只能查询数据，看不到这个管理界面</li>
          </ul>
        </div>

        {/* Management list */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-4">
            <div>
            <h2 className="text-xl font-bold">商品管理</h2>
              <p className="text-sm text-gray-500 mt-1">支持搜索、单条编辑以及批量删除品牌</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索 reference / 名称 / 品牌"
              className="border rounded px-3 py-2"
            />
              <div className="flex items-center gap-2">
                <select
                  value={brandToDelete}
                  onChange={e => setBrandToDelete(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="">选择品牌批量删除</option>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
                <button
                  onClick={handleDeleteBrand}
                  disabled={!brandToDelete || isDeletingBrand}
                  className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-700 transition text-sm"
                >
                  {isDeletingBrand ? '删除中...' : '删除品牌'}
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Reference</th>
                  <th className="text-left p-2">名称</th>
                  <th className="text-left p-2">品牌</th>
                  <th className="text-left p-2">价格</th>
                  <th className="text-left p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{p.reference}</td>
                    <td className="p-2">{p.produit}</td>
                    <td className="p-2">{p.marque}</td>
                    <td className="p-2">{p.prix_vente}</td>
                    <td className="p-2">
                      <button
                        className="px-3 py-1 border rounded hover:bg-gray-100"
                        onClick={() => openEdit(p)}
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={5}>暂无数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl">
              <div className="border-b p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">编辑商品 · {editing.reference}</h3>
                <button className="px-3 py-1 border rounded" onClick={() => { setEditing(null); setEditDraft({}); }}>关闭</button>
              </div>
              <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                {Object.keys(editDraft).map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <label className="w-40 text-sm text-gray-600">{k}</label>
                    <input
                      className="flex-1 border rounded px-3 py-2"
                      value={editDraft[k] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditDraft((d) => ({ ...d, [k]: k === 'prix_vente' ? v : v }));
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="border-t p-4 flex items-center justify-end gap-3">
                <button className="px-3 py-2 border rounded" onClick={() => { setEditing(null); setEditDraft({}); }}>取消</button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={saveEdit}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
