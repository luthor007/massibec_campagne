#!/usr/bin/env python3
"""
Script pour importer une liste de prix depuis Excel/CSV
Utilise Gemini pour reconnaître les prix et les associer aux produits existants
"""
import json
import sys
import os
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Charger .env.local depuis le répertoire racine du projet
project_root = Path(__file__).parent.parent
env_file = project_root / ".env.local"
load_dotenv(env_file)

# Configuration Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

MODEL = "gemini-flash-latest"

# Schéma JSON pour l'extraction des prix
PRICE_EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "priceMatches": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "productName": {
                        "type": "string",
                        "description": "Nom du produit trouvé dans le document (peut être partiel ou similaire)"
                    },
                    "price": {
                        "type": "number",
                        "description": "Prix pickup trouvé pour ce produit"
                    },
                    "confidence": {
                        "type": "number",
                        "description": "Niveau de confiance (0-1) que cette association est correcte"
                    },
                    "rowNumber": {
                        "type": "number",
                        "description": "Numéro de ligne dans le document (pour référence)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Notes ou contexte supplémentaire"
                    }
                },
                "required": ["productName", "price", "confidence"]
            }
        },
        "reasoning": {
            "type": "string",
            "description": "Explication de la méthode utilisée pour associer les prix"
        }
    },
    "required": ["priceMatches", "reasoning"]
}


def read_file(file_path: str) -> pd.DataFrame:
    """Lit un fichier Excel ou CSV et retourne un DataFrame"""
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"Le fichier {file_path} n'existe pas")
    
    # Détecter le type de fichier
    if file_path.suffix.lower() in ['.xlsx', '.xls']:
        # Lire Excel - essayer toutes les feuilles
        try:
            excel_file = pd.ExcelFile(file_path)
            # Prendre la première feuille par défaut, ou celle avec le plus de lignes
            sheet_names = excel_file.sheet_names
            if len(sheet_names) == 1:
                df = pd.read_excel(file_path, sheet_name=sheet_names[0])
            else:
                # Trouver la feuille avec le plus de données
                max_rows = 0
                best_sheet = sheet_names[0]
                for sheet in sheet_names:
                    temp_df = pd.read_excel(file_path, sheet_name=sheet, nrows=1)
                    # Compter les lignes non vides
                    full_df = pd.read_excel(file_path, sheet_name=sheet)
                    if len(full_df) > max_rows:
                        max_rows = len(full_df)
                        best_sheet = sheet
                df = pd.read_excel(file_path, sheet_name=best_sheet)
        except Exception as e:
            raise ValueError(f"Erreur lors de la lecture du fichier Excel: {e}")
    elif file_path.suffix.lower() == '.csv':
        # Lire CSV - essayer différents encodages
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        df = None
        for encoding in encodings:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        if df is None:
            raise ValueError("Impossible de lire le fichier CSV avec les encodages testés")
    else:
        raise ValueError(f"Format de fichier non supporté: {file_path.suffix}")
    
    return df


def prepare_data_for_gemini(df: pd.DataFrame, products: List[Dict]) -> str:
    """Prépare les données pour Gemini"""
    # Convertir le DataFrame en texte lisible
    # Limiter à 1000 lignes pour éviter les tokens excessifs
    df_sample = df.head(1000)
    
    # Créer une représentation textuelle du DataFrame
    data_text = "=== DONNÉES DU DOCUMENT ===\n\n"
    data_text += f"Nombre de lignes: {len(df)}\n"
    data_text += f"Colonnes: {', '.join(df.columns.tolist())}\n\n"
    data_text += "Aperçu des données (premières lignes):\n"
    data_text += df_sample.to_string(max_rows=100, max_cols=100)
    data_text += "\n\n"
    
    # Ajouter la liste des produits existants
    data_text += "=== PRODUITS EXISTANTS À ASSOCIER ===\n\n"
    for i, product in enumerate(products[:100], 1):  # Limiter à 100 produits
        data_text += f"{i}. {product.get('name', 'N/A')} (ID: {product.get('_id', 'N/A')})\n"
    
    return data_text


def extract_prices_with_gemini(df: pd.DataFrame, products: List[Dict]) -> Dict:
    """Utilise Gemini pour extraire les prix et les associer aux produits"""
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # Préparer les données
    data_text = prepare_data_for_gemini(df, products)
    
    # Créer le prompt
    prompt = f"""Tu es un assistant expert en analyse de documents de prix.

Tâche: Analyser le document fourni et associer les prix trouvés aux produits existants de la liste.

Instructions:
1. Examine attentivement le document (tableau Excel/CSV)
2. Identifie toutes les colonnes qui contiennent des prix (peuvent être nommées différemment: "prix", "price", "coût", "cost", "montant", etc.)
3. Pour chaque ligne du document, essaie d'identifier quel produit de la liste correspond (par nom, référence, code, etc.)
4. Associe le prix trouvé au produit correspondant
5. Si un produit n'est pas trouvé exactement, essaie de faire une correspondance approximative (noms similaires, variations)
6. Indique un niveau de confiance pour chaque association (0-1)

Important:
- Les prix peuvent être dans différentes colonnes (cherche toutes les colonnes numériques)
- Les noms de produits peuvent varier (abréviations, majuscules/minuscules, accents)
- Si tu n'es pas sûr d'une association, mets une confiance faible (< 0.5)
- Ne crée pas de correspondances si tu n'es pas confiant

{data_text}

Retourne un JSON avec les associations trouvées."""

    try:
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=PRICE_EXTRACTION_SCHEMA
        )
        
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=config
        )
        
        result_text = response.text.strip()
        
        # Nettoyer le JSON (enlever les markdown code blocks si présents)
        if result_text.startswith('```'):
            import re
            result_text = re.sub(r'^```(?:json)?\s*\n', '', result_text)
            result_text = re.sub(r'\n```\s*$', '', result_text)
        
        parsed = json.loads(result_text)
        return parsed
        
    except json.JSONDecodeError as e:
        print(f"❌ Erreur de parsing JSON: {e}", file=sys.stderr)
        print(f"Réponse reçue: {result_text[:500]}", file=sys.stderr)
        return {
            "priceMatches": [],
            "reasoning": f"Erreur de parsing: {e}"
        }
    except Exception as e:
        print(f"❌ Erreur lors de l'appel Gemini: {e}", file=sys.stderr)
        return {
            "priceMatches": [],
            "reasoning": f"Erreur: {e}"
        }


def match_products(price_matches: List[Dict], products: List[Dict]) -> List[Dict]:
    """Associe les prix extraits aux produits existants par ID"""
    results = []
    
    for match in price_matches:
        product_name = match.get('productName', '').strip().lower()
        price = match.get('price')
        confidence = match.get('confidence', 0)
        
        if not product_name or price is None:
            continue
        
        # Chercher le produit correspondant
        best_match = None
        best_score = 0
        
        for product in products:
            product_name_db = product.get('name', '').strip().lower()
            
            # Correspondance exacte
            if product_name == product_name_db:
                best_match = product
                best_score = 1.0
                break
            
            # Correspondance partielle (le nom du document contient le nom du produit ou vice versa)
            if product_name in product_name_db or product_name_db in product_name:
                score = min(len(product_name), len(product_name_db)) / max(len(product_name), len(product_name_db))
                if score > best_score:
                    best_match = product
                    best_score = score
        
        # Si on a trouvé une correspondance avec une confiance suffisante
        if best_match and (confidence * best_score) > 0.1:  # Seuil de confiance combiné
            results.append({
                "productId": str(best_match.get('_id', '')),
                "productName": best_match.get('name', ''),
                "pricePickup": float(price),
                "confidence": confidence * best_score,
                "rowNumber": match.get('rowNumber'),
                "notes": match.get('notes', '')
            })
    
    return results


def main():
    """Fonction principale"""
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Usage: python import-price-list.py <file_path> <products_json>"
        }))
        sys.exit(1)
    
    file_path = sys.argv[1]
    products_json = sys.argv[2]
    
    try:
        # Lire le fichier
        df = read_file(file_path)
        
        # Charger les produits existants
        products = json.loads(products_json)
        
        # Extraire les prix avec Gemini
        extraction_result = extract_prices_with_gemini(df, products)
        
        # Associer aux produits
        matched_prices = match_products(extraction_result.get('priceMatches', []), products)
        
        # Retourner le résultat
        result = {
            "success": True,
            "reasoning": extraction_result.get('reasoning', ''),
            "matches": matched_prices,
            "totalMatches": len(matched_prices),
            "totalExtracted": len(extraction_result.get('priceMatches', []))
        }
        
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "success": False
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()

