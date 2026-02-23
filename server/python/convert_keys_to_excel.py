#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 JSON 产品数据的 keys 转换为 Excel 的 key 系统
"""

import json
import os
from pathlib import Path
from datetime import datetime

# JSON → Excel 键映射
KEY_MAPPING = {
    # 核心字段转换
    'reference': 'produit',                    # 商品编号
    'produit': 'designation',                  # 商品名称
    'designation': 'descriptif',               # 商品描述
    
    # 大小写转换
    'motif': 'Motif',
    'marque': 'Marque',
    'couleur': 'Couleur',
    'taille': 'Taille',
    'prix_vente': 'Prix_Vente',
    'fournisseur': 'Fournisseur',
    'matiere': 'Matiere',
    'dimension': 'Dimension',
    'code_douanes': 'Code_Douanes',
    'collection': 'Collection',
    'modele': 'Modele',
    'decimales_quantite': 'Decimales_Quantite',
    'conditionnement_achat': 'Conditionnement_Achat',
    'conditionnement_reassort': 'Conditionnement_Reassort',
    'conditionnement_vente': 'Conditionnement_Vente',
    'commande_minimum': 'Commande_Minimum',
    'delai_livraison': 'Delai_Livraison',
    'utilisateur_creation': 'Utilisateur_Creation',
    'utilisateur_modification': 'Utilisateur_Modification',
    'serialise': 'Serialise',
    'img_url': 'Perso_Lien_Photo',
    'actif': 'Actif',
    'cumul_achat_quantite': 'Cumul_achat_quantite',
    'cumul_achat_valeur': 'Cumul_achat_valeur',
    'smart_show': 'Smart_show',
    'exclure_fidelite': 'Exclure_Fidelite',
    'lien_externe': 'Lien_Externe',
    'ecommerce': 'Ecommerce',
    
    # 保持不变的字段
    'infoscomp': 'infoscomp',
    'Rayon': 'Rayon',
    'Famille': 'Famille',
    'Perso_Matiere': 'Perso_Matiere',
    'Cle_mep': 'Cle_mep',
    'Tags': 'Tags',
    'Emplacement': 'Emplacement',
    'Unite': 'Unite',
    'Type_Produit': 'Type_Produit',
    'Volume': 'Volume',
    'Pays_Production': 'Pays_Production',
    'Poids': 'Poids',
}


def convert_product_keys(product):
    """
    转换单个商品的 keys 从 JSON 格式到 Excel 格式
    """
    new_product = {}
    
    for old_key, value in product.items():
        # 获取映射的新 key
        new_key = KEY_MAPPING.get(old_key, old_key)
        new_product[new_key] = value
    
    # 新增 SousFamille 字段（如果不存在）
    if 'SousFamille' not in new_product:
        new_product['SousFamille'] = ''
    
    return new_product


def main():
    """主函数：执行转换"""
    
    # 文件路径
    data_dir = Path(__file__).parent.parent / 'data'
    input_file = data_dir / 'products.json'
    backup_file = data_dir / f'products_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    output_file = data_dir / 'products.json'
    
    print("=" * 80)
    print("JSON Keys → Excel Keys 转换工具")
    print("=" * 80)
    print(f"\n输入文件: {input_file}")
    print(f"备份文件: {backup_file}")
    print(f"输出文件: {output_file}")
    print()
    
    # 读取原始数据
    print("📖 正在读取原始数据...")
    with open(input_file, 'r', encoding='utf-8') as f:
        products = json.load(f)
    
    print(f"✅ 成功读取 {len(products)} 个商品")
    
    # 显示转换示例（前3个商品的前5个字段）
    if products:
        print("\n📋 转换示例（第一个商品）:")
        print("-" * 80)
        print("转换前的 keys:")
        for i, key in enumerate(list(products[0].keys())[:10]):
            print(f"  {i+1}. {key}")
        
        # 转换第一个商品作为示例
        sample_converted = convert_product_keys(products[0])
        print("\n转换后的 keys:")
        for i, key in enumerate(list(sample_converted.keys())[:10]):
            print(f"  {i+1}. {key}")
        print("-" * 80)
    
    # 确认转换
    confirm = input("\n⚠️  是否继续转换所有商品？(yes/no): ").strip().lower()
    if confirm not in ['yes', 'y']:
        print("❌ 转换已取消")
        return
    
    # 备份原文件
    print("\n💾 正在备份原文件...")
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f"✅ 备份完成: {backup_file.name}")
    
    # 转换所有商品
    print(f"\n🔄 正在转换 {len(products)} 个商品的 keys...")
    converted_products = []
    
    for i, product in enumerate(products):
        converted = convert_product_keys(product)
        converted_products.append(converted)
        
        # 显示进度
        if (i + 1) % 5000 == 0:
            print(f"   已转换: {i + 1}/{len(products)} ({(i+1)/len(products)*100:.1f}%)")
    
    print(f"✅ 转换完成: {len(converted_products)} 个商品")
    
    # 保存转换后的数据
    print("\n💾 正在保存转换后的数据...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(converted_products, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 保存完成: {output_file}")
    
    # 统计信息
    print("\n" + "=" * 80)
    print("转换统计")
    print("=" * 80)
    
    # 统计新旧 keys
    old_keys = set()
    new_keys = set()
    
    for p in products[:100]:  # 取样前100个
        old_keys.update(p.keys())
    
    for p in converted_products[:100]:
        new_keys.update(p.keys())
    
    print(f"\n原始数据唯一字段数: {len(old_keys)}")
    print(f"转换后唯一字段数: {len(new_keys)}")
    print(f"\n新增字段: SousFamille")
    
    # 显示关键转换
    print("\n关键转换:")
    print("  reference → produit")
    print("  produit → designation")
    print("  designation → descriptif")
    print("  img_url → Perso_Lien_Photo")
    print("  + 23个字段大小写转换")
    
    print("\n" + "=" * 80)
    print("✅ 转换完成！")
    print("=" * 80)
    print(f"\n📁 原文件已备份到: {backup_file.name}")
    print(f"📁 新文件已保存到: {output_file.name}")
    print("\n下一步: 请更新前端和后端代码以使用新的字段名称")


if __name__ == '__main__':
    main()
