import React, { useState, useMemo } from 'react';
import { Search, Upload, Package, Eye, X } from 'lucide-react';
import * as XLSX from 'xlsx';

// API 地址：从环境变量读取，本地开发默认 http://localhost:5000
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LuxuryProductSearch = () => {
  const [products, setProducts] = useState([]);
  const [adminKey, setAdminKey] = useState('');
  const [showAdminInput, setShowAdminInput] = useState(false);
  // pagination & sorting
  const [sortBy, setSortBy] = useState(''); // 'price_asc', 'price_desc', 'brand_asc', 'brand_desc'
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // load from localStorage on mount
  React.useEffect(() => {
    let mounted = true;
    // try server first
    fetch(`${API_URL}/api/products`)
      .then(res => {
        if (!res.ok) throw new Error('no server');
        return res.json();
      })
      .then(data => {
        if (mounted && Array.isArray(data)) setProducts(data);
      })
      .catch(() => {
        // fallback to localStorage
        try {
          const raw = localStorage.getItem('luxury_products');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && mounted) setProducts(parsed);
          }
        } catch (e) {
          console.warn('localStorage read failed', e);
        }
      });

    return () => { mounted = false; };
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      // Helper: normalize header strings (remove accents, spaces -> underscore, lowercase)
      const normalizeHeader = (h) => {
        if (!h && h !== 0) return '';
        const s = String(h);
        return s
          .normalize('NFD') // split accents
          .replace(/\p{Diacritic}/gu, '') // remove diacritics
          .replace(/\s+/g, '_')
          .replace(/[-/\\]+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase();
      };

      // Map common incoming headers to our internal field names
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

        // Attempt to parse prix_vente into a number when possible
        if (out.prix_vente !== undefined && out.prix_vente !== null && out.prix_vente !== '') {
          const str = String(out.prix_vente).trim();
          // remove currency symbols and keep dot for decimals
          const cleaned = str.replace(/[^0-9,.-]/g, '').replace(/,/g, '.');
          const num = parseFloat(cleaned);
          if (!Number.isNaN(num)) out.prix_vente = num;
        }

        return out;
      };

      const jsonData = raw.map(normalizeRow);

      setProducts(jsonData);
      // persist to localStorage
      try { localStorage.setItem('luxury_products', JSON.stringify(jsonData)); } catch (e) { console.warn('localStorage save failed', e); }

      // try to send to server (include admin key header if provided)
      const headers = { 'Content-Type': 'application/json' };
      if (adminKey) headers['x-admin-key'] = adminKey;

      fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(jsonData),
      }).then(res => {
        if (res.ok) {
          alert(`成功导入 ${jsonData.length} 个商品（已保存到服务器与本地）`);
        } else {
          alert(`导入成功 ${jsonData.length} 个商品（已保存到本地，未能保存到服务器）`);
        }
      }).catch(() => {
        alert(`导入成功 ${jsonData.length} 个商品（已保存到本地，服务器不可达）`);
      });
    } catch (error) {
      alert('文件导入失败，请确保文件格式正确');
      console.error(error);
    }
    setIsUploading(false);
    event.target.value = '';
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;

    const term = searchTerm.toLowerCase();
    return products.filter(product =>
      (product.produit?.toLowerCase().includes(term)) ||
      (String(product.reference || '').toLowerCase().includes(term)) ||
      (product.designation?.toLowerCase().includes(term)) ||
      (product.marque?.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  // apply sorting
  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    if (!sortBy) return arr;
    if (sortBy === 'price_asc') return arr.sort((a, b) => (Number(a.prix_vente || 0) - Number(b.prix_vente || 0)));
    if (sortBy === 'price_desc') return arr.sort((a, b) => (Number(b.prix_vente || 0) - Number(a.prix_vente || 0)));
    if (sortBy === 'brand_asc') return arr.sort((a, b) => String(a.marque || '').localeCompare(String(b.marque || '')));
    if (sortBy === 'brand_desc') return arr.sort((a, b) => String(b.marque || '').localeCompare(String(a.marque || '')));
    return arr;
  }, [filteredProducts, sortBy]);

  // pagination slice
  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  // total pages
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `€${Number(price).toLocaleString('fr-FR')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">奢侈品价格查询系统</h1>
            <div className="flex items-center gap-3">
              {showAdminInput ? (
                <label className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 cursor-pointer transition">
                  <Upload size={20} />
                  <span>{isUploading ? '导入中...' : '导入商品'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              ) : null}

              <button
                onClick={() => setShowAdminInput(s => !s)}
                className="px-3 py-2 border rounded text-sm"
                title="管理员模式：输入密钥后上传将尝试保存到服务器"
              >
                管理员
              </button>
            </div>
          </div>
        </div>
      </header>
      {showAdminInput && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Admin Key:</label>
            <input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} className="border rounded px-2 py-1" />
            <button onClick={() => { if (navigator.clipboard) { navigator.clipboard.writeText(adminKey); } }} className="px-2 py-1 border rounded text-sm">复制</button>
            <div className="text-sm text-gray-500">输入管理员密钥后，上传时会尝试写入服务器（生产请设置环境变量 ADMIN_KEY）。</div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索商品名称、识别码、品牌..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="mt-2 text-sm text-gray-600 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              共 {products.length} 个商品 {searchTerm && `· 找到 ${filteredProducts.length} 个结果`}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">排序:</label>
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }} className="border rounded px-2 py-1">
                <option value="">默认</option>
                <option value="price_asc">价格 从低到高</option>
                <option value="price_desc">价格 从高到低</option>
                <option value="brand_asc">品牌 A-Z</option>
                <option value="brand_desc">品牌 Z-A</option>
              </select>

              <label className="text-sm text-gray-600">每页:</label>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1">
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无商品数据</h3>
            <p className="text-gray-500">请点击右上角"导入商品"按钮上传 Excel 文件</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedProducts.map((product, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="aspect-square bg-gray-100 relative">
                  {product.Link ? (
                    <img
                      src={product.Link}
                      alt={product.produit || '商品图片'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <Package size={48} />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                    {product.produit || '未命名商品'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                    {product.marque || '品牌未知'}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-2xl font-bold text-black">
                      {formatPrice(product.prix_vente)}
                    </span>
                    <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-black">
                      <Eye size={16} />
                      查看详情
                    </button>
                  </div>
                  {product.reference && (
                    <p className="text-xs text-gray-500 mt-2">
                      识别码: {product.reference}
                    </p>
                  )}
                </div>
              </div>
              ))}
            </div>

            {/* pagination controls */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">首页</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
              <span className="px-3 py-1">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">下一页</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">末页</button>
            </div>
          </div>
        )}

        {products.length > 0 && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <Search size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">未找到相关商品</h3>
            <p className="text-gray-500">请尝试其他搜索词</p>
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">商品详情</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                  {selectedProduct.Link ? (
                    <img
                      src={selectedProduct.Link}
                      alt={selectedProduct.produit}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <Package size={80} />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-2">{selectedProduct.produit}</h3>
                  <p className="text-3xl font-bold text-black mb-6">
                    {formatPrice(selectedProduct.prix_vente)}
                  </p>

                  <div className="space-y-3 text-sm">
                    {selectedProduct.marque && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">品牌:</span>
                        <span>{selectedProduct.marque}</span>
                      </div>
                    )}
                    {selectedProduct.reference && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">识别码:</span>
                        <span>{selectedProduct.reference}</span>
                      </div>
                    )}
                    {selectedProduct.designation && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">型号:</span>
                        <span>{selectedProduct.designation}</span>
                      </div>
                    )}
                    {selectedProduct.couleur && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">颜色:</span>
                        <span>{selectedProduct.couleur}</span>
                      </div>
                    )}
                    {selectedProduct.taille && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">尺寸:</span>
                        <span>{selectedProduct.taille}</span>
                      </div>
                    )}
                    {selectedProduct.dimension && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">尺寸规格:</span>
                        <span>{selectedProduct.dimension}</span>
                      </div>
                    )}
                    {selectedProduct.matiere && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">材质:</span>
                        <span>{selectedProduct.matiere}</span>
                      </div>
                    )}
                    {selectedProduct.motif && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">图案:</span>
                        <span>{selectedProduct.motif}</span>
                      </div>
                    )}
                    {selectedProduct.Rayon && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">部门:</span>
                        <span>{selectedProduct.Rayon}</span>
                      </div>
                    )}
                    {selectedProduct.Famille && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">系列:</span>
                        <span>{selectedProduct.Famille}</span>
                      </div>
                    )}
                    {selectedProduct.sousfamille && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">子系列:</span>
                        <span>{selectedProduct.sousfamille}</span>
                      </div>
                    )}
                    {selectedProduct.production_pays && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">产地:</span>
                        <span>{selectedProduct.production_pays}</span>
                      </div>
                    )}
                    {selectedProduct.poids && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">重量:</span>
                        <span>{selectedProduct.poids}</span>
                      </div>
                    )}
                    {selectedProduct.lien_externe && (
                      <div className="flex border-b pb-2">
                        <span className="font-semibold w-32">外部链接:</span>
                        <a
                          href={selectedProduct.lien_externe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          查看详情
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LuxuryProductSearch;
