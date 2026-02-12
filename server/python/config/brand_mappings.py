# -*- coding: utf-8 -*-
"""
品牌映射配置模塊
包含品牌官網映射、品牌別名、商品分類標準化、商品類型關鍵詞等配置
"""

# ============ 品牌到官網域名的映射 ============
BRAND_WEBSITE_MAP = {
    'dior': 'dior.com',
    'gucci': 'gucci.com',
    'prada': 'prada.com',
    'burberry': 'burberry.com',
    'fendi': 'fendi.com',
    'celine': 'celine.com',
    'loewe': 'loewe.com',
    'maxmara': 'maxmara.com',
    'moncler': 'moncler.com',
    'ysl': 'ysl.com',
    'saint laurent': 'ysl.com',
    'miumiu': 'miumiu.com',
    'margiela': 'maisonmargiela.com',
    'acne': 'acnestudios.com',
    'qeelin': 'qeelin.com',
    'fred': 'fred.com',
    'chanel': 'chanel.com',
    'hermes': 'hermes.com',
    'louis vuitton': 'louisvuitton.com',
    'lv': 'louisvuitton.com',
    'cartier': 'cartier.com',
    'tiffany': 'tiffany.com',
    'bulgari': 'bulgari.com',
    'bvlgari': 'bulgari.com',
    'versace': 'versace.com',
    'valentino': 'valentino.com',
    'balenciaga': 'balenciaga.com',
    'bottega veneta': 'bottegaveneta.com',
    'givenchy': 'givenchy.com',
    'alexander mcqueen': 'alexandermcqueen.com',
    'chloe': 'chloe.com',
    'ferragamo': 'ferragamo.com',
    'armani': 'armani.com',
    'dolce gabbana': 'dolcegabbana.com',
    'coach': 'coach.com',
    'michael kors': 'michaelkors.com',
    'kate spade': 'katespade.com',
    'tod': 'tods.com',
    'roger vivier': 'rogervivier.com',
    'jimmy choo': 'jimmychoo.com',
    'christian louboutin': 'christianlouboutin.com',
    'omega': 'omegawatches.com',
    'rolex': 'rolex.com',
    'patek philippe': 'patek.com',
    'van cleef': 'vancleefarpels.com',
}


# ============ 品牌別名映射（中文、常見拼寫錯誤、簡寫等 -> 標準英文名）============
BRAND_ALIASES = {
    # 迪奧
    '迪奥': 'dior',
    'christian dior': 'dior',
    '克里斯汀迪奥': 'dior',
    # 古馳
    '古驰': 'gucci',
    '古琦': 'gucci',
    '古奇': 'gucci',
    # 普拉達
    '普拉达': 'prada',
    '普拉達': 'prada',
    # 愛馬仕
    '爱马仕': 'hermes',
    '愛馬仕': 'hermes',
    '艾尔梅斯': 'hermes',
    # 香奈兒
    '香奈儿': 'chanel',
    '香奈兒': 'chanel',
    '夏奈尔': 'chanel',
    # 聖羅蘭
    '圣罗兰': 'saint laurent',
    '聖羅蘭': 'saint laurent',
    'ysl': 'saint laurent',
    '伊夫圣罗兰': 'saint laurent',
    # 路易威登
    '路易威登': 'louis vuitton',
    '路易維登': 'louis vuitton',
    'lv': 'louis vuitton',
    '威登': 'louis vuitton',
    # 巴寶莉
    '巴宝莉': 'burberry',
    '巴寶莉': 'burberry',
    '博柏利': 'burberry',
    # 芬迪
    '芬迪': 'fendi',
    '芬蒂': 'fendi',
    # 賽琳
    '赛琳': 'celine',
    '塞琳': 'celine',
    '思琳': 'celine',
    'céline': 'celine',
    # 羅意威
    '罗意威': 'loewe',
    '羅意威': 'loewe',
    '罗威': 'loewe',
    # 麥絲瑪拉
    '麦丝玛拉': 'maxmara',
    '麥絲瑪拉': 'maxmara',
    'max mara': 'maxmara',
    # 盟可睞
    '盟可睐': 'moncler',
    '蒙口': 'moncler',
    '蒙克莱': 'moncler',
    # 繆繆
    '缪缪': 'miumiu',
    '繆繆': 'miumiu',
    'miu miu': 'miumiu',
    # 馬吉拉
    '马吉拉': 'margiela',
    '馬吉拉': 'margiela',
    'maison margiela': 'margiela',
    'mm6': 'margiela',
    # 卡地亞
    '卡地亚': 'cartier',
    '卡地亞': 'cartier',
    # 蒂芙尼
    '蒂芙尼': 'tiffany',
    '蒂凡尼': 'tiffany',
    'tiffany co': 'tiffany',
    # 寶格麗
    '宝格丽': 'bulgari',
    '寶格麗': 'bulgari',
    'bvlgari': 'bulgari',
    # 范思哲
    '范思哲': 'versace',
    '範思哲': 'versace',
    '凡赛斯': 'versace',
    # 華倫天奴
    '华伦天奴': 'valentino',
    '華倫天奴': 'valentino',
    # 巴黎世家
    '巴黎世家': 'balenciaga',
    # 葆蝶家
    '葆蝶家': 'bottega veneta',
    'bv': 'bottega veneta',
    '宝缇嘉': 'bottega veneta',
    # 紀梵希
    '纪梵希': 'givenchy',
    '紀梵希': 'givenchy',
    # 亞歷山大麥昆
    '亚历山大麦昆': 'alexander mcqueen',
    '麦昆': 'alexander mcqueen',
    'mcqueen': 'alexander mcqueen',
    # 蔻依
    '蔻依': 'chloe',
    '珂洛艾伊': 'chloe',
    'chloé': 'chloe',
    # 菲拉格慕
    '菲拉格慕': 'ferragamo',
    '菲拉格默': 'ferragamo',
    'salvatore ferragamo': 'ferragamo',
    # 阿瑪尼
    '阿玛尼': 'armani',
    '亞曼尼': 'armani',
    'giorgio armani': 'armani',
    # 杜嘉班納
    '杜嘉班纳': 'dolce gabbana',
    'dg': 'dolce gabbana',
    'd&g': 'dolce gabbana',
    # 蔻馳
    '蔻驰': 'coach',
    '寇驰': 'coach',
    # 邁克高仕
    '迈克高仕': 'michael kors',
    'mk': 'michael kors',
    # 凱特絲蓓
    '凯特丝蓓': 'kate spade',
    'ks': 'kate spade',
    # 托德斯
    '托德斯': 'tod',
    'tods': 'tod',
    "tod's": 'tod',
    # 羅傑維維亞
    '罗杰维维亚': 'roger vivier',
    'rv': 'roger vivier',
    # 周仰傑
    '周仰杰': 'jimmy choo',
    '吉米周': 'jimmy choo',
    # 克里斯提魯布托
    '红底鞋': 'christian louboutin',
    '鲁布托': 'christian louboutin',
    'louboutin': 'christian louboutin',
    'cl': 'christian louboutin',
    # 歐米茄
    '欧米茄': 'omega',
    '歐米茄': 'omega',
    # 勞力士
    '劳力士': 'rolex',
    '勞力士': 'rolex',
    # 百達翡麗
    '百达翡丽': 'patek philippe',
    '百達翡麗': 'patek philippe',
    # 梵克雅寶
    '梵克雅宝': 'van cleef',
    '梵克雅寶': 'van cleef',
    'vca': 'van cleef',
    # 艾克妮
    '艾克妮': 'acne',
    'acne studios': 'acne',
    # 麒麟
    '麒麟': 'qeelin',
    # 斐登
    '斐登': 'fred',
}


# ============ Famille 字段規範化映射 ============
FAMILLE_NORMALIZATION_MAP = {
    # Collection Miu Miu - 統一為 "Collection_Miumiu"
    'collection_miumiu': 'Collection_Miumiu',
    'collection miumiu': 'Collection_Miumiu',
    'miumiu collection': 'Collection_Miumiu',
    
    # 包袋類 - 統一為 "Sacs"
    'sacs': 'Sacs',
    'sac': 'Sacs',
    'sacs à main': 'Sacs',
    'mini-sacs': 'Sacs',
    'petite-maroquinerie': 'Sacs',
    'petite maroquinerie': 'Sacs',
    'portefeuilles': 'Sacs',
    'portefeuilles-et-petite-maroquinerie': 'Sacs',
    'portefeuilles & petite maroquinerie': 'Sacs',
    'portefeuilles & porte-cartes': 'Sacs',
    'bagages': 'Sacs',
    'sacs et chaussures': 'Sacs',  # 混合類別，優先歸為包袋
    
    # 成衣類 - 統一為 "Vêtements"
    'vêtements': 'Vêtements',
    "vêtements d'extérieur": 'Vêtements',
    'pret-a-porter': 'Vêtements',
    'prêt-à-porter': 'Vêtements',
    'prêt-a-porter': 'Vêtements',
    'pret-a-porter-homme': 'Vêtements',
    'manteaux': 'Vêtements',
    'manteaux & vestes': 'Vêtements',
    'femme': 'Vêtements',
    'homme': 'Vêtements',
    
    # 鞋履類 - 統一為 "Chaussures"
    'chaussures': 'Chaussures',
    'souliers': 'Chaussures',
    'chaussures & accessoires': 'Chaussures',
    
    # 珠寶類 - 統一為 "Bijoux"
    'bijoux': 'Bijoux',
    'bijoux en argent': 'Bijoux',
    'bijoux fantaisie': 'Bijoux',
    
    # 配飾類 - 統一為 "Accessoires"
    'accessoires': 'Accessoires',
    'autres-lignes': 'Accessoires',
    
    # 特殊類別 - 統一歸為 "Accessoires"
    'moncler genius': 'Accessoires',
    'moncler grenoble pour femme': 'Accessoires',
    'moncler grenoble pour homme': 'Accessoires',
    'collections': 'Accessoires',
    'cadeaux': 'Accessoires',
    'à la une': 'Accessoires',
    'mode été': 'Accessoires',
    'bébé garçons 3 à 36 mois': 'Accessoires',
}


# ============ 商品類型關鍵詞映射（中文 -> 多語言搜索詞）============
PRODUCT_TYPE_MAP = {
    # 服裝類
    '裙子': 'skirt jupe robe dress',
    '裙': 'skirt jupe robe dress',
    '连衣裙': 'dress robe',
    '半裙': 'skirt jupe',
    '外套': 'coat jacket manteau veste',
    '大衣': 'coat manteau overcoat',
    '夹克': 'jacket veste blouson',
    '风衣': 'trench coat trench',
    '西装': 'suit blazer costume',
    '衬衫': 'shirt chemise blouse',
    '毛衣': 'sweater pull pullover knitwear',
    '针织': 'knitwear maille tricot',
    'T恤': 't-shirt tee',
    '裤子': 'pants trousers pantalon',
    '牛仔裤': 'jeans denim',
    '短裤': 'shorts',
    # 包袋類
    '包': 'bag sac handbag',
    '包包': 'bag sac handbag',
    '手袋': 'handbag sac',
    '手提包': 'tote bag cabas',
    '斜挎包': 'crossbody bag bandouliere',
    '单肩包': 'shoulder bag',
    '双肩包': 'backpack sac dos',
    '钱包': 'wallet portefeuille',
    '卡包': 'card holder porte carte',
    '腰包': 'belt bag',
    # 鞋類
    '鞋': 'shoes chaussures',
    '鞋子': 'shoes chaussures',
    '高跟鞋': 'heels pumps escarpins',
    '运动鞋': 'sneakers baskets trainers',
    '凉鞋': 'sandals sandales',
    '靴子': 'boots bottes',
    '乐福鞋': 'loafers mocassins',
    '平底鞋': 'flats ballerines',
    # 配飾類
    '手表': 'watch montre',
    '腕表': 'watch montre timepiece',
    '项链': 'necklace collier',
    '戒指': 'ring bague',
    '耳环': 'earrings boucles oreilles',
    '手链': 'bracelet',
    '手镯': 'bangle bracelet',
    '太阳镜': 'sunglasses lunettes soleil',
    '眼镜': 'glasses lunettes',
    '围巾': 'scarf foulard echarpe',
    '丝巾': 'silk scarf carre',
    '帽子': 'hat chapeau cap',
    '皮带': 'belt ceinture',
    '腰带': 'belt ceinture',
    # 珠寶類
    '珠宝': 'jewelry joaillerie bijoux',
    '首饰': 'jewelry bijoux accessoires',
    '钻石': 'diamond diamant',
    # 香水化妝品
    '香水': 'perfume parfum fragrance',
    '口红': 'lipstick rouge levres',
    '化妆品': 'makeup maquillage cosmetics',
}


# ============ 工具函數 ============

def normalize_famille(famille: str) -> str:
    """
    規範化 Famille 字段：將各種變體統一為標準值
    
    Args:
        famille: 原始的 famille 字段值
        
    Returns:
        標準化後的 famille 值
    """
    if not famille or not isinstance(famille, str):
        return ''
    
    trimmed = famille.strip()
    if not trimmed:
        return ''
    
    # 轉換為小寫進行匹配（不區分大小寫）
    lower_key = trimmed.lower()
    
    # 直接匹配
    if lower_key in FAMILLE_NORMALIZATION_MAP:
        return FAMILLE_NORMALIZATION_MAP[lower_key]
    
    # 部分匹配（包含關鍵詞）
    if any(kw in lower_key for kw in ['sac', 'maroquinerie', 'portefeuille', 'bagage']):
        return 'Sacs'
    if any(kw in lower_key for kw in ['vêtement', 'pret-a-porter', 'prêt', 'manteau']):
        return 'Vêtements'
    if any(kw in lower_key for kw in ['chaussure', 'souliers']):
        return 'Chaussures'
    if 'bijou' in lower_key:
        return 'Bijoux'
    if 'accessoire' in lower_key:
        return 'Accessoires'
    
    # 如果無法匹配，返回原始值（首字母大寫）
    return trimmed.capitalize()


def get_brand_website(brand: str) -> str | None:
    """
    獲取品牌對應的官網域名
    
    Args:
        brand: 品牌名稱
        
    Returns:
        官網域名，如果未找到則返回 None
    """
    if not brand:
        return None
    return BRAND_WEBSITE_MAP.get(brand.lower())


def normalize_brand(brand: str) -> str:
    """
    將品牌別名轉換為標準英文名
    
    Args:
        brand: 品牌名稱（可能是別名）
        
    Returns:
        標準化的品牌名稱
    """
    if not brand:
        return ''
    
    lower_brand = brand.lower().strip()
    
    # 先查找別名映射
    if lower_brand in BRAND_ALIASES:
        return BRAND_ALIASES[lower_brand]
    
    # 如果在官網映射中存在，說明已經是標準名稱
    if lower_brand in BRAND_WEBSITE_MAP:
        return lower_brand
    
    return brand


def get_product_type_keywords(product_type: str) -> str | None:
    """
    獲取商品類型對應的多語言搜索關鍵詞
    
    Args:
        product_type: 中文商品類型
        
    Returns:
        多語言搜索關鍵詞，如果未找到則返回 None
    """
    if not product_type:
        return None
    return PRODUCT_TYPE_MAP.get(product_type)


# ============ 測試代碼 ============
if __name__ == '__main__':
    # 測試品牌標準化
    print("=== 品牌標準化測試 ===")
    test_brands = ['迪奥', 'LV', '古驰', 'Dior', 'louis vuitton']
    for brand in test_brands:
        print(f"  {brand} -> {normalize_brand(brand)}")
    
    # 測試分類標準化
    print("\n=== 分類標準化測試 ===")
    test_familles = ['Sacs', 'sacs à main', 'vêtements', 'CHAUSSURES']
    for famille in test_familles:
        print(f"  {famille} -> {normalize_famille(famille)}")
    
    # 測試商品類型關鍵詞
    print("\n=== 商品類型關鍵詞測試 ===")
    test_types = ['包', '裙子', '手表']
    for ptype in test_types:
        print(f"  {ptype} -> {get_product_type_keywords(ptype)}")
