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
          const nk = normalizeHeader(k);
          const mapped = headerMap[nk] || nk;
          out[mapped] = row[k];
        });

        // Parse price
        if (out.prix_vente !== undefined && out.prix_vente !== null && out.prix_vente !== '') {
          const str = String(out.prix_vente).trim();
          const cleaned = str.replace(/[^0-9,.-]/g, '').replace(/,/g, '.');
          const num = parseFloat(cleaned);
          if (!Number.isNaN(num)) out.prix_vente = num;
        }

        return out;
      };

      const jsonData = raw.map(normalizeRow);

      // Pre-check: every item must have non-empty reference
      const missing = [];
      jsonData.forEach((item, idx) => {
        const ref = typeof item.reference === 'string' ? item.reference.trim() : '';
        if (!ref) missing.push(idx + 1); // human-friendly row index
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
        setMessage('✗ 服务器返回错误，请检查后端。');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('✗ 文件导入失败，请确保文件格式正确。');
      setMessageType('error');
      console.error(error);
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
                  className={messageType === 'success' ? 'text-green-600' : 'text-red-600'}
                />
                <p className={messageType === 'success' ? 'text-green-700' : 'text-red-700'}>
                  {message}
                </p>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">商品管理</h2>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索 reference / 名称 / 品牌"
              className="border rounded px-3 py-2"
            />
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
