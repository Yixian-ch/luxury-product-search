import React, { useState, useMemo } from 'react';
import { Search, Package, Eye, X } from 'lucide-react';

// API 地址：从环境变量读取，本地开发默认 http://localhost:5000
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LuxuryProductSearch = () => {
  const [products, setProducts] = useState([]);
  // pagination & sorting
  const [sortBy, setSortBy] = useState(''); // 'price_asc', 'price_desc', 'brand_asc', 'brand_desc'
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [groupByBrand, setGroupByBrand] = useState(false);

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

  // group by brand (marque)
  const groupedByBrand = useMemo(() => {
    const groups = new Map();
    const source = [...sortedProducts];
    source.forEach((p) => {
      const brand = (p.marque && String(p.marque).trim()) || '未分类品牌';
      if (!groups.has(brand)) groups.set(brand, []);
      groups.get(brand).push(p);
    });
    // sort groups alphabetically by brand name
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sortedProducts]);

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
          </div>
        </div>
      </header>

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
              <button
                onClick={() => setGroupByBrand(v => !v)}
                className={`px-3 py-1 border rounded ${groupByBrand ? 'bg-black text-white' : ''}`}
                title="按品牌分组显示"
              >
                {groupByBrand ? '分组：按品牌（已启用）' : '分组：按品牌'}
              </button>
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
        ) : groupByBrand ? (
          <div className="space-y-10">
            {groupedByBrand.map(([brand, items]) => (
              <section key={brand}>
                <h2 className="text-xl font-bold mb-4">{brand}（{items.length}）</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((product, index) => (
                    <div
                      key={`${brand}-${index}`}
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
                        {product.lien_externe && (
                          <a
                            href={product.lien_externe}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            前往商品链接
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
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
                      loading="lazy"
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
                  {product.Link && (
                    <a
                      href={product.Link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      前往商品链接
                    </a>
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
                      loading="lazy"
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
