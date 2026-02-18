import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Search, Package, X, Menu, SlidersHorizontal, ChevronRight } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { Eye } from 'lucide-react';

// API 地址：从环境变量读取，本地开发默认 http://localhost:5000
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CATEGORY_LABELS = {
  ALL: '全部品牌',
  BAGS: '包袋',
  RTW: '成衣',
  SHOES: '鞋履',
  JEWELRY: '珠宝',
  ACCESSORIES: '配饰',
  COLLECTION_MIUMIU: 'Miu Miu 系列',
};

// 品牌更新日期配置
const BRAND_UPDATE_DATES = {
  'Dior': '2026年2月2日',
  'LV': '2026年2月2日', 
  'Loewe': '2026年2月2日',
  'Ysl': '2026年2月10日',
  'Miumiu': '2026年2月2日',
  'Gucci': '2026年2月2日',
  'Prada': '2026年2月2日',
  'Margiela': '2026年2月2日',
  'Burberry': '2026年2月2日',
  'Acne Studios': '2026年2月2日',
  'Max Mara': '2026年2月10日',
  'Celine': '2026年2月2日',
  'Fendi': '2026年2月2日',
  'Moncler': '2026年2月10日',
  'Fred': '2026年2月10日',
  'Qeelin': '2026年2月10日',
};

const LuxuryProductSearch = ({ onReturnToWelcome }) => {
  const [products, setProducts] = useState([]);
  // pagination & sorting
  const [sortBy, setSortBy] = useState(''); // 'price_asc', 'price_desc', 'brand_asc', 'brand_desc'
  // eslint-disable-next-line no-unused-vars
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [groupByBrand, setGroupByBrand] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const categoryCacheRef = useRef(new WeakMap());
  // 删除以下两行：
  // const imageIndexRef = useRef(new Map());
  // const autoRotateTimersRef = useRef(new Map());

  React.useEffect(() => {
    categoryCacheRef.current = new WeakMap();
  }, [products]);

  // 重置所有筛选条件
  const resetFilters = useCallback(() => {
    setSelectedCategory('ALL');
    setSelectedBrand('ALL');
    setSelectedGender('ALL');
    setSortBy('');
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  // 获取品牌更新日期
  const getBrandUpdateDate = useCallback((brand) => {
    return BRAND_UPDATE_DATES[brand] || '2026年2月2日';
  }, []);

  const inferCategory = useCallback((product) => {
    const hay = [
      product?.produit,
      product?.designation,
      product?.Rayon,
      product?.Famille,
      product?.sousfamille,
    ]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase())
      .join(' ');

    const has = (patterns) => patterns.some((p) => hay.includes(p));

    // 分类检测规则表
    const rules = [
      { patterns: ['coque', 'iphone', 'phone case', 'case', '手机壳'], category: 'ACCESSORIES' },
      { patterns: ['sac', 'bag', 'handbag', 'slingbag', 'backpack', 'crossbody', 'pochette', 'clutch', 'wallet', 'tote', 'pouch', '包', '手袋', '钱包', '背包', '斜挎', '单肩', '双肩'], category: 'BAGS' },
      { patterns: ['montre', 'watch', '腕表', '手表'], category: 'WATCHES' },
      { patterns: ['bague', 'bracelet', 'collier', 'boucle', 'earring', 'necklace', 'ring', 'jewel', '珠宝', '首饰', '项链', '手链', '戒', '耳环'], category: 'JEWELRY' },
      { patterns: ['robe', 'dress', 'jupe', 'skirt', 'chemise', 'shirt', 't-shirt', 'veste', 'jacket', 'manteau', 'coat', 'pantalon', 'pants', 'jeans', 'pull', 'sweater', 'cardigan', '连衣裙', '裙', '半裙', '上衣', '衬衫', '外套', '大衣', '裤'], category: 'RTW' },
      { patterns: ['shoe', 'sneaker', 'boot', 'sandale', 'loafer', 'mocassin', 'escarpin', 'mule', '鞋', '靴', '凉鞋', '高跟'], category: 'SHOES' },
      { patterns: ['parfum', 'fragrance', 'eau de', 'beauty', 'makeup', 'lipstick', 'soin', 'crème', '香水', '口红', '护肤', '彩妆'], category: 'BEAUTY' },
      { patterns: ['ceinture', 'belt', 'foulard', 'scarf', 'lunettes', 'sunglasses', 'chapeau', 'hat', 'gant', 'glove', '围巾', '腰带', '皮带', '墨镜', '帽', '手套'], category: 'ACCESSORIES' },
    ];

    for (const rule of rules) {
      if (has(rule.patterns)) return rule.category;
    }

    return 'ACCESSORIES';
  }, []);

  // 将规范化后的Famille字段值映射到分类代码
  const mapFamilleToCategory = useCallback((famille) => {
    if (!famille || typeof famille !== 'string') return null;
    
    const familleLower = famille.toLowerCase().trim();
    
    // Collection Miu Miu 系列
    if (familleLower === 'collection_miumiu') {
      return 'COLLECTION_MIUMIU';
    }
    
    // 包袋类
    if (familleLower === 'sacs') {
      return 'BAGS';
    }
    
    // 成衣类
    if (familleLower === 'vêtements') {
      return 'RTW';
    }
    
    // 鞋履类
    if (familleLower === 'chaussures') {
      return 'SHOES';
    }
    
    // 珠宝类
    if (familleLower === 'bijoux') {
      return 'JEWELRY';
    }
    
    // 配饰类
    if (familleLower === 'accessoires') {
      return 'ACCESSORIES';
    }
    
    return null;
  }, []);

  const getCategory = useCallback((product) => {
    const cache = categoryCacheRef.current;
    const hit = cache.get(product);
    if (hit) return hit;
    
    // 优先使用规范化后的Famille字段进行分类
    const familleCategory = mapFamilleToCategory(product?.Famille);
    if (familleCategory) {
      cache.set(product, familleCategory);
      return familleCategory;
    }
    
    // 如果Famille字段无法映射，则使用inferCategory作为后备
    const computed = inferCategory(product);
    cache.set(product, computed);
    return computed;
  }, [inferCategory, mapFamilleToCategory]);

  const parseSizes = (value) => {
    if (!value && value !== 0) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => (item === null || item === undefined ? '' : String(item)))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return String(value)
      .split(/[\s,，;/\\|]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  // eslint-disable-next-line no-unused-vars
  const renderSizeBadges = (sizes, maxVisible = 6) => {
    if (!sizes || sizes.length === 0) return null;
    const visible = sizes.slice(0, maxVisible);
    const remaining = sizes.length - visible.length;
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {visible.map((size) => (
          <span
            key={size}
            className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
          >
            {size}
          </span>
        ))}
        {remaining > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
            +{remaining}
          </span>
        )}
      </div>
    );
  };

  const selectedSizes = selectedProduct ? parseSizes(selectedProduct.taille) : [];

  // load from localStorage on mount
  React.useEffect(() => {
    let mounted = true;

    // 數據版本號 - 修改此版本號會清除舊緩存
    const DATA_VERSION = '2026-02-18-v2';
    
    // 檢查版本，如果不匹配則清除舊緩存
    const cachedVersion = localStorage.getItem('luxury_products_version');
    if (cachedVersion !== DATA_VERSION) {
      console.log('清除舊版本緩存...');
      localStorage.removeItem('luxury_products');
      localStorage.setItem('luxury_products_version', DATA_VERSION);
    }

    // 1) 嘗試先從 localStorage 顯示舊數據（即時呈現）
    try {
      const raw = localStorage.getItem('luxury_products');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && mounted) setProducts(parsed);
      }
    } catch (e) {
      console.warn('localStorage read failed', e);
    }

    // 2) 後台從 API 拉取最新數據（slim=true 精簡字段）
    fetch(`${API_URL}/api/products?slim=true`)
      .then(res => {
        if (!res.ok) throw new Error('no server');
        return res.json();
      })
      .then(data => {
        if (mounted && Array.isArray(data)) {
          setProducts(data);
          // 存入 localStorage 供下次快速顯示
          try {
            localStorage.setItem('luxury_products', JSON.stringify(data));
            localStorage.setItem('luxury_products_version', DATA_VERSION);
          } catch (e) {
            console.warn('localStorage write failed', e);
          }
        }
      })
      .catch((err) => {
        console.warn('API fetch failed, using localStorage data', err);
      });

    return () => { mounted = false; };
  }, []);

  const availableBrands = useMemo(() => {
    const set = new Set();
    products.forEach((item) => {
      const brand = typeof item.marque === 'string' ? item.marque.trim() : '';
      if (brand) set.add(brand);
    });
    return ['ALL', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const availableCategories = useMemo(() => {
    const counts = new Map();
    products.forEach((p) => {
      const c = getCategory(p);
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    const order = ['COLLECTION_MIUMIU', 'BAGS', 'RTW', 'SHOES', 'JEWELRY', 'ACCESSORIES'];
    const list = order.filter((c) => (counts.get(c) || 0) > 0);
    return ['ALL', ...list];
  }, [products, getCategory]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const brand = typeof product.marque === 'string' ? product.marque.trim() : '';
      if (selectedBrand !== 'ALL' && brand !== selectedBrand) {
        return false;
      }

      if (selectedCategory !== 'ALL' && getCategory(product) !== selectedCategory) {
        return false;
      }

      if (selectedGender !== 'ALL') {
        const rayon = typeof product.Rayon === 'string' ? product.Rayon.trim() : '';
        if (rayon !== selectedGender) {
          return false;
        }
      }

      if (!term) return true;

      const fields = [
        product.produit,
        product.reference,
        product.designation,
        product.marque,
      ];

      return fields.some((field) => {
        if (!field) return false;
        return String(field).toLowerCase().includes(term);
      });
    });
  }, [products, searchTerm, selectedBrand, selectedCategory, selectedGender, getCategory]);

  // apply sorting
  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    if (!sortBy) return arr;
    
    // Helper to get numeric price, treating non-numeric strings as highest value (for "prix sur demande")
    const getNumericPrice = (priceValue) => {
      if (!priceValue && priceValue !== 0) return 0;
      const num = Number(priceValue);
      return isNaN(num) ? Infinity : num; // "prix sur demande" becomes Infinity, sorts to end
    };
    
    if (sortBy === 'price_asc') return arr.sort((a, b) => getNumericPrice(a.prix_vente) - getNumericPrice(b.prix_vente));
    if (sortBy === 'price_desc') return arr.sort((a, b) => getNumericPrice(b.prix_vente) - getNumericPrice(a.prix_vente));
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
    // Si le prix est une chaîne de texte (comme "Prix sur demande"), l'afficher directement
    if (typeof price === 'string') return price;
    // Si le prix est 0 ou n'existe pas
    if (!price || price === 0) return 'Prix sur demande';
    return `${Number(price).toLocaleString('fr-FR')}€`;
  };

  const productGridClassName = useMemo(() => {
    const base = 'grid gap-6';
    if (Number(pageSize) >= 24) {
      return `${base} grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`;
    }
    return `${base} grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4`;
  }, [pageSize]);

  const getProductImageUrl = (item) => {
    if (!item) return '';
    const candidates = [
      item.img_url,        // 图片链接
      item.image_url,
      item.image,
      item.photo,
    ];
    return candidates.find((url) => typeof url === 'string' && url.trim()) || '';
  };

  // 解析商品的所有图片URL（逗号分隔，但需跳过URL内部的逗号参数）
  const getProductImageUrls = (item) => {
    if (!item) return [];
    const candidates = [
      item.img_url,
      item.image_url,
      item.image,
      item.photo,
    ];
    const raw = candidates.find((url) => typeof url === 'string' && url.trim()) || '';
    if (!raw) return [];
    // 以「逗號後緊接 http」作為 URL 邊界分割，避免切斷 URL 內部的逗號參數
    return raw.split(/,(?=https?:\/\/)/).map(url => url.trim()).filter(url => url);
  };

  // 产品卡片组件
  const ProductCard = ({ product, index, keyPrefix = '' }) => {
    const imageUrls = getProductImageUrls(product);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const hasMultipleImages = imageUrls.length > 1;

    // 自动轮播
    React.useEffect(() => {
      if (!hasMultipleImages) return;

      const timer = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % imageUrls.length);
      }, 3000); // 每3秒切换一次

      return () => clearInterval(timer);
    }, [hasMultipleImages, imageUrls.length]);

    // 手动切换图片
    const handleImageNav = (e, direction) => {
      e.stopPropagation();
      if (direction === 'next') {
        setCurrentImageIndex(prev => (prev + 1) % imageUrls.length);
      } else {
        setCurrentImageIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length);
      }
    };

    const currentImageUrl = imageUrls[currentImageIndex] || null;

    return (
      <div
        key={keyPrefix ? `${keyPrefix}-${index}` : index}
        className="group lux-tile cursor-pointer"
        onClick={() => setSelectedProduct(product)}
      >
        {/* Image Container */}
        <div className="aspect-[4/5] relative overflow-hidden lux-product-image">
          {currentImageUrl ? (
            <>
              <img
                src={currentImageUrl}
                alt={product.produit || '商品图片'}
                loading="lazy"
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              
              {/* 多图片指示器 */}
              {hasMultipleImages && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
                  {imageUrls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentImageIndex
                          ? 'bg-white w-4'
                          : 'bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`查看图片 ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
              
              {/* 左右切换按钮（hover显示） */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={(e) => handleImageNav(e, 'prev')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                    aria-label="上一张图片"
                  >
                    <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleImageNav(e, 'next')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                    aria-label="下一张图片"
                  >
                    <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <Package size={56} className="text-gray-300" strokeWidth={0.8} />
            </div>
          )}
          
          {/* Luxury overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
        </div>

        {/* Info Container */}
        <div className="lux-product-content">
          <div className="mb-3">
            <p className="text-xs tracking-[0.2em] uppercase font-light mb-3" style={{color: 'var(--color-muted)'}}>
              {product.marque || 'Brand'}
            </p>
            <h3 className="font-luxury text-lg leading-tight mb-4 group-hover:text-yellow-700 transition-colors duration-500" style={{color: 'var(--color-charcoal)', lineHeight: '1.4'}}>
              {product.produit || '未命名商品'}
            </h3>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-luxury text-xl tracking-wider" style={{color: 'var(--color-charcoal)', fontWeight: '300'}}>
              {formatPrice(product.prix_vente)}
            </span>
            <div className="flex items-center gap-2 text-xs tracking-[0.15em] uppercase font-light group-hover:translate-x-1 transition-transform duration-300" style={{color: 'var(--color-muted)'}}>
              <span>Discover</span>
              <svg className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity duration-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen lux-texture">
      {/* Dynamic Luxury Background */}
      <div className="luxury-dynamic-bg">
        {/* Floating elements */}
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        
        {/* Golden particles */}
        <div className="golden-particles">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
        
        {/* Subtle wave */}
        <div className="luxury-wave"></div>
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-lg border-b" style={{background: 'rgba(255, 255, 255, 0.85)', borderColor: 'rgba(212, 175, 55, 0.2)'}}>
        <div className="w-full px-6 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
          <button
            type="button"
            className="lux-button-text"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} strokeWidth={1} />
            <span className="hidden sm:inline font-light">Menu</span>
          </button>

          <div className="absolute left-1/2 -translate-x-1/2">
            <button
              type="button"
              className="font-luxury text-2xl sm:text-3xl tracking-[0.2em] transition-all duration-500 hover:scale-105"
              onClick={onReturnToWelcome}
              style={{color: 'var(--color-charcoal)', fontWeight: '200', textShadow: '0 1px 2px rgba(0,0,0,0.1)'}}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--color-accent)';
                e.target.style.textShadow = '0 2px 8px rgba(212, 175, 55, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--color-charcoal)';
                e.target.style.textShadow = '0 1px 2px rgba(0,0,0,0.1)';
              }}
            >
              FEEL DE LUXE
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-3 rounded-full transition-all duration-300 hover:bg-white/50"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
              style={{color: 'var(--color-muted)'}}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--color-accent)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--color-muted)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <Search size={20} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="lux-button-text ml-2"
              onClick={() => setFilterOpen(true)}
            >
              <span className="hidden sm:inline font-light">Filter</span>
              <SlidersHorizontal size={18} strokeWidth={1} />
            </button>
          </div>
        </div>
      </header>

      <div className="lux-container py-8">
        {searchOpen && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 h-12 rounded-full border border-ink-300 bg-white/80 backdrop-blur focus:ring-2 focus:ring-black focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 text-xs tracking-[0.15em] uppercase text-ink-600">
            <span>{CATEGORY_LABELS[selectedCategory] || '全部品牌'}</span>
            <span className="text-ink-400">/</span>
            <span>{selectedBrand === 'ALL' ? '全部品牌' : selectedBrand}</span>
          </div>
          <div className="text-xs tracking-[0.15em] uppercase text-ink-600">
            <span>总商品数 {filteredProducts.length}</span>
          </div>

          {selectedBrand !== 'ALL' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs tracking-[0.1em] text-amber-900">
                💡 {selectedBrand} 价格更新时间：{getBrandUpdateDate(selectedBrand)}
              </p>
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="lux-card p-10 text-center">
            <h3 className="text-2xl font-medium text-ink-900">商品数据加載中...</h3>
          </div>
        ) : groupByBrand ? (
          <div className="space-y-10">
            {groupedByBrand.map(([brand, items]) => (
              <section key={brand}>
                <div className="flex items-end justify-between gap-6 mb-4">
                  <h2 className="text-2xl font-medium text-ink-900">{brand}</h2>
                  <p className="text-xs tracking-[0.25em] uppercase text-ink-500">{items.length} items</p>
                </div>
                <div className={productGridClassName}>
                  {items.map((product, index) => (
                    <ProductCard product={product} index={index} keyPrefix={brand} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div>
            <div className={productGridClassName}>
              {pagedProducts.map((product, index) => (
                <ProductCard product={product} index={index} />
              ))}
            </div>

            {/* pagination controls */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="lux-button-ghost disabled:opacity-50" type="button">首页</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="lux-button-ghost disabled:opacity-50" type="button">上一页</button>
              <span className="px-3 py-1 text-sm text-ink-600">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="lux-button-ghost disabled:opacity-50" type="button">下一页</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="lux-button-ghost disabled:opacity-50" type="button">末页</button>
            </div>
          </div>
        )}

        {products.length > 0 && filteredProducts.length === 0 && (
          <div className="lux-card p-10 text-center">
            <Search size={56} className="mx-auto text-ink-300 mb-4" />
            <h3 className="text-2xl font-medium text-ink-900">未找到相关商品</h3>
            <p className="mt-2 text-sm text-ink-600">请尝试更具体的关键词（品牌 + 品类/参考号）。</p>
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl">
            {/* Close button - elevated z-index */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 z-30 w-10 h-10 rounded-full bg-white border border-ink-200 flex items-center justify-center text-ink-600 hover:text-ink-900 hover:border-ink-400 transition-all duration-200 shadow-sm"
              type="button"
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.5} />
            </button>

            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="aspect-square rounded-xl overflow-hidden relative bg-ink-50 z-0">
                  {getProductImageUrl(selectedProduct) ? (
                    <img
                      src={getProductImageUrl(selectedProduct)}
                      alt={selectedProduct.produit}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package size={64} className="text-ink-200" strokeWidth={1} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-2">
                    {selectedProduct.marque || 'Brand'}
                  </p>
                  <h3 className="font-luxury text-2xl sm:text-3xl text-ink-900 mb-4 leading-tight">{selectedProduct.produit}</h3>
                  <p className="font-luxury text-2xl text-ink-900 mb-8">
                    {formatPrice(selectedProduct.prix_vente)}
                  </p>

                  <div className="space-y-3 text-sm text-ink-800">
                    {selectedProduct.marque && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">品牌</span>
                        <span>{selectedProduct.marque}</span>
                      </div>
                    )}
                    {selectedProduct.reference && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">型号</span>
                        <span>{selectedProduct.reference}</span>
                      </div>
                    )}
                    {selectedProduct.designation && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">描述</span>
                        <span>{selectedProduct.designation}</span>
                      </div>
                    )}
                    {selectedProduct.couleur && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">颜色</span>
                        <span>{selectedProduct.couleur}</span>
                      </div>
                    )}
                    {selectedSizes.length > 0 && (
                      <div className="border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 block mb-2">尺寸</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedSizes.map((size) => (
                            <span
                              key={size}
                              className="px-3 py-1 text-xs font-medium text-ink-700 rounded-full border border-ink-200"
                            >
                              {size}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedSizes.length === 0 && selectedProduct.taille && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">尺寸</span>
                        <span>{selectedProduct.taille}</span>
                      </div>
                    )}
                    {selectedProduct.dimension && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">规格</span>
                        <span>{selectedProduct.dimension}</span>
                      </div>
                    )}
                    {selectedProduct.matiere && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">材质</span>
                        <span>{selectedProduct.matiere}</span>
                      </div>
                    )}
                    {selectedProduct.motif && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">图案</span>
                        <span>{selectedProduct.motif}</span>
                      </div>
                    )}
                    {selectedProduct.Rayon && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">性别</span>
                        <span>{selectedProduct.Rayon}</span>
                      </div>
                    )}
                    {selectedProduct.Famille && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">品类</span>
                        <span>{selectedProduct.Famille}</span>
                      </div>
                    )}
                    {selectedProduct.lien_externe && (
                      <div className="flex border-b border-ink-200 pb-3">
                        <span className="text-xs tracking-[0.2em] uppercase text-ink-500 w-32">链接</span>
                        <a
                          href={selectedProduct.lien_externe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-900 hover:underline"
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

      {/* Menu drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[min(400px,90vw)] bg-white shadow-2xl">
            <div className="p-6 border-b border-ink-100 flex items-center justify-between">
              <div>
                <button
                  type="button"
                  className="font-luxury text-xl tracking-[0.15em] text-ink-900 hover:text-gold-600 transition-colors"
                  onClick={() => {
                    onReturnToWelcome();
                    setMenuOpen(false);
                  }}
                >
                  FEEL DE LUXE
                </button>
              </div>
              <button 
                type="button" 
                className="w-10 h-10 rounded-full flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-ink-50 transition-all"
                onClick={() => setMenuOpen(false)}
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-4">种类</p>
              <div className="space-y-2">
                {availableCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(c);
                      setCurrentPage(1);
                      setMenuOpen(false);
                    }}
                    className={selectedCategory === c ? 'lux-category-active' : 'lux-category-default'}
                  >
                    <span className="text-sm">{CATEGORY_LABELS[c] || c}</span>
                    <ChevronRight size={18} strokeWidth={1.5} />
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-ink-100">
                <button
                  type="button"
                  className="w-full py-3 text-xs tracking-[0.2em] uppercase text-ink-500 hover:text-ink-900 transition-colors"
                  onClick={() => {
                    resetFilters();
                    setMenuOpen(false);
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter drawer */}
      {filterOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[min(480px,90vw)] bg-white shadow-2xl">
            <div className="p-6 border-b border-ink-100 flex items-center justify-between">
              <div>
                <p className="font-luxury text-xl tracking-[0.1em] text-ink-900">筛选器</p>
              </div>
              <button 
                type="button" 
                className="w-10 h-10 rounded-full flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-ink-50 transition-all"
                onClick={() => setFilterOpen(false)}
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto h-[calc(100%-80px)]">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-4">商品分类</p>
                <div className="space-y-2">
                  {availableCategories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c);
                        setCurrentPage(1);
                      }}
                      className={selectedCategory === c ? 'lux-category-active' : 'lux-category-default'}
                    >
                      <span className="text-sm">{CATEGORY_LABELS[c] || c}</span>
                      <ChevronRight size={18} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-4">品牌</p>
                <div className="flex flex-wrap gap-2">
                  {availableBrands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => {
                        setSelectedBrand(brand);
                        setCurrentPage(1);
                      }}
                      type="button"
                      className={selectedBrand === brand ? 'lux-pill-active' : 'lux-pill-default'}
                    >
                      {brand === 'ALL' ? '所有品牌' : brand}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-4">性别</p>
                <div className="flex flex-wrap gap-2">
                  {['ALL', '女士', '男士'].map((gender) => (
                    <button
                      key={gender}
                      onClick={() => {
                        setSelectedGender(gender);
                        setCurrentPage(1);
                      }}
                      type="button"
                      className={selectedGender === gender ? 'lux-pill-active' : 'lux-pill-default'}
                    >
                      {gender === 'ALL' ? '全部' : gender}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-4">排序</p>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 w-full rounded-full border border-ink-200 bg-white px-5 text-sm text-ink-800 focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                >
                  <option value="">预设</option>
                  <option value="price_asc">价格：低到高</option>
                  <option value="price_desc">价格：高到低</option>
                  <option value="brand_asc">品牌：A-Z</option>
                  <option value="brand_desc">品牌：Z-A</option>
                </select>
              </div>

              <div className="pt-4 border-t border-ink-100">
                <button
                  type="button"
                  className="w-full py-3 text-xs tracking-[0.2em] uppercase text-ink-500 hover:text-ink-900 transition-colors"
                  onClick={resetFilters}
                >
                  重置所有筛选
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LuxuryProductSearch;
