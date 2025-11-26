#!/usr/bin/env python3
"""
Scraper personnalisé pour les sites de fournisseurs utilisant Gemini AI
Explore intelligemment le site web pour extraire les informations de l'entreprise et les produits
"""

import os
import sys
import json
import base64
import re
import time
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Optional, Set, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import requests
from bs4 import BeautifulSoup
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Selenium pour gérer les popups JavaScript
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("⚠️ Selenium non disponible - les popups JavaScript ne seront pas gérés")

load_dotenv(".env.local")

# Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

MODEL = "gemini-2.5-pro"
MAX_PAGES_TO_VISIT = 5  # Limite stricte pour accélérer le scraping (5 pages max)
MAX_DEPTH = 1  # Profondeur minimale - rester sur les pages principales uniquement
MIN_PRODUCTS_TARGET = 15  # Objectif ajusté pour 5 pages (réaliste)
MIN_COMPANY_INFO_FIELDS = 3  # Objectif ajusté pour 5 pages (réaliste)

# Schéma JSON pour l'extraction
EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "companyInfo": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "address": {"type": "string"},
                "logo": {"type": "string"},
                "website": {"type": "string"},
                "certifications": {"type": "array", "items": {"type": "string"}},
                "storageType": {"type": "string", "enum": ["ambient", "chilled", "frozen"]}
            }
        },
        "products": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "pricePickup": {"type": "number"},
                    "priceStudent": {"type": "number"},
                    "priceFinal": {"type": "number"},
                    "image": {"type": "string"},
                    "ingredientsImage": {"type": "string"},
                    "nutritionImage": {"type": "string"},
                    "ingredientsText": {"type": "string"},
                    "nutritionText": {"type": "string"},
                    "unitSize": {"type": "string"},
                    "casePack": {"type": "string"},
                    "pallet": {
                        "type": "object",
                        "properties": {
                            "ti": {"type": "number"},
                            "hi": {"type": "number"}
                        }
                    },
                    "refrigerated": {"type": "boolean"},
                    "allergens": {"type": "array", "items": {"type": "string"}},
                    "category": {"type": "string"},
                    "sourceUrl": {"type": "string"},
                    "attributes": {
                        "type": "object",
                        "properties": {
                            "freezable": {"type": "boolean"},
                            "glutenFree": {"type": "boolean"},
                            "vegetarian": {"type": "boolean"},
                            "vegan": {"type": "boolean"},
                            "nutFree": {"type": "boolean"},
                            "halal": {"type": "boolean"},
                            "kosher": {"type": "boolean"},
                            "organic": {"type": "boolean"},
                            "quebecProduct": {"type": "boolean"}
                        }
                    }
                }
            }
        }
    },
    "required": ["companyInfo", "products"]
}


class SupplierScraper:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.parsed_base = urlparse(base_url)
        self.visited_urls: Set[str] = set()
        self.visited_urls_list: List[str] = []  # Liste ordonnée des URLs visitées
        self.all_data: Dict = {
            "companyInfo": {},
            "products": []
        }
        # Stocker tous les outputs individuels de chaque page pour consolidation finale
        self.page_outputs: List[Dict] = []  # Liste de tous les outputs bruts de chaque page
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.session = requests.Session()
        
        # Créer le dossier assets pour les images
        self.assets_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'scraped-images')
        os.makedirs(self.assets_dir, exist_ok=True)
        print(f"📁 Dossier assets: {self.assets_dir}")
        
        # Dictionnaire pour stocker les vraies URLs d'images trouvées par page
        # Structure: {url_page: [{"url": "...", "alt": "...", "is_product": True}]}
        self.page_product_images: Dict[str, List[Dict]] = {}
        
        # Dictionnaire pour stocker les images de logo identifiées
        # Structure: {url_page: [{"url": "...", "alt": "...", "is_logo": True}]}
        self.page_logo_images: Dict[str, List[Dict]] = {}
        
        # Verrou pour la thread-safety lors du scan asynchrone
        self.lock = Lock()
        
    def is_same_domain(self, url: str) -> bool:
        """Vérifie si l'URL appartient au même domaine"""
        try:
            parsed = urlparse(url)
            return parsed.netloc == self.parsed_base.netloc or parsed.netloc == ''
        except:
            return False
    
    def normalize_image_url(self, url: str) -> str:
        """Normalise une URL d'image (www vs non-www, etc.)"""
        if not url or str(url).lower() in ["null", "none", ""]:
            return ""
        try:
            parsed = urlparse(url)
            # Normaliser le domaine (enlever ou ajouter www selon le base_url)
            base_netloc = self.parsed_base.netloc
            if base_netloc.startswith('www.'):
                # Le base_url a www, s'assurer que l'image aussi
                if not parsed.netloc.startswith('www.'):
                    parsed = parsed._replace(netloc='www.' + parsed.netloc)
            else:
                # Le base_url n'a pas www, enlever www de l'image si présent
                if parsed.netloc.startswith('www.'):
                    parsed = parsed._replace(netloc=parsed.netloc[4:])
            return parsed.geturl()
        except:
            return url
    
    def normalize_url(self, url: str) -> str:
        """Normalise une URL (supprime les fragments, etc.)"""
        if url.startswith('#'):
            return None
        if url.startswith('javascript:'):
            return None
        if url.startswith('mailto:'):
            return None
        
        # Convertir en URL absolue
        absolute_url = urljoin(self.base_url, url)
        parsed = urlparse(absolute_url)
        
        # Supprimer le fragment
        normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        if parsed.query:
            normalized += f"?{parsed.query}"
        
        return normalized
    
    def handle_popups_selenium(self, driver):
        """Gère les popups courants (sélection de langue, cookies, etc.)"""
        try:
            # Attendre que la page se charge complètement
            print(f"   ⏳ Attente du chargement de la page...")
            time.sleep(6)
            
            # Chercher le popup de sélection de langue (plus spécifique)
            # Le popup a généralement un ID ou une classe spécifique
            popup_selectors = [
                "//div[@id='my-welcome-message']",
                "//div[contains(@id, 'welcome')]",
                "//div[contains(@class, 'language')]",
                "//div[contains(@class, 'popup')]",
                "//div[contains(@class, 'modal')]",
                "//*[contains(text(), 'CHOISISSEZ LA LANGUE') or contains(text(), 'CHOOSE YOUR LANGUAGE')]"
            ]
            
            popup_found = False
            for selector in popup_selectors:
                try:
                    elements = driver.find_elements(By.XPATH, selector)
                    for element in elements:
                        if element.is_displayed():
                            popup_found = True
                            print(f"   🔍 Popup trouvé: {selector}")
                            break
                    if popup_found:
                        break
                except:
                    continue
            
            if not popup_found:
                print(f"   ℹ️ Aucun popup visible détecté")
                return False
            
            # Chercher les boutons de langue dans le popup
            language_button_selectors = [
                "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'français') or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'francais')]",
                "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'french')]",
                "//a[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'français')]",
                "//a[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'francais')]",
                "//button[contains(text(), 'Français')]",
                "//button[contains(text(), 'FRANCAIS')]",
                "//a[contains(text(), 'Français')]",
                "//a[contains(text(), 'FRANCAIS')]",
                "//button[contains(text(), 'English')]",
                "//a[contains(text(), 'English')]"
            ]
            
            # Essayer de cliquer sur un bouton de langue (préférer Français)
            for selector in language_button_selectors:
                try:
                    elements = driver.find_elements(By.XPATH, selector)
                    for element in elements:
                        try:
                            if element.is_displayed() and element.is_enabled():
                                text = element.text.strip()
                                # Préférer Français
                                if any(lang in text.lower() for lang in ['français', 'french', 'francais']):
                                    print(f"   🌐 Clic sur sélecteur de langue (Français): {text[:50]}")
                                    # Scroller jusqu'à l'élément
                                    driver.execute_script("arguments[0].scrollIntoView(true);", element)
                                    time.sleep(3)
                                    element.click()
                                    time.sleep(4)  # Attendre que la page se recharge
                                    print(f"   ✅ Langue sélectionnée, attente du chargement...")
                                    return True
                        except Exception as e:
                            print(f"   ⚠️ Erreur lors du clic: {e}")
                            continue
                except:
                    continue
            
            # Si pas de bouton Français trouvé, essayer English
            for selector in language_button_selectors:
                try:
                    elements = driver.find_elements(By.XPATH, selector)
                    for element in elements:
                        try:
                            if element.is_displayed() and element.is_enabled():
                                text = element.text.strip()
                                if any(lang in text.lower() for lang in ['english', 'anglais']):
                                    print(f"   🌐 Clic sur sélecteur de langue (English): {text[:50]}")
                                    driver.execute_script("arguments[0].scrollIntoView(true);", element)
                                    time.sleep(3)
                                    element.click()
                                    time.sleep(5)
                                    print(f"   ✅ Langue sélectionnée, attente du chargement...")
                                    return True
                        except:
                            continue
                except:
                    continue
            
            # Chercher des boutons de fermeture génériques
            close_selectors = [
                "//button[contains(@class, 'close')]",
                "//button[contains(@aria-label, 'close')]",
                "//*[@class='close' or @class='modal-close']",
                "//span[contains(@class, 'close')]"
            ]
            
            for selector in close_selectors:
                try:
                    elements = driver.find_elements(By.XPATH, selector)
                    for element in elements:
                        if element.is_displayed():
                            print(f"   ❌ Fermeture d'un popup")
                            element.click()
                            time.sleep(5)
                            return True
                except:
                    continue
            
            return False
        except Exception as e:
            print(f"   ⚠️ Erreur lors de la gestion des popups: {e}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            return False
    
    def fetch_page(self, url: str, use_selenium: bool = False) -> Tuple[Optional[BeautifulSoup], Optional[Any]]:
        """Récupère et parse une page HTML, en gérant les popups JavaScript si nécessaire
        Retourne (soup, driver) où driver peut être None si Selenium n'est pas utilisé"""
        driver = None
        try:
            print(f"📄 Fetching: {url}")
            
            # Si on doit utiliser Selenium (popup détecté ou demandé)
            if use_selenium and SELENIUM_AVAILABLE:
                print(f"   🤖 Utilisation de Selenium pour découvrir tous les liens...")
                result = self.fetch_page_with_selenium(url, return_driver=True)
                if result:
                    soup, driver = result
                    return soup, driver
                return None, None
            
            # Essayer d'abord avec requests (plus rapide)
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Vérifier s'il y a des signes de popups JavaScript (modals, language selectors)
            popup_indicators = soup.find_all(['div', 'section'], 
                class_=re.compile(r'popup|modal|language|welcome|overlay', re.I))
            
            # Vérifier aussi dans le texte visible
            text = soup.get_text().lower()
            has_language_popup = any(term in text for term in ['choisissez la langue', 'choose your language', 'choisir la langue'])
            
            # Si on détecte des popups, utiliser Selenium pour découvrir tous les liens
            if (popup_indicators or has_language_popup) and SELENIUM_AVAILABLE:
                print(f"   🔍 Popup détecté, utilisation de Selenium pour découvrir tous les liens...")
                result = self.fetch_page_with_selenium(url, return_driver=True)
                if result:
                    soup, driver = result
                    return soup, driver
            
            return soup, None
        except Exception as e:
            print(f"❌ Error fetching {url}: {e}")
            # Si requests échoue, essayer Selenium
            if SELENIUM_AVAILABLE:
                print(f"   🔄 Tentative avec Selenium...")
                result = self.fetch_page_with_selenium(url, return_driver=True)
                if result:
                    soup, driver = result
                    return soup, driver
            return None, None
    
    def get_chromedriver_path(self):
        """Trouve le chemin correct vers chromedriver"""
        try:
            # Méthode 1: Essayer ChromeDriverManager
            driver_path = ChromeDriverManager().install()
            
            # Vérifier que c'est bien un exécutable (pas THIRD_PARTY_NOTICES)
            if os.path.isfile(driver_path) and os.access(driver_path, os.X_OK):
                # Vérifier que ce n'est pas le fichier THIRD_PARTY_NOTICES
                if 'THIRD_PARTY_NOTICES' not in driver_path:
                    return driver_path
                else:
                    # Chercher le vrai chromedriver dans le même dossier
                    driver_dir = os.path.dirname(driver_path)
                    for file in os.listdir(driver_dir):
                        if file == 'chromedriver' or (file.startswith('chromedriver') and not file.endswith('.txt')):
                            real_path = os.path.join(driver_dir, file)
                            if os.path.isfile(real_path) and os.access(real_path, os.X_OK):
                                print(f"   🔧 Chromedriver trouvé: {real_path}")
                                return real_path
            
            # Méthode 2: Chercher dans le dossier parent
            driver_dir = os.path.dirname(driver_path)
            parent_dir = os.path.dirname(driver_dir)
            for root, dirs, files in os.walk(parent_dir):
                for file in files:
                    if file == 'chromedriver' or (file.startswith('chromedriver') and not file.endswith('.txt')):
                        real_path = os.path.join(root, file)
                        if os.path.isfile(real_path) and os.access(real_path, os.X_OK):
                            print(f"   🔧 Chromedriver trouvé dans: {real_path}")
                            return real_path
            
            # Méthode 3: Utiliser which chromedriver (si installé globalement)
            import shutil
            which_path = shutil.which('chromedriver')
            if which_path:
                print(f"   🔧 Chromedriver trouvé via which: {which_path}")
                return which_path
            
            # Fallback: retourner le chemin original même s'il est suspect
            print(f"   ⚠️ Utilisation du chemin suspect: {driver_path}")
            return driver_path
            
        except Exception as e:
            print(f"   ⚠️ Erreur lors de la recherche de chromedriver: {e}")
            # Dernier recours: essayer de trouver chromedriver dans le PATH
            import shutil
            which_path = shutil.which('chromedriver')
            if which_path:
                return which_path
            raise Exception("Impossible de trouver chromedriver. Installez-le avec: brew install chromedriver")
    
    def fetch_page_with_selenium(self, url: str, return_driver: bool = False):
        """Récupère une page avec Selenium pour gérer JavaScript"""
        driver = None
        try:
            print(f"   🤖 Démarrage de Selenium...")
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            # Obtenir le chemin correct vers chromedriver
            driver_path = self.get_chromedriver_path()
            
            # Vérifier et résoudre le problème Gatekeeper (macOS bloque chromedriver)
            if sys.platform == 'darwin':  # macOS
                try:
                    import subprocess
                    # Si c'est un lien symbolique, suivre le lien pour trouver le vrai fichier
                    real_path = driver_path
                    if os.path.islink(driver_path):
                        real_path = os.readlink(driver_path)
                        if not os.path.isabs(real_path):
                            # Lien relatif, résoudre depuis le dossier du lien
                            real_path = os.path.join(os.path.dirname(driver_path), real_path)
                        real_path = os.path.abspath(real_path)
                        print(f"   🔗 Lien symbolique détecté, fichier réel: {real_path}")
                    
                    # Vérifier si chromedriver a l'attribut quarantine
                    result = subprocess.run(['xattr', real_path], capture_output=True, text=True)
                    if 'com.apple.quarantine' in result.stdout:
                        print(f"   🔓 Résolution du problème Gatekeeper (macOS bloque chromedriver)...")
                        # Supprimer l'attribut quarantine sur le vrai fichier
                        subprocess.run(['xattr', '-d', 'com.apple.quarantine', real_path], 
                                     capture_output=True, check=False)
                        # Aussi supprimer sur le lien symbolique si différent
                        if real_path != driver_path:
                            subprocess.run(['xattr', '-d', 'com.apple.quarantine', driver_path], 
                                         capture_output=True, check=False)
                        print(f"   ✅ Attribut quarantine supprimé")
                except Exception as gatekeeper_error:
                    print(f"   ⚠️ Impossible de résoudre Gatekeeper automatiquement: {gatekeeper_error}")
                    print(f"   💡 Exécutez manuellement: xattr -d com.apple.quarantine {driver_path}")
            
            service = Service(driver_path)
            driver = webdriver.Chrome(service=service, options=chrome_options)
        except Exception as driver_error:
            error_msg = str(driver_error)
            print(f"   ⚠️ Erreur lors de l'initialisation de chromedriver: {error_msg}")
            
            # Détecter le problème Gatekeeper spécifiquement
            if 'Status code was: -9' in error_msg or 'unexpectedly exited' in error_msg:
                print(f"   🚨 macOS Gatekeeper bloque chromedriver!")
                print(f"   💡 Solution 1 (recommandé): Exécutez:")
                print(f"      xattr -d com.apple.quarantine {driver_path if 'driver_path' in locals() else '/opt/homebrew/bin/chromedriver'}")
                print(f"   💡 Solution 2: Ou exécutez le script de correction:")
                print(f"      ./scripts/fix-chromedriver.sh")
                print(f"   💡 Solution 3: Autoriser dans Préférences Système > Sécurité")
            else:
                print(f"   💡 Solution: Installez chromedriver avec: brew install chromedriver")
                print(f"   💡 Ou: brew install --cask chromedriver")
            
            raise Exception(f"Chromedriver non disponible: {driver_error}")
        
            driver.get(url)
            
            # Gérer les popups
            popup_handled = self.handle_popups_selenium(driver)
            
            # Attendre que la page se charge complètement après interaction
            if popup_handled:
                print(f"   ⏳ Attente du rechargement de la page après interaction...")
                time.sleep(3)
                # Attendre que les liens soient chargés
                try:
                    WebDriverWait(driver, 10).until(
                        lambda d: len(d.find_elements(By.TAG_NAME, "a")) > 0
                    )
                    print(f"   ✅ Liens détectés sur la page")
                except:
                    print(f"   ⚠️ Timeout en attendant les liens")
            else:
                time.sleep(2)
            
            # Récupérer le HTML après interaction
            html = driver.page_source
            soup = BeautifulSoup(html, 'html.parser')
            
            if return_driver:
                return soup, driver
            return soup
        except Exception as e:
            print(f"   ❌ Erreur Selenium: {e}")
            if return_driver and driver:
                driver.quit()
            return None
        finally:
            if not return_driver and driver:
                driver.quit()
    
    def extract_contact_info_from_links(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extrait les informations de contact depuis les liens (mailto:, tel:, maps)"""
        contact_info = {
            "email": "",
            "phone": "",
            "address": ""
        }
        
        # Chercher tous les liens
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            
            # Extraire l'email depuis mailto:
            if href.startswith('mailto:'):
                email = href.replace('mailto:', '').strip()
                # Nettoyer l'email (enlever les paramètres comme ?subject=...)
                email = email.split('?')[0].split('&')[0].strip()
                if email and '@' in email:
                    contact_info["email"] = email
                    print(f"   📧 Email trouvé dans mailto: {email}")
            
            # Extraire le téléphone depuis tel:
            elif href.startswith('tel:'):
                phone = href.replace('tel:', '').strip()
                # Nettoyer le téléphone (enlever les espaces, tirets, etc.)
                phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').strip()
                if phone:
                    # Formater le téléphone (ajouter des espaces/tirets si nécessaire)
                    if len(phone) >= 10:
                        # Format: 819 295-3325 ou (819) 295-3325
                        if len(phone) == 10:
                            phone = f"{phone[:3]} {phone[3:6]}-{phone[6:]}"
                        contact_info["phone"] = phone
                        print(f"   📞 Téléphone trouvé dans tel: {phone}")
            
            # Extraire l'adresse depuis Google Maps
            elif 'google.com/maps' in href or 'maps.google.com' in href:
                # Essayer d'extraire l'adresse depuis l'URL Google Maps
                # Formats possibles:
                # 1. .../place/ADRESSE/@lat,lng/...
                # 2. .../place/ADRESSE,+VILLE,+PROVINCE/@lat,lng/...
                # 3. .../search/ADRESSE/@lat,lng/...
                # 4. .../dir/ADRESSE/@lat,lng/...
                try:
                    from urllib.parse import unquote, parse_qs, urlparse
                    
                    # Méthode 1: Extraire depuis /place/
                    if '/place/' in href:
                        # Extraire la partie après /place/
                        place_part = href.split('/place/')[1]
                        # Enlever les paramètres de coordonnées (@lat,lng)
                        if '/@' in place_part:
                            place_part = place_part.split('/@')[0]
                        elif '?hl=' in place_part:
                            place_part = place_part.split('?hl=')[0]
                        
                        # Décoder l'URL
                        address = unquote(place_part).replace('+', ' ')
                        # Nettoyer les caractères spéciaux
                        address = address.replace('%2C', ',').replace('%20', ' ')
                        
                        if address and len(address) > 5:
                            contact_info["address"] = address
                            print(f"   📍 Adresse trouvée dans Google Maps (/place/): {address[:80]}...")
                    
                    # Méthode 2: Extraire depuis les paramètres de requête
                    elif '?q=' in href or '&q=' in href:
                        parsed_url = urlparse(href)
                        query_params = parse_qs(parsed_url.query)
                        if 'q' in query_params:
                            address = unquote(query_params['q'][0]).replace('+', ' ')
                            if address and len(address) > 5:
                                contact_info["address"] = address
                                print(f"   📍 Adresse trouvée dans Google Maps (query): {address[:80]}...")
                    
                    # Méthode 3: Extraire depuis le texte du lien
                    link_text = link.get_text(strip=True)
                    if link_text and len(link_text) > 10 and any(char.isdigit() for char in link_text):
                        # Si le texte du lien ressemble à une adresse (contient des chiffres)
                        contact_info["address"] = link_text
                        print(f"   📍 Adresse trouvée dans le texte du lien Google Maps: {link_text[:80]}...")
                        
                except Exception as e:
                    print(f"   ⚠️ Erreur extraction adresse Google Maps: {e}")
                    pass
        
        return contact_info
    
    def extract_visible_text(self, soup: BeautifulSoup) -> str:
        """Extrait tout le texte visible de la page"""
        # Supprimer les scripts et styles
        for script in soup(["script", "style", "meta", "link"]):
            script.decompose()
        
        # Extraire le texte
        text = soup.get_text(separator=' ', strip=True)
        # Nettoyer les espaces multiples
        text = ' '.join(text.split())
        return text
    
    def extract_images(self, soup: BeautifulSoup, base_url: str) -> List[Dict]:
        """Extrait toutes les images de la page avec leurs URLs"""
        images = []
        for img in soup.find_all('img'):
            src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
            if src:
                # Convertir en URL absolue
                img_url = urljoin(base_url, src)
                alt = img.get('alt', '')
                
                # Identifier si c'est potentiellement un logo
                is_logo = False
                img_url_lower = img_url.lower()
                alt_lower = alt.lower() if alt else ''
                
                # Critères pour identifier un logo
                logo_indicators = [
                    'logo' in img_url_lower,
                    'logo' in alt_lower,
                    'brand' in img_url_lower,
                    'brand' in alt_lower,
                    'header' in img_url_lower and 'logo' in img_url_lower,
                    'footer' in img_url_lower and 'logo' in img_url_lower,
                    '/logo.' in img_url_lower,
                    'site-logo' in img_url_lower,
                    'company-logo' in img_url_lower,
                    'main-logo' in img_url_lower
                ]
                
                # Vérifier aussi les classes et IDs du parent
                parent = img.parent
                if parent:
                    parent_class = parent.get('class', [])
                    parent_id = parent.get('id', '')
                    parent_class_str = ' '.join(parent_class).lower() if isinstance(parent_class, list) else str(parent_class).lower()
                    parent_id_str = str(parent_id).lower()
                    
                    if any(['logo' in parent_class_str, 'logo' in parent_id_str, 'brand' in parent_class_str, 'brand' in parent_id_str]):
                        is_logo = True
                
                if any(logo_indicators):
                    is_logo = True
                
                images.append({
                    "url": img_url,
                    "alt": alt,
                    "is_logo": is_logo
                })
        return images
    
    def download_image(self, url: str, save_to_disk: bool = False, filename: Optional[str] = None) -> Optional[tuple]:
        """Télécharge une image depuis une URL et retourne (bytes, mime_type, local_path)
        Si save_to_disk=True, sauvegarde aussi l'image dans le dossier assets"""
        try:
            # Ignorer les images SVG en data URI - elles ne peuvent pas être téléchargées avec requests
            if url.startswith('data:image/svg+xml') or url.startswith('data:image/'):
                print(f"   ⚠️ Image data URI ignorée (SVG ou format non supporté): {url[:80]}...")
                return None
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10, stream=True)
            response.raise_for_status()
            
            # Vérifier le type MIME
            content_type = response.headers.get('content-type', '').split(';')[0].strip()
            if not content_type.startswith('image/'):
                return None
            
            # Limiter la taille (max 5MB pour éviter les problèmes)
            content = response.content
            if len(content) > 5 * 1024 * 1024:
                print(f"   ⚠️ Image trop grande ({len(content)} bytes), ignorée")
                return None
            
            # S'assurer que le type MIME est supporté par Gemini
            supported_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
            if content_type not in supported_types:
                # Essayer de détecter depuis l'extension
                if url.lower().endswith('.png'):
                    content_type = 'image/png'
                elif url.lower().endswith(('.jpg', '.jpeg')):
                    content_type = 'image/jpeg'
                elif url.lower().endswith('.webp'):
                    content_type = 'image/webp'
                else:
                    content_type = 'image/jpeg'  # Par défaut
            
            local_path = None
            if save_to_disk:
                # Générer un nom de fichier si non fourni
                if not filename:
                    # Extraire le nom de fichier de l'URL
                    parsed_url = urlparse(url)
                    url_filename = os.path.basename(parsed_url.path)
                    if not url_filename or '.' not in url_filename:
                        # Générer un nom basé sur l'URL
                        import hashlib
                        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
                        ext = 'jpg' if 'jpeg' in content_type else content_type.split('/')[-1]
                        url_filename = f"image_{url_hash}.{ext}"
                    
                    # Nettoyer le nom de fichier
                    url_filename = re.sub(r'[^\w\-_\.]', '_', url_filename)
                    filename = url_filename
                
                # Sauvegarder l'image
                file_path = os.path.join(self.assets_dir, filename)
                with open(file_path, 'wb') as f:
                    f.write(content)
                local_path = file_path
                print(f"      💾 Sauvegardée: {os.path.basename(file_path)}")
            
            return (content, content_type, local_path)
        except Exception as e:
            print(f"⚠️ Erreur téléchargement image {url}: {e}")
            return None
    
    def filter_product_images(self, images: List[Dict], page_url: str = "") -> List[Dict]:
        """Filtre les images pour ne garder que celles qui ressemblent à des produits
        Télécharge et sauvegarde les images directement dans assets"""
        if not images:
            print("⚠️ Aucune image trouvée sur la page")
            return []
        
        # Limiter à 20 images pour éviter trop d'appels API
        images_to_check = images[:20]
        
        print(f"\n{'='*60}")
        print(f"🔍 FILTRAGE DES IMAGES")
        print(f"{'='*60}")
        print(f"📸 {len(images)} images trouvées sur la page")
        print(f"🔍 Analyse de {len(images_to_check)} images pour identifier les produits...")
        
        # Télécharger les images ET les sauvegarder directement dans assets
        images_with_data = []
        print(f"📥 Téléchargement et sauvegarde des images...")
        for i, img in enumerate(images_to_check):
            print(f"   [{i+1}/{len(images_to_check)}] {img['url'][:80]}...")
            # Télécharger ET sauvegarder directement dans assets
            result = self.download_image(img['url'], save_to_disk=True)
            if result:
                img_data, mime_type, local_path = result
                images_with_data.append({
                    **img,
                    "data": img_data,
                    "mime_type": mime_type,
                    "local_path": local_path  # Ajouter le chemin local
                })
                if local_path:
                    print(f"      ✅ Téléchargée et sauvegardée ({len(img_data)} bytes, {mime_type})")
                    print(f"         💾 {os.path.basename(local_path)}")
                else:
                    print(f"      ✅ Téléchargée ({len(img_data)} bytes, {mime_type})")
            else:
                print(f"      ❌ Échec du téléchargement")
        
        print(f"✅ {len(images_with_data)} images téléchargées et sauvegardées avec succès")
        
        if not images_with_data:
            print("⚠️ Aucune image téléchargée, retour vide")
            return []
        
        # Demander à Gemini de filtrer les images de produits
        prompt_text = """Analyse ces images et identifie lesquelles sont des images de PRODUITS ALIMENTAIRES (nourriture, plats, ingrédients, etc.).

Exclut:
- Logos d'entreprise
- Images décoratives
- Photos d'équipe
- Images de bâtiments
- Icônes

Retourne un JSON avec cette structure:
{
  "productImages": [
    {"index": 0, "isProduct": true, "description": "description du produit"},
    {"index": 1, "isProduct": false, "reason": "logo d'entreprise"}
  ]
}

Les indices correspondent à l'ordre des images fournies (0 = première image, 1 = deuxième, etc.)"""
        
        prompt_parts = [prompt_text]
        
        # Ajouter les images au prompt
        for img in images_with_data:
            prompt_parts.append(
                types.Part.from_bytes(
                    data=img['data'],
                    mime_type=img['mime_type']
                )
            )
        
        try:
            print(f"\n🤖 Envoi de {len(images_with_data)} images à Gemini pour filtrage...")
            print(f"📤 PROMPT FILTRAGE IMAGES:")
            print(f"{'─'*60}")
            print(prompt_text)
            print(f"{'─'*60}\n")
            
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                response_mime_type="application/json"
            )
            
            response = self.client.models.generate_content(
                model=MODEL,
                contents=prompt_parts,
                config=config
            )
            
            result_text = response.text.strip()
            
            print(f"📥 RÉPONSE GEMINI (filtrage images):")
            print(f"{'─'*60}")
            print(result_text)
            print(f"{'─'*60}\n")
            
            # Nettoyer le JSON
            if result_text.startswith('```'):
                result_text = re.sub(r'^```(?:json)?\s*\n', '', result_text)
                result_text = re.sub(r'\n```\s*$', '', result_text)
            
            result = json.loads(result_text)
            product_images = result.get('productImages', [])
            
            print(f"📊 RÉSULTAT DU FILTRAGE:")
            print(f"   - Images analysées: {len(images_with_data)}")
            for item in product_images:
                idx = item.get('index', -1)
                is_product = item.get('isProduct', False)
                desc = item.get('description', item.get('reason', ''))
                status = "✅ PRODUIT" if is_product else "❌ NON-PRODUIT"
                print(f"   [{idx}] {status}: {desc[:60]}")
            
            # Filtrer et retourner seulement les images de produits
            filtered = []
            for item in product_images:
                if item.get('isProduct', False):
                    idx = item.get('index', -1)
                    if 0 <= idx < len(images_with_data):
                        filtered.append(images_with_data[idx])
            
            print(f"✅ {len(filtered)} images de produits identifiées et conservées")
            print(f"{'='*60}\n")
            return filtered
            
        except Exception as e:
            print(f"⚠️ Erreur lors du filtrage des images: {e}")
            # Si le filtrage échoue, considérer toutes les images téléchargées comme des produits potentiels
            print(f"   🔄 Fallback: considérer toutes les {len(images_with_data)} images téléchargées comme produits potentiels")
            # Retourner toutes les images téléchargées (fallback)
            return images_with_data[:10]
    
    def extract_navigation_links(self, soup: BeautifulSoup, current_url: str) -> List[str]:
        """Extrait tous les liens de navigation de la page"""
        links = set()
        all_links_found = 0
        for a in soup.find_all('a', href=True):
            all_links_found += 1
            href = a.get('href')
            normalized = self.normalize_url(href)
            if normalized and self.is_same_domain(normalized):
                links.add(normalized)
        links_list = list(links)
        print(f"   🔍 Liens extraits: {len(links_list)} (sur {all_links_found} liens totaux trouvés)")
        return links_list
    
    def extract_navigation_links_selenium(self, driver, current_url: str) -> List[str]:
        """Extrait les liens de navigation avec Selenium (après gestion des popups)"""
        try:
            links = set()
            
            # Attendre un peu pour s'assurer que tous les liens sont chargés
            time.sleep(5)
            
            # Trouver tous les liens <a>
            elements = driver.find_elements(By.TAG_NAME, "a")
            print(f"   🔍 {len(elements)} éléments <a> trouvés")
            
            for i, element in enumerate(elements):
                try:
                    href = element.get_attribute('href')
                    if href:
                        normalized = self.normalize_url(href)
                        if normalized and self.is_same_domain(normalized):
                            links.add(normalized)
                            if len(links) <= 5:  # Afficher les 5 premiers
                                text = element.text.strip()[:30]
                                print(f"      [{len(links)}] {normalized[:60]}... ({text})")
                except Exception as e:
                    if i < 5:  # Log seulement les premières erreurs
                        print(f"      ⚠️ Erreur élément {i}: {e}")
                    continue
            
            links_list = list(links)
            print(f"   ✅ {len(links_list)} liens uniques extraits (Selenium)")
            
            # Si aucun lien trouvé, essayer de scroller pour charger du contenu dynamique
            if len(links_list) == 0:
                print(f"   🔄 Aucun lien trouvé, tentative de scroll pour charger du contenu...")
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(4)
                driver.execute_script("window.scrollTo(0, 0);")
                time.sleep(2)
                
                # Réessayer
                elements = driver.find_elements(By.TAG_NAME, "a")
                for element in elements:
                    try:
                        href = element.get_attribute('href')
                        if href:
                            normalized = self.normalize_url(href)
                            if normalized and self.is_same_domain(normalized):
                                links.add(normalized)
                    except:
                        continue
                links_list = list(links)
                print(f"   ✅ Après scroll: {len(links_list)} liens trouvés")
            
            return links_list
        except Exception as e:
            print(f"   ⚠️ Erreur extraction liens Selenium: {e}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            return []
    
    def call_gemini(self, prompt: str, schema: Optional[Dict] = None, show_prompt: bool = True) -> Dict:
        """Appelle l'API Gemini avec le prompt et le schéma"""
        try:
            if show_prompt:
                print(f"\n{'─'*60}")
                print(f"📤 PROMPT ENVOYÉ À GEMINI:")
                print(f"{'─'*60}")
                if isinstance(prompt, list):
                    # Si c'est une liste (multimodal), afficher le texte et les images
                    for i, part in enumerate(prompt):
                        if isinstance(part, str):
                            print(f"[Part {i+1} - Text]:")
                            print(part[:2000] + ("..." if len(part) > 2000 else ""))
                        else:
                            print(f"[Part {i+1} - Image]: {type(part)}")
                else:
                    print(prompt[:2000] + ("..." if len(prompt) > 2000 else ""))
                if schema:
                    print(f"\n📋 Schéma JSON requis: {json.dumps(schema, indent=2)[:500]}...")
                print(f"{'─'*60}\n")
            
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=-1),
                response_mime_type="application/json",
            )
            
            if schema:
                config.response_json_schema = schema
            
            response = self.client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=config
            )
            
            result_text = response.text.strip()
            
            if show_prompt:
                print(f"\n{'─'*60}")
                print(f"📥 RÉPONSE DE GEMINI:")
                print(f"{'─'*60}")
                print(result_text[:3000] + ("..." if len(result_text) > 3000 else ""))
                print(f"{'─'*60}\n")
            
            # Nettoyer le JSON (enlever les markdown code blocks si présents)
            if result_text.startswith('```'):
                result_text = re.sub(r'^```(?:json)?\s*\n', '', result_text)
                result_text = re.sub(r'\n```\s*$', '', result_text)
            
            parsed = json.loads(result_text)
            
            # Valider que le résultat n'est pas vide (seulement pour les schémas d'extraction, pas pour choose_next_pages)
            # Le schéma d'extraction a companyInfo et products, le schéma choose_next_pages a selectedLinks
            if schema and schema.get('properties', {}).get('companyInfo'):
                # C'est un schéma d'extraction - valider companyInfo/products
                if not parsed or (not parsed.get('companyInfo') and not parsed.get('products')):
                    print(f"⚠️ ATTENTION: Gemini a retourné un résultat vide ou invalide")
                    print(f"   Résultat: {json.dumps(parsed, indent=2)[:500]}")
                    # Retourner une structure valide mais vide plutôt que {}
                    return {
                        "companyInfo": {},
                        "products": []
                    }
            elif schema and schema.get('properties', {}).get('selectedLinks'):
                # C'est un schéma choose_next_pages - valider selectedLinks
                if not parsed or not parsed.get('selectedLinks'):
                    print(f"⚠️ ATTENTION: Gemini n'a pas retourné de selectedLinks")
                    print(f"   Résultat: {json.dumps(parsed, indent=2)[:500]}")
                    # Retourner une structure valide mais vide
                    return {
                        "selectedLinks": [],
                        "reasoning": "",
                        "shouldContinue": False
                    }
            
            return parsed
        except json.JSONDecodeError as e:
            print(f"\n❌ ERREUR de parsing JSON de la réponse Gemini:")
            print(f"   Erreur: {e}")
            print(f"   Texte reçu: {result_text[:500] if 'result_text' in locals() else 'N/A'}")
            print(f"{'─'*60}\n")
            # Retourner une structure valide mais vide
            return {
                "companyInfo": {},
                "products": []
            }
        except Exception as e:
            print(f"\n❌ ERREUR lors de l'appel Gemini:")
            print(f"   Erreur: {e}")
            print(f"   Type: {type(e).__name__}")
            if 'response' in locals():
                try:
                    print(f"   Réponse brute: {response.text[:1000] if hasattr(response, "text") else "N/A"}")
                except:
                    pass
            print(f"{'─'*60}\n")
            # Retourner une structure valide mais vide plutôt que {}
            return {
                "companyInfo": {},
                "products": []
            }
    
    def extract_data_from_page(self, url: str, soup: BeautifulSoup, existing_data: Optional[Dict] = None, visited_urls_context: Optional[List[str]] = None, contact_info: Optional[Dict] = None) -> Dict:
        """Extrait les données d'une page en utilisant Gemini, en générant un schéma complet amélioré basé sur toutes les données existantes"""
        print(f"\n{'='*60}")
        print(f"🤖 EXTRACTION ET AMÉLIORATION DES DONNÉES")
        print(f"{'='*60}")
        print(f"📍 URL actuelle: {url}")
        
        if existing_data:
            existing_products = len(existing_data.get('products', []))
            print(f"📊 Données existantes: {existing_products} produits déjà trouvés")
            if visited_urls_context:
                print(f"📚 Contexte: {len(visited_urls_context)} pages analysées précédemment")
        
        # Extraire tous les liens de la page (navigation + autres)
        all_links = []
        for a in soup.find_all('a', href=True):
            href = a.get('href')
            link_text = a.get_text(strip=True)
            if href:
                # Normaliser l'URL
                normalized = self.normalize_url(href)
                if normalized:
                    all_links.append({
                        "url": normalized,
                        "text": link_text[:100] if link_text else "",  # Limiter le texte à 100 caractères
                        "is_external": not self.is_same_domain(normalized)
                    })
        
        # Extraire aussi les liens mailto:, tel:, et Google Maps
        contact_links = []
        for a in soup.find_all('a', href=True):
            href = a.get('href', '')
            link_text = a.get_text(strip=True)
            if href.startswith('mailto:') or href.startswith('tel:') or 'google.com/maps' in href or 'maps.google.com' in href:
                contact_links.append({
                    "type": "mailto" if href.startswith('mailto:') else "tel" if href.startswith('tel:') else "maps",
                    "href": href,
                    "text": link_text[:100] if link_text else ""
                })
        
        print(f"🔗 Liens trouvés: {len(all_links)} liens de navigation, {len(contact_links)} liens de contact")
        
        # Extraire les informations de contact depuis les liens (mailto:, tel:, maps)
        # Utiliser contact_info passé en paramètre ou l'extraire si non fourni
        if contact_info is None:
            contact_info = self.extract_contact_info_from_links(soup)
        
        # Extraire le contenu
        visible_text = self.extract_visible_text(soup)
        print(f"📝 Texte extrait: {len(visible_text)} caractères")
        
        all_images = self.extract_images(soup, url)
        print(f"🖼️ Images trouvées: {len(all_images)}")
        
        # Identifier les logos séparément (ne pas les inclure dans les produits)
        logo_images = [img for img in all_images if img.get('is_logo', False)]
        non_logo_images = [img for img in all_images if not img.get('is_logo', False)]
        
        if logo_images:
            print(f"🏢 {len(logo_images)} image(s) de logo identifiée(s)")
            for logo_img in logo_images[:3]:  # Afficher les 3 premiers
                print(f"   🏢 Logo potentiel: {logo_img['url'][:80]}...")
        
        # Filtrer pour ne garder que les images de produits (exclure les logos)
        # Cette fonction télécharge déjà les images pour Gemini, on les sauvegarde directement
        product_images = self.filter_product_images(non_logo_images, url)
        
        # Stocker les vraies URLs d'images de produits pour cette page avec leurs chemins locaux
        # On garde les URLs originales ET les chemins locaux des images identifiées comme produits
        self.page_product_images[url] = [
            {
                "url": img["url"], 
                "alt": img.get("alt", ""), 
                "is_product": True,
                "index": i,  # Garder l'index pour référence
                "local_path": img.get("local_path")  # Chemin local si l'image a été téléchargée
            }
            for i, img in enumerate(product_images)
        ]
        
        # Stocker aussi les images de logo séparément pour référence ultérieure
        if logo_images:
            self.page_logo_images[url] = [
                {
                    "url": img["url"],
                    "alt": img.get("alt", ""),
                    "is_logo": True,
                    "local_path": None  # Sera téléchargé plus tard si nécessaire
                }
                for img in logo_images
            ]
        
        # Limiter le texte à 50000 caractères pour éviter les tokens excessifs
        visible_text_limited = visible_text[:50000]
        if len(visible_text) > 50000:
            print(f"⚠️ Texte tronqué à 50000 caractères (original: {len(visible_text)})")
        
        # Construire le prompt avec TOUTES les données existantes
        existing_data_context = ""
        if existing_data:
            # Passer TOUTES les données existantes (pas juste un résumé)
            existing_company = existing_data.get('companyInfo', {})
            existing_products_all = existing_data.get('products', [])
            
            # Construire le contexte avec toutes les données
            existing_data_json = json.dumps({
                "companyInfo": existing_company,
                "products": existing_products_all
            }, ensure_ascii=False, indent=2)
            
            # Limiter la taille si trop grande (mais garder le maximum possible)
            if len(existing_data_json) > 30000:
                # Garder companyInfo complet + résumé des produits
                products_summary = [{"name": p.get("name"), "description": p.get("description", "")[:100]} for p in existing_products_all]
                existing_data_json = json.dumps({
                    "companyInfo": existing_company,
                    "products": products_summary,
                    "totalProducts": len(existing_products_all),
                    "note": "Liste complète des produits disponible dans le contexte"
                }, ensure_ascii=False, indent=2)
            
            visited_context = ""
            if visited_urls_context and len(visited_urls_context) > 0:
                # Afficher les 5 dernières URLs pour le contexte
                recent_urls = visited_urls_context[-5:] if len(visited_urls_context) > 5 else visited_urls_context
                visited_context = f"""
CONTEXTE DES ANALYSES PRÉCÉDENTES:
Les données existantes proviennent de l'analyse de {len(visited_urls_context)} page(s) précédente(s):
{chr(10).join([f"- {u}" for u in recent_urls])}
"""
            
            existing_data_context = f"""

═══════════════════════════════════════════════════════════════
DONNÉES COMPLÈTES DÉJÀ COLLECTÉES (de toutes les pages précédentes)
═══════════════════════════════════════════════════════════════
{visited_context}
{existing_data_json}

═══════════════════════════════════════════════════════════════
INSTRUCTIONS CRITIQUES POUR L'AMÉLIORATION:
═══════════════════════════════════════════════════════════════

Tu dois générer un NOUVEAU schéma JSON COMPLET et AMÉLIORÉ qui combine:
1. TOUTES les données existantes ci-dessus (ne perds aucune information)
2. Les NOUVELLES données trouvées sur cette page actuelle

RÈGLES D'AMÉLIORATION:
- CONSERVE tous les produits existants (ne les supprime pas)
- AMÉLIORE les produits existants si tu trouves plus de détails (prix, descriptions, images, etc.)
- AJOUTE les nouveaux produits trouvés sur cette page
- REMPLACE les informations entreprise si tu trouves des versions plus complètes/précises
- COMBINE intelligemment les informations de toutes les sources
- Élimine les doublons (produits avec le même nom)
- Utilise les meilleures descriptions, images, et détails disponibles

Le résultat final doit être le schéma JSON LE PLUS COMPLET POSSIBLE avec toutes les données améliorées.
"""
        
        # Préparer la liste des liens pour Gemini (limiter à 100 pour éviter les tokens excessifs)
        links_for_gemini = all_links[:100]  # Limiter à 100 liens
        links_text = "\n".join([
            f"- {link['url']} (texte: '{link['text']}')" + (" [EXTERNE]" if link['is_external'] else "")
            for link in links_for_gemini
        ])
        
        # Préparer les liens de contact
        contact_links_text = "\n".join([
            f"- {link['type'].upper()}: {link['href']} (texte: '{link['text']}')"
            for link in contact_links
        ])
        
        prompt_parts = [
            f"""Analyse cette page web d'un fournisseur alimentaire et extrais les informations selon le schéma JSON fourni.

URL de la page: {url}
{existing_data_context}
TEXTE VISIBLE DE LA PAGE:
{visible_text_limited}

LIENS DISPONIBLES SUR CETTE PAGE:
{links_text}

LIENS DE CONTACT TROUVÉS:
{contact_links_text}

INSTRUCTIONS CRITIQUES:
1. Extrait UNIQUEMENT les données réelles qui existent sur la page
2. NE crée PAS de données fictives ou d'exemples
3. Si une information n'est pas trouvée, laisse le champ vide ou null (pas la string "null")
   - IMPORTANT: Ne mets RIEN dans le champ si la valeur n'existe pas (null, undefined, ou champ absent)
   - Ne crée PAS de valeurs fictives ou d'exemples
   - Si un champ n'est pas trouvé, il doit être absent du JSON ou avoir la valeur null (pas la string "null")
4. Pour les descriptions, utilise le français
5. Pour les prix, si non trouvés, mets 0 (nombre, pas string)
6. **PRIORITÉ ABSOLUE**: Extrais TOUS les produits mentionnés ou visibles sur cette page
   - Cherche dans les listes, tableaux, grilles de produits
   - Cherche dans les sections "Nos produits", "Catalogue", "Menu", "Gamme", "Produits", "Notre gamme", "Nos spécialités"
   - Cherche dans les descriptions de produits, les titres, les noms de sections
   - Cherche dans les noms de fichiers d'images qui pourraient indiquer des produits
   - Si tu vois des noms de produits dans le texte (même juste mentionnés), crée un produit pour chacun avec au minimum le nom
   - Même si un produit n'a pas d'image ou de prix, crée-le quand même avec le nom et la description si disponible
   - Si tu vois des catégories de produits (ex: "Tartes", "Salades", "Pâtés"), crée des produits pour chaque catégorie mentionnée
   - IMPORTANT: Ne retourne JAMAIS une liste de produits vide si tu vois des mentions de produits sur la page, même minimales
   - **PRODUITS POUR CAMPAGNES DE FINANCEMENT SCOLAIRE**: Privilégie et marque les produits adaptés aux campagnes scolaires:
     * Produits populaires auprès des familles (tartes, pâtés, fromages, desserts, produits locaux du Québec)
     * Produits avec un bon rapport qualité-prix (faciles à vendre, prix raisonnables)
     * Produits qui se conservent bien (congelables, longue durée de vie, résistants au transport)
     * Produits du Québec ou locaux (forte demande dans les écoles québécoises)
     * Produits avec packaging pratique (faciles à distribuer, portions familiales)
     * ÉVITE les produits trop spécialisés, fragiles, avec courte durée de vie, ou difficiles à transporter
7. Analyse les images de produits fournies pour extraire (COMBINÉ AVEC L'EXTRACTION DE DONNÉES):
   - Le nom du produit (si visible sur l'image ou dans le texte associé)
   - La description visuelle du produit
   - Les informations nutritionnelles (si présentes sur l'étiquette)
   - Les ingrédients (si visibles sur l'image)
   - Le type de produit (tarte, salade, pâté, dessert, etc.)
8. Pour les images de produits, utilise les URLs complètes (absolues)
9. Associe chaque image de produit au produit correspondant dans le texte
10. Pour companyInfo (PRIORITÉ ABSOLUE pour l'adresse et le logo):
    - **ADRESSE**: Cherche l'adresse complète. PRIORITÉ:
      1. Analyse les liens Google Maps dans "LIENS DE CONTACT TROUVÉS" - ils contiennent souvent l'adresse complète
      2. Cherche dans le texte visible (sections "Contact", "Nous joindre", "Coordonnées", "À propos", footer)
      3. Format typique: "123 rue Nom, Ville, Province, Code postal, Canada"
      4. Si tu vois une adresse, EXTRAIS-LA COMPLÈTEMENT (rue, ville, code postal, province)
    - **LOGO**: Cherche le logo de l'entreprise. PRIORITÉ:
      1. Analyse les liens dans "LIENS DISPONIBLES" qui pointent vers des pages comme "/logo", "/images/logo", "/assets/logo"
      2. Cherche dans le header (en haut de la page) - PRIORITÉ ABSOLUE
      3. Dans le footer
      4. Sur la page d'accueil
      5. Format: URL complète de l'image (commence par http:// ou https://)
      6. Le logo est généralement une image simple, pas une photo de produit
      7. IMPORTANT: Ne confonds PAS le logo avec des images de produits (tartes, salades, etc.)
      8. Le logo est généralement plus petit et stylisé, pas une photo réaliste de nourriture
    - **EMAIL**: Cherche l'email. PRIORITÉ:
      1. Analyse les liens "mailto:" dans "LIENS DE CONTACT TROUVÉS" - ils contiennent l'email directement
      2. Cherche dans le texte visible (format: xxx@xxx.com)
      3. Cherche dans les sections "Contact", "Nous joindre", footer
    - **TÉLÉPHONE**: Cherche le téléphone. PRIORITÉ:
      1. Analyse les liens "tel:" dans "LIENS DE CONTACT TROUVÉS" - ils contiennent le téléphone directement
      2. Cherche dans le texte visible (formats: (xxx) xxx-xxxx, xxx-xxx-xxxx, etc.)
      3. Cherche dans les sections "Contact", "Nous joindre", footer
    - **DESCRIPTION**: Cherche une description détaillée de l'entreprise

IMPORTANT: 
- Si tu vois plusieurs produits mentionnés (même juste par nom), crée un produit pour chacun avec au minimum le nom. Tu peux compléter les autres champs si disponibles.
- **ANALYSE LES LIENS**: Les sections "LIENS DISPONIBLES SUR CETTE PAGE" et "LIENS DE CONTACT TROUVÉS" contiennent des informations importantes. 
  * Analyse chaque lien pour déterminer s'il contient des informations utiles (adresse, logo, email, téléphone, produits, etc.)
  * Les liens Google Maps contiennent souvent l'adresse complète dans l'URL
  * Les liens mailto: contiennent l'email directement
  * Les liens tel: contiennent le téléphone directement
  * Les liens vers des pages comme "/logo", "/images/logo" peuvent pointer vers le logo
  * Utilise ces informations pour remplir le schéma JSON

Retourne un objet JSON conforme au schéma fourni."""
        ]
        
        # Ajouter les images de produits au prompt pour analyse visuelle
        images_added = 0
        for img in product_images[:5]:  # Limiter à 5 images pour éviter les tokens excessifs
            if 'data' in img:
                try:
                    prompt_parts.append(
                        types.Part.from_bytes(
                            data=img['data'],
                            mime_type=img.get('mime_type', 'image/jpeg')
                        )
                    )
                    images_added += 1
                    print(f"   ✅ Image ajoutée au prompt: {img['url'][:80]}...")
                except Exception as e:
                    print(f"   ⚠️ Erreur ajout image au prompt: {e}")
        
        print(f"📤 Total: 1 partie texte + {images_added} images")
        
        # Appeler Gemini avec texte + images
        try:
            print(f"\n🤖 ENVOI À GEMINI POUR EXTRACTION...")
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=-1),
                response_mime_type="application/json",
                response_json_schema=EXTRACTION_SCHEMA
            )
            
            # Afficher le prompt texte
            print(f"📤 PROMPT D'EXTRACTION (texte):")
            print(f"{'─'*60}")
            print(prompt_parts[0][:2000] + ("..." if len(prompt_parts[0]) > 2000 else ""))
            print(f"{'─'*60}")
            print(f"📋 Schéma JSON requis: {len(json.dumps(EXTRACTION_SCHEMA))} caractères")
            print(f"🖼️ Images incluses: {images_added}")
            print(f"{'─'*60}\n")
            
            response = self.client.models.generate_content(
                model=MODEL,
                contents=prompt_parts,
                config=config
            )
            
            result_text = response.text.strip()
            
            print(f"📥 RÉPONSE GEMINI (extraction):")
            print(f"{'─'*60}")
            print(result_text[:3000] + ("..." if len(result_text) > 3000 else ""))
            print(f"{'─'*60}\n")
            
            # Nettoyer le JSON
            if result_text.startswith('```'):
                result_text = re.sub(r'^```(?:json)?\s*\n', '', result_text)
                result_text = re.sub(r'\n```\s*$', '', result_text)
            
            parsed = json.loads(result_text)
            
            # Enrichir les informations de l'entreprise avec les données extraites des liens
            if contact_info:
                company_info = parsed.get('companyInfo', {})
                # Ajouter l'email si trouvé dans les liens et pas déjà présent
                if contact_info.get('email') and (not company_info.get('email') or str(company_info.get('email')).lower() in ["null", "none", ""]):
                    company_info['email'] = contact_info['email']
                    print(f"   ✨ Email ajouté depuis mailto: {contact_info['email']}")
                # Ajouter le téléphone si trouvé dans les liens et pas déjà présent
                if contact_info.get('phone') and (not company_info.get('phone') or str(company_info.get('phone')).lower() in ["null", "none", ""]):
                    company_info['phone'] = contact_info['phone']
                    print(f"   ✨ Téléphone ajouté depuis tel: {contact_info['phone']}")
                # Ajouter l'adresse si trouvée dans les liens et pas déjà présente
                if contact_info.get('address') and (not company_info.get('address') or str(company_info.get('address')).lower() in ["null", "none", ""]):
                    company_info['address'] = contact_info['address']
                    print(f"   ✨ Adresse ajoutée depuis Google Maps: {contact_info['address'][:50]}...")
                parsed['companyInfo'] = company_info
            
            # Corriger les URLs d'images des produits en utilisant les vraies URLs trouvées
            # Gemini peut retourner des URLs incorrectes, on les remplace par les vraies
            if url in self.page_product_images:
                page_images = self.page_product_images[url]
                product_image_urls = [img["url"] for img in page_images if img.get("is_product")]
                
                # Pour chaque produit, essayer de corriger l'URL de l'image
                for product in parsed.get('products', []):
                    product_name = product.get('name', '').lower()
                    current_image = product.get('image', '')
                    
                    # Si l'image est "null" ou invalide, chercher une correspondance
                    if not current_image or str(current_image).lower() in ["null", "none", ""]:
                        # Chercher une image correspondante par nom de produit
                        product_terms = [term for term in product_name.split() if len(term) > 3]
                        for img_url in product_image_urls:
                            img_url_lower = img_url.lower()
                            # Vérifier si le nom du produit est dans l'URL
                            if any(term in img_url_lower for term in product_terms):
                                product['image'] = img_url
                                break
                            # Vérifier aussi par catégorie
                            category = product.get('category', '').lower()
                            if category and len(category) > 3 and category in img_url_lower:
                                product['image'] = img_url
                                break
                        # Si toujours pas trouvé, prendre la première image disponible
                        if (not product.get('image') or str(product.get('image')).lower() in ["null", "none", ""]) and product_image_urls:
                            product['image'] = product_image_urls[0]
                    else:
                        # Normaliser l'URL existante
                        product['image'] = self.normalize_image_url(current_image)
            
            # Afficher un résumé de ce qui a été extrait
            products_count = len(parsed.get('products', []))
            company_info = parsed.get('companyInfo', {})
            company_fields_filled = len([k for k, v in company_info.items() if v and str(v).lower() not in ["null", "none", ""]])
            
            print(f"📊 RÉSULTAT DE L'EXTRACTION:")
            print(f"   - Produits extraits: {products_count}")
            print(f"   - Champs entreprise remplis: {company_fields_filled}/{len(company_info)}")
            if products_count > 0:
                print(f"   - Noms des produits: {[p.get('name', 'N/A')[:30] for p in parsed.get('products', [])[:5]]}")
            print(f"{'='*60}\n")
            
            # Valider que le résultat n'est pas vide
            if not parsed or (not parsed.get('companyInfo') and not parsed.get('products')):
                print(f"⚠️ ATTENTION: Résultat vide après extraction avec images")
                # Essayer sans images comme fallback
                print(f"🔄 Fallback: essai sans images...")
                prompt_text = prompt_parts[0]
                fallback_result = self.call_gemini(prompt_text, EXTRACTION_SCHEMA, show_prompt=True)
                if fallback_result and (fallback_result.get('companyInfo') or fallback_result.get('products')):
                    return fallback_result
                # Si le fallback est aussi vide, retourner quand même le résultat
                return parsed if parsed else {"companyInfo": {}, "products": []}
            
            return parsed
        except Exception as e:
            print(f"❌ Error calling Gemini with images: {e}")
            print(f"   Stack trace: {e.__class__.__name__}")
            # Fallback: essayer sans images
            print(f"🔄 Fallback: essai sans images...")
        try:
            prompt_text = prompt_parts[0]
            fallback_result = self.call_gemini(prompt_text, EXTRACTION_SCHEMA, show_prompt=True)
            if fallback_result and (fallback_result.get('companyInfo') or fallback_result.get('products')):
                return fallback_result
        except Exception as fallback_error:
            print(f"❌ Erreur aussi dans le fallback: {fallback_error}")
            # Retourner une structure valide mais vide
            return {
                "companyInfo": {},
                "products": []
            }
    
    def find_missing_fields(self, current_data: Dict) -> List[str]:
        """Identifie les champs manquants dans les données actuelles"""
        missing = []
        
        # Vérifier companyInfo (exclure les valeurs "null" string)
        company_info = current_data.get("companyInfo", {})
        required_company_fields = ["name", "email", "phone", "address", "logo", "description"]
        for field in required_company_fields:
            value = company_info.get(field)
            # Considérer comme manquant si None, "", "null", ou "None"
            if not value or str(value).lower() in ["null", "none", ""]:
                missing.append(f"companyInfo.{field}")
        
        # Chercher plus de produits seulement si on n'a pas atteint le minimum
        products = current_data.get("products", [])
        if len(products) < MIN_PRODUCTS_TARGET:
            missing.append(f"products (seulement {len(products)} produits trouvés, objectif: {MIN_PRODUCTS_TARGET})")
        
        return missing
    
    def choose_next_pages(self, navigation_links: List[str], missing_fields: List[str], visited: Set[str], current_products_count: int) -> List[str]:
        """Demande à Gemini quels liens pourraient contenir les champs manquants"""
        new_links = [link for link in navigation_links if link not in visited]
        
        print(f"🔍 Analyse de {len(new_links)} nouveaux liens (déjà visité: {len(visited)})")
        
        if not new_links:
            print("⚠️ Aucun nouveau lien disponible")
            return []
        
        # Limiter drastiquement le nombre de liens à analyser (5 pages max = ultra-stratégique)
        # Analyser seulement les liens les plus prometteurs
        links_to_analyze = new_links[:20]  # Limité à 20 liens pour être ultra-stratégique
        
        print(f"🤖 Demande à Gemini d'analyser {len(links_to_analyze)} liens pour trouver:")
        for field in missing_fields:
            print(f"   - {field}")
        
        prompt = f"""Tu es un agent de navigation web intelligent pour un site de fournisseur alimentaire. Tu dois choisir quels liens de navigation pourraient contenir les informations manquantes suivantes:

INFORMATIONS MANQUANTES:
{chr(10).join([f"- {field}" for field in missing_fields])}

PRODUITS ACTUELLEMENT TROUVÉS: {current_products_count} (objectif: {MIN_PRODUCTS_TARGET})

LIENS DISPONIBLES (non encore visités):
{chr(10).join([f"{i+1}. {link}" for i, link in enumerate(links_to_analyze)])}

INSTRUCTIONS ULTRA-STRATÉGIQUES (5 PAGES MAXIMUM):
⚠️ CONTRAINTE CRITIQUE: Tu ne peux sélectionner que 2-3 liens MAXIMUM car on a seulement 5 pages au total!
Chaque page doit être absolument essentielle et maximiser les données extraites.

1. **STRATÉGIE PRODUITS (PRIORITÉ #1)**:
   - Si moins de {MIN_PRODUCTS_TARGET} produits: Sélectionne UNIQUEMENT la page de catalogue/catégories principale
   - Cherche UN lien qui contient: "produits", "catalogue", "menu", "nos produits", "gamme", "collection", "assortiment"
   - ÉVITE les pages individuelles de produits - privilégie les pages de catégories qui listent plusieurs produits
   - Si tu vois "/produits" ou "/catalogue" ou "/menu" - c'est LE lien à choisir
   - **IMPORTANT - PRODUITS POUR CAMPAGNES SCOLAIRES**: Privilégie les pages qui contiennent des produits adaptés aux campagnes de financement scolaire:
     * Produits populaires auprès des familles (tartes, pâtés, fromages, desserts, produits locaux)
     * Produits avec un bon rapport qualité-prix (faciles à vendre)
     * Produits qui se conservent bien (congelables, longue durée de vie)
     * Produits du Québec ou locaux (forte demande dans les écoles)
     * ÉVITE les produits trop spécialisés, fragiles, ou avec une courte durée de vie
   
2. **STRATÉGIE CONTACT/ENTREPRISE (PRIORITÉ #2)**:
   - Si email/phone/adresse manquent: Sélectionne UNIQUEMENT "contact" ou "nous joindre"
   - Si logo manque: La page d'accueil ou "à propos" suffit généralement
   - UNE SEULE page contact suffit - ne sélectionne pas plusieurs pages similaires

3. **RÈGLE D'OR - SÉLECTION ULTRA-SÉLECTIVE**:
   - Page 1 (accueil): Déjà visitée
   - Page 2: Choisis SOIT la page catalogue SOIT la page contact (selon ce qui manque le plus)
   - Page 3: Choisis l'autre (catalogue OU contact)
   - Page 4-5: Seulement si absolument nécessaire pour combler des champs critiques manquants
   
4. **ÉVITE ABSOLUMENT**:
   - Pages individuelles de produits (trop spécifiques)
   - Pages de blog, recettes, actualités
   - Pages légales (mentions, politique)
   - Réseaux sociaux, liens externes
   - Pages "à propos" si on a déjà contact
   - Pages redondantes (plusieurs pages contact)

5. **DÉCISION STRATÉGIQUE**:
   - Si 0 produits: Page catalogue = PRIORITÉ ABSOLUE (choisir 1 lien catalogue)
   - Si produits OK mais contact manque: Page contact = PRIORITÉ (choisir 1 lien contact)
   - Si tout est OK: shouldContinue = false (arrêter)

6. **QUANTITÉ MAXIMALE**:
   - Sélectionne 2-3 liens MAXIMUM par appel
   - Privilégie 1 lien de catalogue + 1 lien de contact = 2 liens idéal
   - Ne jamais sélectionner plus de 3 liens

Analyse les URLs et sélectionne UNIQUEMENT les 2-3 liens les plus critiques qui maximiseront les données extraites.

Retourne un JSON avec cette structure:
{{
  "selectedLinks": ["url1", "url2"],  // MAXIMUM 2-3 liens!
  "reasoning": "Explication stratégique: pourquoi ces 2-3 liens spécifiques sont les plus critiques",
  "shouldContinue": true/false  // false si on a assez de données ou si les liens restants ne sont pas essentiels
}}

⚠️ RAPPEL: Tu as seulement 5 pages au total. Chaque sélection doit être parfaitement stratégique."""

        schema = {
            "type": "object",
            "properties": {
                "selectedLinks": {"type": "array", "items": {"type": "string"}},
                "reasoning": {"type": "string"},
                "shouldContinue": {"type": "boolean"}
            },
            "required": ["selectedLinks", "reasoning", "shouldContinue"]
        }
        
        try:
            print(f"\n{'='*60}")
            print(f"🧠 SÉLECTION DES PAGES PAR GEMINI")
            print(f"{'='*60}")
            result = self.call_gemini(prompt, schema, show_prompt=True)
            
            selected = result.get("selectedLinks", [])
            reasoning = result.get("reasoning", "")
            should_continue = result.get("shouldContinue", True)
            
            print(f"💭 RAISONNEMENT DE GEMINI (MODE ULTRA-STRATÉGIQUE):")
            print(f"{'─'*60}")
            print(reasoning[:500] + ("..." if len(reasoning) > 500 else ""))
            print(f"{'─'*60}\n")
            
            # Filtrer pour ne garder que les liens valides
            valid_selected = [link for link in selected if link in links_to_analyze]
            
            # Limiter à 3 liens maximum (mode ultra-stratégique - 5 pages max)
            if len(valid_selected) > 3:
                print(f"⚠️ Gemini a sélectionné {len(valid_selected)} liens, limité à 3 maximum (mode ultra-stratégique)")
                valid_selected = valid_selected[:3]
            
            # Vérifier les liens invalides
            invalid_links = [link for link in selected if link not in links_to_analyze]
            if invalid_links:
                print(f"⚠️ {len(invalid_links)} liens invalides (non dans la liste): {invalid_links[:3]}")
            
            # Si Gemini dit qu'il n'y a plus de liens utiles ET qu'on n'a pas de liens valides sélectionnés
            if not should_continue and len(valid_selected) == 0:
                print("🛑 Gemini indique qu'il n'y a plus de pages utiles à explorer (et aucun lien valide sélectionné)")
                return []
            
            # Si Gemini dit de continuer mais n'a pas sélectionné de liens, on continue quand même avec les liens disponibles
            if should_continue and len(valid_selected) == 0:
                print("⚠️ Gemini dit de continuer mais n'a sélectionné aucun lien - utilisation des liens disponibles")
                # Prendre les premiers liens non visités qui semblent pertinents
                product_keywords = ["produit", "catalogue", "menu", "gamme", "collection", "assortiment"]
                fallback = [link for link in links_to_analyze[:10] 
                           if any(kw in link.lower() for kw in product_keywords) 
                           and link not in visited]
                if fallback:
                    return fallback[:2]  # Maximum 2 liens en fallback (mode ultra-stratégique)
                return links_to_analyze[:2]  # Dernier recours: 2 liens max
            
            # Afficher les résultats et retourner
            if valid_selected:
                print(f"✅ {len(valid_selected)} liens sélectionnés par Gemini (mode ultra-stratégique):")
                for i, link in enumerate(valid_selected, 1):
                    print(f"   {i}. {link}")
            print(f"🔄 Continuer l'exploration: {should_continue}")
            print(f"{'='*60}\n")
            
            # Retourner les liens sélectionnés (déjà limités à 3 maximum)
            return valid_selected
        except Exception as e:
            print(f"⚠️ Erreur lors de la sélection des pages: {e}")
            # Fallback: prendre les premiers liens qui semblent pertinents
            product_keywords = ["produit", "catalogue", "menu", "gamme", "collection", "assortiment"]
            fallback_links = []
            for link in links_to_analyze[:10]:
                link_lower = link.lower()
                if any(keyword in link_lower for keyword in product_keywords):
                    fallback_links.append(link)
            if fallback_links:
                print(f"🔄 Fallback: {len(fallback_links)} liens sélectionnés par mots-clés")
                return fallback_links[:2]  # Maximum 2 liens en fallback (mode ultra-stratégique)
            return links_to_analyze[:2]  # Dernier recours: prendre seulement les 2 premiers (mode ultra-stratégique)
    
    # La fonction merge_data n'est plus utilisée - Gemini génère directement un schéma complet amélioré
    
    def consolidate_final_schema(self) -> Dict:
        """Consolide tous les outputs individuels des pages en un schéma final unique"""
        if not self.page_outputs:
            return {"companyInfo": {}, "products": []}
        
        print(f"\n{'='*60}")
        print(f"🔗 CONSOLIDATION FINALE AVEC GEMINI")
        print(f"{'='*60}")
        
        # Préparer tous les outputs pour Gemini
        outputs_text = ""
        for i, page_data in enumerate(self.page_outputs, 1):
            url = page_data["url"]
            output = page_data["output"]
            outputs_text += f"\n{'─'*60}\n"
            outputs_text += f"PAGE {i}: {url}\n"
            outputs_text += f"{'─'*60}\n"
            outputs_text += json.dumps(output, ensure_ascii=False, indent=2)
            outputs_text += f"\n"
        
        prompt = f"""Tu es un expert en consolidation de données pour un système de campagnes de financement scolaire.

Tu as analysé {len(self.page_outputs)} pages différentes d'un site web de fournisseur alimentaire. Chaque page a été analysée individuellement avec tout son contexte (texte complet, liens, images).

Voici tous les outputs bruts de chaque analyse:

{outputs_text}

TÂCHE: Créer un schéma JSON FINAL et CONSOLIDÉ qui combine intelligemment toutes ces données.

RÈGLES DE CONSOLIDATION:
1. **PRODUITS**:
   - COMBINE tous les produits de toutes les pages
   - ÉLIMINE les doublons (produits avec le même nom, même si légèrement différent)
   - GARDE les meilleures informations pour chaque produit (meilleure description, meilleure image, meilleur prix)
   - Si un produit apparaît sur plusieurs pages avec des informations différentes, COMBINE-les intelligemment:
     * Garde la description la plus complète
     * Garde l'image de meilleure qualité
     * Garde le prix le plus récent/pertinent
     * Combine les attributs (freezable, glutenFree, etc.)
   - PRIORISE les produits adaptés aux campagnes de financement scolaire:
     * Produits populaires auprès des familles (tartes, pâtés, fromages, desserts, produits locaux du Québec)
     * Produits avec bon rapport qualité-prix
     * Produits qui se conservent bien (congelables, longue durée de vie)
     * Produits du Québec ou locaux
   - ÉVITE les produits trop spécialisés, fragiles, ou avec courte durée de vie

2. **INFORMATIONS ENTREPRISE (companyInfo)**:
   - COMBINE toutes les informations de toutes les pages
   - GARDE les informations les plus complètes et précises:
     * Si une page a un email et une autre non, garde l'email
     * Si une page a une adresse complète et une autre partielle, garde la complète
     * Si une page a un logo de meilleure qualité, garde celui-là
   - PRIORITÉ pour chaque champ:
     * name: Le nom le plus complet/officiel
     * email: L'email le plus récent/principal
     * phone: Le téléphone principal
     * address: L'adresse la plus complète (rue, ville, code postal, province)
     * logo: Le logo de meilleure qualité/résolution
     * description: La description la plus détaillée
     * website: L'URL principale du site
     * certifications: Combine toutes les certifications uniques
     * storageType: Le type de stockage le plus approprié

3. **QUALITÉ ET COMPLÉTUDE**:
   - Assure-toi que le schéma final est le PLUS COMPLET possible
   - Ne perds AUCUNE information importante
   - Élimine seulement les doublons évidents
   - Valide que tous les champs requis sont remplis si possible

4. **FORMAT ET VALEURS MANQUANTES**:
   - Retourne un JSON conforme au schéma EXTRACTION_SCHEMA
   - **IMPORTANT**: Si un champ n'est pas trouvé dans les outputs, ne le mets PAS dans le JSON ou mets null (pas la string "null")
   - Ne crée JAMAIS de valeurs fictives ou d'exemples
   - Si une information n'existe pas dans les outputs, laisse le champ ABSENT du JSON ou null
   - Les produits doivent avoir UNIQUEMENT les champs disponibles (name, description, pricePickup, image si trouvés dans les outputs)
   - Les informations entreprise doivent être complètes UNIQUEMENT si trouvées dans les outputs
   - Ne remplis PAS les champs avec des valeurs par défaut ou des exemples

Retourne UNIQUEMENT le JSON consolidé final, sans commentaires ni explications."""
        
        schema = EXTRACTION_SCHEMA
        
        try:
            print(f"🤖 Envoi à Gemini pour consolidation finale...")
            print(f"📊 {len(self.page_outputs)} outputs à consolider")
            
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=-1),
                response_mime_type="application/json",
                response_json_schema=schema
            )
            
            response = self.client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=config
            )
            
            result_text = response.text.strip()
            
            # Nettoyer le JSON
            if result_text.startswith('```'):
                result_text = re.sub(r'^```(?:json)?\s*\n', '', result_text)
                result_text = re.sub(r'\n```\s*$', '', result_text)
            
            consolidated = json.loads(result_text)
            
            print(f"✅ Consolidation terminée!")
            print(f"📦 Produits consolidés: {len(consolidated.get('products', []))}")
            print(f"🏢 Champs entreprise: {len([k for k, v in consolidated.get('companyInfo', {}).items() if v])}")
            
            return consolidated
            
        except Exception as e:
            print(f"❌ Erreur lors de la consolidation finale: {e}")
            # Fallback: fusionner manuellement les outputs
            print(f"🔄 Fallback: fusion manuelle des outputs...")
            return self.manual_merge_outputs()
    
    def manual_merge_outputs(self) -> Dict:
        """Fusion manuelle des outputs en cas d'échec de la consolidation Gemini"""
        merged = {
            "companyInfo": {},
            "products": []
        }
        
        # Fusionner tous les produits (éviter les doublons)
        all_products = {}
        for page_data in self.page_outputs:
            for product in page_data["output"].get("products", []):
                product_name_lower = product.get("name", "").lower()
                if product_name_lower not in all_products:
                    all_products[product_name_lower] = product
                else:
                    # Améliorer le produit existant
                    existing = all_products[product_name_lower]
                    for key, value in product.items():
                        if value and (not existing.get(key) or str(existing.get(key)).lower() in ["null", "none", ""]):
                            existing[key] = value
        
        merged["products"] = list(all_products.values())
        
        # Fusionner les infos entreprise
        for page_data in self.page_outputs:
            company_info = page_data["output"].get("companyInfo", {})
            for key, value in company_info.items():
                if value and (not merged["companyInfo"].get(key) or 
                             str(merged["companyInfo"].get(key)).lower() in ["null", "none", ""]):
                    merged["companyInfo"][key] = value
        
        return merged
    
    def scan_pages_async(self, urls: List[str]) -> None:
        """Scanne plusieurs pages en parallèle pour accélérer le processus"""
        if not urls:
            return
        
            print(f"\n{'='*60}")
        print(f"⚡ SCAN ASYNCHRONE DE {len(urls)} PAGES")
        print(f"{'='*60}")
            
        def scan_single_page(url: str) -> Dict:
            """Fonction pour scanner une seule page"""
            with self.lock:
                if url in self.visited_urls:
                    return {}
                self.visited_urls.add(url)
                self.visited_urls_list.append(url)
            
            print(f"📍 [ASYNC] Scanning: {url}")
            
            try:
                # Récupérer la page
                soup, driver = self.fetch_page(url)
                if not soup:
                    return {}
                
                # Extraire les informations de contact
                contact_info = self.extract_contact_info_from_links(soup)
            
                # Extraire les données (avec toutes les données existantes pour amélioration)
                page_output = self.extract_data_from_page(
                    url,
                soup, 
                existing_data=self.all_data,
                    visited_urls_context=self.visited_urls_list[:-1],
                contact_info=contact_info
            )
            
                # Valider que page_output n'est pas vide
                if not page_output or (not page_output.get('companyInfo') and not page_output.get('products')):
                    page_output = {"companyInfo": {}, "products": []}
                
                # Stocker l'output brut avec l'URL pour consolidation finale
                with self.lock:
                    self.page_outputs.append({
                        "url": url,
                        "output": page_output
                    })
                
                # Fermer le driver si nécessaire
                if driver:
                    try:
                driver.quit()
                    except Exception as e:
                        print(f"⚠️ Erreur lors de la fermeture du driver: {e}")
                
                return page_output if page_output else {}
            except Exception as e:
                print(f"❌ [ASYNC] Erreur sur {url}: {e}")
                return {}
        
        # Scanner toutes les pages en parallèle
        results = []
        with ThreadPoolExecutor(max_workers=min(5, len(urls))) as executor:
            future_to_url = {executor.submit(scan_single_page, url): url for url in urls}
            
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                        print(f"✅ [ASYNC] {url} terminé")
                except Exception as e:
                    print(f"❌ [ASYNC] Erreur sur {url}: {e}")
        
        # Les outputs sont maintenant stockés dans self.page_outputs par scan_single_page
        # Pas besoin de fusionner ici, la consolidation finale le fera
        print(f"\n📊 Scan asynchrone terminé: {len(results)} pages analysées")
        print(f"✅ Tous les outputs sont stockés dans self.page_outputs pour consolidation finale")
        print(f"📦 Total outputs stockés: {len(self.page_outputs)}")
        print(f"{'='*60}\n")
    
    def select_pages_and_extract_contact_info(self, all_links: List[str], contact_info_from_links: Dict[str, str]) -> Dict:
        """Premier appel Gemini: sélectionner les 5 pages + extraire infos de contact depuis les liens"""
        print(f"\n{'='*60}")
        print(f"🤖 APPEL GEMINI #1: SÉLECTION DES PAGES + EXTRACTION CONTACT")
        print(f"{'='*60}")
        
        # Créer le schéma vide pour identifier ce qui manque
        empty_schema = {
            "companyInfo": {},
            "products": []
        }
        
        # Préparer les infos de contact déjà extraites depuis les liens
        contact_info_text = ""
        if contact_info_from_links.get("email"):
            contact_info_text += f"📧 Email trouvé dans mailto: {contact_info_from_links['email']}\n"
        if contact_info_from_links.get("phone"):
            contact_info_text += f"📞 Téléphone trouvé dans tel: {contact_info_from_links['phone']}\n"
        if contact_info_from_links.get("address"):
            contact_info_text += f"📍 Adresse trouvée dans Google Maps: {contact_info_from_links['address'][:100]}...\n"
        
        prompt = f"""Tu es un expert en navigation web pour un système de campagnes de financement scolaire.

TÂCHE: Sélectionner les 5 pages les plus pertinentes (incluant la page d'accueil) pour extraire les données d'un fournisseur alimentaire selon le schéma suivant:

SCHÉMA CIBLE (vide - ce qu'on doit remplir):
{json.dumps(empty_schema, ensure_ascii=False, indent=2)}

INFORMATIONS DE CONTACT DÉJÀ EXTRAITES DEPUIS LES LIENS:
{contact_info_text if contact_info_text else "Aucune information de contact trouvée dans les liens (mailto:, tel:, Google Maps)"}

LIENS DISPONIBLES (incluant la page d'accueil):
{chr(10).join([f"{i+1}. {link}" for i, link in enumerate(all_links[:50])])}

INSTRUCTIONS CRITIQUES:
1. **SÉLECTION DES 5 PAGES**:
   - Tu dois sélectionner EXACTEMENT 5 pages maximum (incluant la page d'accueil si pertinente)
   - PRIORITÉ #1: Page de catalogue/produits avec LISTE DE PRODUITS INDIVIDUELS (pour trouver {MIN_PRODUCTS_TARGET} produits spécifiques)
   - PRIORITÉ #2: Pages de catégories qui LISTENT des produits individuels (ex: /produits/categorie/fromages/ avec liste de fromages spécifiques)
   - PRIORITÉ #3: Page contact/nous joindre (pour compléter les infos entreprise)
   - PRIORITÉ #4: Page à propos (pour description entreprise, logo)
   - ⚠️ IMPORTANT: Privilégie les pages qui contiennent des LISTES de produits individuels, pas juste des catégories générales
   - ÉVITE: Pages qui ne montrent que des catégories sans produits spécifiques, blog, recettes, actualités, pages légales

2. **EXTRACTION DES INFOS DE CONTACT**:
   - Si tu vois des liens mailto:, tel:, ou Google Maps dans les liens fournis, extrais-les
   - Complète les infos déjà extraites si tu en trouves d'autres
   - Format attendu:
     * email: email@example.com
     * phone: 819 295-3325
     * address: Adresse complète avec ville, code postal, province

3. **PRODUITS POUR CAMPAGNES SCOLAIRES**:
   - Privilégie les pages avec produits adaptés aux campagnes de financement:
     * Produits populaires (tartes, pâtés, fromages, desserts, produits locaux du Québec)
     * Bon rapport qualité-prix
     * Se conservent bien (congelables, longue durée de vie)
     * Produits du Québec ou locaux

Retourne un JSON avec cette structure:
{{
  "selectedPages": ["url1", "url2", "url3", "url4", "url5"],  // EXACTEMENT 5 pages max (incluant accueil si pertinente)
  "contactInfo": {{
    "email": "email@example.com" ou "",
    "phone": "819 295-3325" ou "",
    "address": "Adresse complète" ou ""
  }},
  "reasoning": "Explication: pourquoi ces 5 pages spécifiques sont les plus pertinentes"
}}"""
        
        schema = {
            "type": "object",
            "properties": {
                "selectedPages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1,
                    "maxItems": 5
                },
                "contactInfo": {
                    "type": "object",
                    "properties": {
                        "email": {"type": "string"},
                        "phone": {"type": "string"},
                        "address": {"type": "string"}
                    }
                },
                "reasoning": {"type": "string"}
            },
            "required": ["selectedPages", "contactInfo", "reasoning"]
        }
        
        try:
            result = self.call_gemini(prompt, schema, show_prompt=False)
            
            selected_pages = result.get("selectedPages", [])
            contact_info = result.get("contactInfo", {})
            reasoning = result.get("reasoning", "")
            
            # Fusionner les infos de contact (priorité aux infos déjà extraites)
            final_contact_info = contact_info_from_links.copy()
            for key, value in contact_info.items():
                if value and not final_contact_info.get(key):
                    final_contact_info[key] = value
            
            print(f"✅ {len(selected_pages)} pages sélectionnées:")
            for i, page in enumerate(selected_pages, 1):
                print(f"   {i}. {page}")
            print(f"\n💭 Raisonnement: {reasoning[:300]}...")
            print(f"\n📧 Infos de contact extraites:")
            print(f"   Email: {final_contact_info.get('email', 'N/A')}")
            print(f"   Téléphone: {final_contact_info.get('phone', 'N/A')}")
            print(f"   Adresse: {final_contact_info.get('address', 'N/A')[:80]}...")
        print(f"{'='*60}\n")
        
            return {
                "selectedPages": selected_pages,
                "contactInfo": final_contact_info
            }
        except Exception as e:
            print(f"❌ Erreur lors de la sélection des pages: {e}")
            # Fallback: prendre la page d'accueil + quelques liens pertinents
            fallback_pages = [self.base_url]
            product_keywords = ["produit", "catalogue", "menu", "gamme"]
            contact_keywords = ["contact", "nous-joindre", "about", "a-propos"]
            
            for link in all_links[:20]:
                link_lower = link.lower()
                if len(fallback_pages) < 5:
                    if any(kw in link_lower for kw in product_keywords) or any(kw in link_lower for kw in contact_keywords):
                        if link not in fallback_pages:
                            fallback_pages.append(link)
            
            print(f"🔄 Fallback: {len(fallback_pages)} pages sélectionnées")
            return {
                "selectedPages": fallback_pages[:5],
                "contactInfo": contact_info_from_links
            }
    
    def extract_all_data_mega_call(self, pages_data: List[Dict], contact_info: Dict[str, str]) -> Dict:
        """Deuxième appel Gemini: mega prompt avec tous les textes, toutes les images, et le schéma"""
        print(f"\n{'='*60}")
        print(f"🤖 APPEL GEMINI #2: EXTRACTION MEGA CALL (TOUT EN UN)")
        print(f"{'='*60}")
        print(f"📊 {len(pages_data)} pages à analyser avec tout le contexte")
        
        # Préparer le contexte de toutes les pages
        pages_context = ""
        all_images_parts = []
        
        for i, page_data in enumerate(pages_data, 1):
            url = page_data["url"]
            text = page_data["text"]
            images = page_data["images"]
            
            pages_context += f"\n{'─'*60}\n"
            pages_context += f"PAGE {i}: {url}\n"
            pages_context += f"{'─'*60}\n"
            pages_context += f"TEXTE COMPLET ({len(text)} caractères):\n"
            pages_context += text[:100000]  # Limiter à 100k caractères par page
            if len(text) > 100000:
                pages_context += f"\n[... texte tronqué, {len(text) - 100000} caractères supplémentaires ...]"
            pages_context += f"\n\nIMAGES TROUVÉES: {len(images)} images\n"
            
            # Ajouter les images pour cette page (avec validation)
            for img in images:
                if img.get("bytes") and img.get("mime_type"):
                    # Valider l'image avant de l'ajouter
                    try:
                        bytes_data = img["bytes"]
                        mime_type = img["mime_type"]
                        
                        # Vérifier que les bytes ne sont pas vides
                        if not bytes_data or len(bytes_data) == 0:
                            continue
                        
                        # Vérifier que le type MIME est supporté par Gemini (selon la doc: PNG, JPEG, WEBP, HEIC, HEIF)
                        supported_mimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif']
                        if mime_type not in supported_mimes:
                            # Essayer de corriger le type MIME
                            if 'jpeg' in mime_type.lower() or 'jpg' in mime_type.lower():
                                mime_type = 'image/jpeg'
                            elif 'png' in mime_type.lower():
                                mime_type = 'image/png'
                            elif 'webp' in mime_type.lower():
                                mime_type = 'image/webp'
                            elif 'heic' in mime_type.lower():
                                mime_type = 'image/heic'
                            elif 'heif' in mime_type.lower():
                                mime_type = 'image/heif'
                            else:
                                continue  # Format non supporté
                        
                        # Vérifier la taille (max 4MB par image pour Gemini, mais limite totale de 20MB pour inline)
                        if len(bytes_data) > 4 * 1024 * 1024:
                            print(f"   ⚠️ Image trop grande ({len(bytes_data)} bytes), ignorée: {img.get('url', 'N/A')[:60]}...")
                            continue
                        
                        # Vérifier que les bytes sont valides (essayer de créer le Part)
                        try:
                            image_part = types.Part.from_bytes(
                                data=bytes_data,
                                mime_type=mime_type
                            )
                            all_images_parts.append(image_part)
                        except Exception as part_error:
                            print(f"   ⚠️ Impossible de créer Part pour l'image ({img.get('url', 'N/A')[:60]}...): {part_error}")
                            continue
                        pages_context += f"  - Image {len(all_images_parts)}: {img.get('url', 'N/A')[:80]}...\n"
                    except Exception as img_error:
                        print(f"   ⚠️ Image invalide ignorée ({img.get('url', 'N/A')[:60]}...): {img_error}")
                        continue
        
        # Préparer les infos de contact
        contact_info_text = ""
        if contact_info.get("email"):
            contact_info_text += f"📧 Email: {contact_info['email']}\n"
        if contact_info.get("phone"):
            contact_info_text += f"📞 Téléphone: {contact_info['phone']}\n"
        if contact_info.get("address"):
            contact_info_text += f"📍 Adresse: {contact_info['address']}\n"
        
        prompt = f"""Tu es un expert en extraction de données pour un système de campagnes de financement scolaire.

TÂCHE: Extraire TOUTES les données d'un fournisseur alimentaire depuis {len(pages_data)} pages web analysées.

INFORMATIONS DE CONTACT DÉJÀ EXTRAITES DEPUIS LES LIENS:
{contact_info_text if contact_info_text else "Aucune information de contact trouvée dans les liens"}

CONTENU COMPLET DES {len(pages_data)} PAGES:
{pages_context}

INSTRUCTIONS CRITIQUES:
1. **EXTRACTION DES PRODUITS (PRIORITÉ ABSOLUE)**:
   - ⚠️ CRITIQUE: Extrais des PRODUITS INDIVIDUELS avec NOMS SPÉCIFIQUES, pas des catégories!
   - ⚠️ Si une page ne liste que des catégories, cherche dans le texte les NOMS DE PRODUITS SPÉCIFIQUES mentionnés
   - Exemples de PRODUITS INDIVIDUELS (✅ BON):
     * "Le Cendrillon" (fromage)
     * "Tarte aux pommes artisanale"
     * "Pâté au porc du Québec"
     * "Confiture de fraises"
     * "Miel de fleurs sauvages"
   - Exemples de CATÉGORIES (❌ À ÉVITER):
     * "Sélection de fromages"
     * "Assortiment d'épicerie"
     * "Charcuteries sélectionnées"
   - Si tu vois dans le texte des mentions comme "fromage X", "tarte Y", "pâté Z", crée un produit pour CHAQUE nom spécifique
   - Si une page mentionne "nos fromages: Le Cendrillon, Le Riopelle, Le Migneron", crée 3 produits distincts
   - PRIORITÉ: Produits adaptés aux campagnes de financement scolaire:
     * Produits populaires auprès des familles (tartes, pâtés, fromages spécifiques, desserts, produits locaux du Québec)
     * Produits avec bon rapport qualité-prix
     * Produits qui se conservent bien (congelables, longue durée de vie)
     * Produits du Québec ou locaux
   - ÉVITE les produits trop spécialisés, fragiles, ou avec courte durée de vie
   - Chaque produit doit avoir: name (nom spécifique du produit, pas une catégorie), description, pricePickup (prix à l'usine), image
   - Si un prix n'est pas trouvé, mets 0 (pas de valeur fictive)
   - Si tu vois une liste de produits sur une page, extrais CHAQUE produit individuellement
   - Si tu vois des noms de produits dans le texte (même dans une description), crée un produit pour chacun
   - ANALYSE LES IMAGES: Si une image montre un produit spécifique avec un nom visible, crée un produit pour ce produit

2. **INFORMATIONS ENTREPRISE**:
   - Utilise les infos de contact déjà extraites si disponibles
   - Complète avec les infos trouvées dans les pages
   - GARDE les meilleures informations (les plus complètes et précises)
   - Champs requis: name, email, phone, address, logo, description, website

3. **IMAGES**:
   - Analyse toutes les images fournies
   - Identifie les images de produits vs logos
   - Associe les images aux produits correspondants
   - Identifie le logo de l'entreprise

4. **COMPLÉTUDE DES CHAMPS (TRÈS IMPORTANT)**:
   - ⚠️ CRITIQUE: Remplis TOUS les champs du schéma pour chaque produit, même si les données exactes ne sont pas disponibles
   - Pour chaque produit, remplis TOUS les champs possibles:
     * name, description, pricePickup, image (OBLIGATOIRES)
     * priceStudent, priceFinal, unitSize, casePack (si disponibles ou estimables)
     * ingredientsText, nutritionText (extraits des images ou du texte si disponibles)
     * ingredientsImage, nutritionImage (URLs des images si visibles)
     * pallet.ti, pallet.hi (si mentionnés ou estimables)
     * refrigerated, allergens, category, attributes (déduis-les du contexte)
     * sourceUrl (URL de la page où le produit a été trouvé)
   - Si une donnée exacte n'est pas disponible, fais une ESTIMATION RAISONNABLE basée sur:
     * Le type de produit (ex: fromage = réfrigéré, chocolat = non réfrigéré)
     * Les images du produit (analyse les images pour détecter les allergènes, ingrédients, etc.)
     * Le contexte du site (ex: produits québécois = quebecProduct: true)
     * Les standards de l'industrie pour ce type de produit
   - Même si c'est une estimation, c'est mieux que de laisser le champ vide - le fournisseur pourra corriger après
   - Pour les prix manquants, utilise 0 (pas d'estimation de prix)
   - Pour les autres champs, fais ton meilleur effort pour les remplir avec des valeurs réalistes

5. **QUALITÉ**:
   - Assure-toi que le schéma final est le PLUS COMPLET possible
   - Ne perds AUCUNE information importante
   - Élimine les doublons de produits (même nom = même produit)

Retourne un JSON conforme au schéma EXTRACTION_SCHEMA avec TOUTES les données extraites."""
        
        # Limiter le nombre d'images (Gemini 2.5 supporte jusqu'à 3,600 images par requête)
        # Mais pour éviter les erreurs INVALID_ARGUMENT, on limite à 200 et on valide chaque image
        MAX_IMAGES = 200  # Limite augmentée selon demande utilisateur
        if len(all_images_parts) > MAX_IMAGES:
            print(f"⚠️ Trop d'images ({len(all_images_parts)}), limitation à {MAX_IMAGES} images")
            # Prioriser les images de produits (non-logos)
            # On garde les premières images qui sont généralement les plus importantes
            all_images_parts = all_images_parts[:MAX_IMAGES]
        
        # Vérifier la taille totale des images (limite inline: 20MB pour Gemini)
        # Note: types.Part.from_bytes ne stocke pas directement les bytes dans .data
        # On doit calculer la taille depuis les images téléchargées
        total_size = 0
        for img_data in pages_data:
            for img in img_data.get("images", []):
                if "bytes" in img:
                    total_size += len(img["bytes"])
        
        if total_size > 20 * 1024 * 1024:
            print(f"⚠️ Taille totale des images trop grande ({total_size / 1024 / 1024:.2f}MB), réduction...")
            # Réduire le nombre d'images pour rester sous 20MB
            # On reconstruit all_images_parts en gardant les plus petites images d'abord
            images_with_size = []
            for i, img_data in enumerate(pages_data):
                for img in img_data.get("images", []):
                    if "bytes" in img:
                        images_with_size.append((len(img["bytes"]), i, img))
            
            # Trier par taille (plus petites d'abord)
            images_with_size.sort(key=lambda x: x[0])
            
            # Reconstruire all_images_parts avec les images les plus petites
            all_images_parts = []
            new_total_size = 0
            for size, page_idx, img in images_with_size:
                if new_total_size + size <= 20 * 1024 * 1024:
                    try:
                        bytes_data = img["bytes"]
                        mime_type = img["mime_type"]
                        image_part = types.Part.from_bytes(data=bytes_data, mime_type=mime_type)
                        all_images_parts.append(image_part)
                        new_total_size += size
                    except:
                        continue
            else:
                    break
            
            print(f"   ✅ Réduit à {len(all_images_parts)} images ({new_total_size / 1024 / 1024:.2f}MB)")
        
        try:
            # Construire le contenu avec texte + images
            contents = [prompt]
            contents.extend(all_images_parts)
            
            print(f"📊 Envoi à Gemini:")
            print(f"   - {len(pages_data)} pages")
            print(f"   - {len(all_images_parts)} images (validées)")
            print(f"   - ~{len(prompt)} caractères de texte")
            
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=-1),
                response_mime_type="application/json",
                response_json_schema=EXTRACTION_SCHEMA
            )
            
            response = self.client.models.generate_content(
                model=MODEL,
                contents=contents,
                config=config
            )
            
            result_text = response.text.strip()
            
            # Nettoyer le JSON
            if result_text.startswith('```'):
                result_text = re.sub(r'^```(?:json)?\s*\n', '', result_text)
                result_text = re.sub(r'\n```\s*$', '', result_text)
            
            final_schema = json.loads(result_text)
            
            print(f"✅ Extraction terminée!")
            print(f"📦 Produits extraits: {len(final_schema.get('products', []))}")
            print(f"🏢 Champs entreprise: {len([k for k, v in final_schema.get('companyInfo', {}).items() if v])}")
            print(f"{'='*60}\n")
            
            return final_schema
                except Exception as e:
            error_str = str(e)
            print(f"❌ Erreur lors de l'extraction mega call: {e}")
            
            # Si l'erreur est liée aux images, essayer sans images
            if 'image' in error_str.lower() or 'INVALID_ARGUMENT' in error_str:
                print(f"🔄 Fallback: Essai sans images (erreur liée aux images détectée)...")
                try:
                    # Réessayer avec seulement le texte
                    contents_text_only = [prompt]
                    
                    print(f"📊 Réessai à Gemini (sans images):")
                    print(f"   - {len(pages_data)} pages")
                    print(f"   - 0 images")
                    print(f"   - ~{len(prompt)} caractères de texte")
                    
                    config = types.GenerateContentConfig(
                        thinking_config=types.ThinkingConfig(thinking_budget=-1),
                        response_mime_type="application/json",
                        response_json_schema=EXTRACTION_SCHEMA
                    )
                    
                    response = self.client.models.generate_content(
                        model=MODEL,
                        contents=contents_text_only,
                        config=config
                    )
                    
                    result_text = response.text.strip()
                    
                    # Nettoyer le JSON
                    if result_text.startswith('```'):
                        result_text = re.sub(r'^```(?:json)?\s*\n', '', result_text)
                        result_text = re.sub(r'\n```\s*$', '', result_text)
                    
                    final_schema = json.loads(result_text)
                    
                    print(f"✅ Extraction terminée (sans images)!")
                    print(f"📦 Produits extraits: {len(final_schema.get('products', []))}")
                    print(f"🏢 Champs entreprise: {len([k for k, v in final_schema.get('companyInfo', {}).items() if v])}")
                    print(f"{'='*60}\n")
                    
                    return final_schema
                except Exception as fallback_error:
                    print(f"❌ Erreur aussi dans le fallback: {fallback_error}")
            
            return {"companyInfo": {}, "products": []}
    
    def scrape(self) -> Dict:
        """Fonction principale de scraping - OPTIMISÉE: 2 appels Gemini seulement"""
        print(f"🚀 Démarrage du scraping pour: {self.base_url}")
        print(f"⚙️ Configuration: MAX_PAGES={MAX_PAGES_TO_VISIT}, MAX_DEPTH={MAX_DEPTH}")
        print(f"📋 Flow optimisé: 2 appels Gemini (sélection pages + extraction mega call)")
        
        # ÉTAPE 1: Récupérer la page d'accueil et extraire tous les liens + infos de contact
        print(f"\n{'='*60}")
        print(f"📍 ÉTAPE 1: RÉCUPÉRATION PAGE D'ACCUEIL + EXTRACTION LIENS")
        print(f"{'='*60}")
        
        soup, driver = self.fetch_page(self.base_url)
        if not soup:
            print(f"❌ Impossible de récupérer la page d'accueil")
            return self.all_data
        
        # Extraire les informations de contact depuis les liens (mailto:, tel:, Google Maps)
        contact_info_from_links = self.extract_contact_info_from_links(soup)
        print(f"📧 Infos de contact extraites depuis les liens:")
        if contact_info_from_links.get("email"):
            print(f"   Email: {contact_info_from_links['email']}")
        if contact_info_from_links.get("phone"):
            print(f"   Téléphone: {contact_info_from_links['phone']}")
        if contact_info_from_links.get("address"):
            print(f"   Adresse: {contact_info_from_links['address'][:80]}...")
        
        # Extraire tous les liens de navigation (incluant la page d'accueil)
        if driver:
            all_links = self.extract_navigation_links_selenium(driver, self.base_url)
            driver.quit()
        else:
            all_links = self.extract_navigation_links(soup, self.base_url)
        
        # Ajouter la page d'accueil si elle n'est pas dans la liste
        if self.base_url not in all_links:
            all_links.insert(0, self.base_url)
        
        print(f"🔗 {len(all_links)} liens trouvés (incluant la page d'accueil)")
        
        # ÉTAPE 2: Premier appel Gemini - Sélectionner les 5 pages + extraire infos de contact
        selection_result = self.select_pages_and_extract_contact_info(all_links, contact_info_from_links)
        selected_pages = selection_result["selectedPages"]
        final_contact_info = selection_result["contactInfo"]
        
        # Limiter à 5 pages maximum
        selected_pages = selected_pages[:5]
        
        print(f"\n{'='*60}")
        print(f"📍 ÉTAPE 2: TÉLÉCHARGEMENT DES {len(selected_pages)} PAGES SÉLECTIONNÉES")
        print(f"{'='*60}")
        
        # Télécharger toutes les pages sélectionnées avec leurs images
        pages_data = []
        for i, url in enumerate(selected_pages, 1):
            print(f"📥 Téléchargement page {i}/{len(selected_pages)}: {url}")
            
            try:
                page_soup, page_driver = self.fetch_page(url)
                if not page_soup:
                    print(f"   ⚠️ Impossible de récupérer {url}")
                            continue
                
                # Extraire le texte complet
                text = self.extract_visible_text(page_soup)
                
                # Extraire toutes les images et les télécharger
                all_images = self.extract_images(page_soup, url)
                downloaded_images = []
                
                for img in all_images:
                    img_url = img.get("url")
                    if img_url:
                        result = self.download_image(img_url, save_to_disk=False)
                                if result:
                            bytes_data, mime_type, local_path = result
                            downloaded_images.append({
                                "url": img_url,
                                "bytes": bytes_data,
                                "mime_type": mime_type,
                                "local_path": local_path,
                                "alt": img.get("alt", ""),
                                "is_logo": img.get("is_logo", False)
                            })
                
                if page_driver:
                    page_driver.quit()
                
                pages_data.append({
                    "url": url,
                    "text": text,
                    "images": downloaded_images
                })
                
                print(f"   ✅ {url}: {len(text)} caractères, {len(downloaded_images)} images")
                
                            except Exception as e:
                print(f"   ❌ Erreur sur {url}: {e}")
                                continue
        
        if not pages_data:
            print(f"❌ Aucune page téléchargée avec succès")
            return self.all_data
        
        # ÉTAPE 3: Deuxième appel Gemini - Mega call avec tout le contexte
        final_schema = self.extract_all_data_mega_call(pages_data, final_contact_info)
        
        # Mettre à jour all_data avec le schéma final
        self.all_data = final_schema
        
        # Afficher les résultats finaux
        company_info = self.all_data.get('companyInfo', {})
        company_fields_filled = len([k for k, v in company_info.items() if v and str(v).lower() not in ["null", "none", ""]])
        products_count = len(self.all_data.get('products', []))
        
        print(f"\n{'='*60}")
        print(f"✅ SCRAPING TERMINÉ!")
        print(f"🏢 Informations entreprise: {company_fields_filled} champs remplis (objectif: {MIN_COMPANY_INFO_FIELDS})")
        print(f"📦 Produits trouvés: {products_count} (objectif: {MIN_PRODUCTS_TARGET})")
        
        # Afficher si les objectifs sont atteints
        if products_count >= MIN_PRODUCTS_TARGET and company_fields_filled >= MIN_COMPANY_INFO_FIELDS:
            print(f"✅ Objectifs atteints - scraping optimisé!")
        elif products_count >= MIN_PRODUCTS_TARGET:
            print(f"⚠️ Produits OK mais infos entreprise incomplètes")
        elif company_fields_filled >= MIN_COMPANY_INFO_FIELDS:
            print(f"⚠️ Infos entreprise OK mais produits insuffisants")
        else:
            print(f"⚠️ Objectifs non atteints")
        
        print(f"{'='*60}\n")
        
        return self.all_data



def main():
    if len(sys.argv) < 2:
        print("Usage: python supplier-scraper-gemini.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    scraper = SupplierScraper(url)
    result = scraper.scrape()
    
    # Sauvegarder le résultat
    output_file = "scraped_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Résultats sauvegardés dans: {output_file}")
    
    # Afficher un résumé
    print("\n📋 RÉSUMÉ:")
    print(f"Nom entreprise: {result['companyInfo'].get('name', 'N/A')}")
    print(f"Email: {result['companyInfo'].get('email', 'N/A')}")
    print(f"Téléphone: {result['companyInfo'].get('phone', 'N/A')}")
    print(f"Adresse: {result['companyInfo'].get('address', 'N/A')}")
    print(f"Logo: {result['companyInfo'].get('logo', 'N/A')}")
    print(f"Produits: {len(result['products'])}")
    
    if len(result['products']) == 0:
        print(f"\n⚠️ ATTENTION: Aucun produit trouvé!")
        print(f"   Cela peut indiquer:")
        print(f"   - Le site web ne contient pas de produits visibles")
        print(f"   - Les produits sont chargés via JavaScript (nécessite Selenium)")
        print(f"   - Le site web nécessite une authentification")
        print(f"   - Les produits sont dans un format non standard")
        print(f"   - Le scraper n'a pas exploré les bonnes pages")
    else:
        print(f"\n✅ Produits trouvés:")
        for i, product in enumerate(result['products'][:10], 1):
            print(f"   {i}. {product.get('name', 'N/A')} - {product.get('category', 'N/A')}")
        if len(result['products']) > 10:
            print(f"   ... et {len(result['products']) - 10} autres produits")


if __name__ == "__main__":
    main()

