#!/usr/bin/env python3
"""
Script de test pour vérifier que chromedriver fonctionne correctement
"""
import sys
import subprocess
import os

def test_chromedriver():
    print("🧪 Test de chromedriver...")
    
    # Trouver chromedriver
    try:
        result = subprocess.run(['which', 'chromedriver'], capture_output=True, text=True)
        if result.returncode == 0:
            chromedriver_path = result.stdout.strip()
            print(f"✅ chromedriver trouvé: {chromedriver_path}")
        else:
            print("❌ chromedriver non trouvé dans PATH")
            return False
    except Exception as e:
        print(f"❌ Erreur lors de la recherche: {e}")
        return False
    
    # Vérifier si c'est un lien symbolique
    if os.path.islink(chromedriver_path):
        real_path = os.readlink(chromedriver_path)
        if not os.path.isabs(real_path):
            real_path = os.path.join(os.path.dirname(chromedriver_path), real_path)
        real_path = os.path.abspath(real_path)
        print(f"🔗 Lien symbolique vers: {real_path}")
        chromedriver_path = real_path
    
    # Vérifier les attributs macOS
    if sys.platform == 'darwin':
        print("\n🔍 Vérification des attributs macOS...")
        try:
            result = subprocess.run(['xattr', '-l', chromedriver_path], capture_output=True, text=True)
            if 'com.apple.quarantine' in result.stdout:
                print("⚠️ Attribut quarantine détecté!")
                print("   Exécutez: xattr -d com.apple.quarantine", chromedriver_path)
            else:
                print("✅ Aucun attribut quarantine")
        except Exception as e:
            print(f"⚠️ Impossible de vérifier les attributs: {e}")
    
    # Tester l'exécution
    print("\n🧪 Test d'exécution...")
    try:
        result = subprocess.run([chromedriver_path, '--version'], 
                               capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print(f"✅ chromedriver fonctionne!")
            print(f"   Version: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ chromedriver a retourné le code: {result.returncode}")
            print(f"   Erreur: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print("❌ Timeout - chromedriver ne répond pas")
        return False
    except Exception as e:
        print(f"❌ Erreur lors de l'exécution: {e}")
        if "Status code was: -9" in str(e) or "unexpectedly exited" in str(e):
            print("\n🚨 Problème Gatekeeper détecté!")
            print("💡 Solutions:")
            print(f"   1. xattr -d com.apple.quarantine {chromedriver_path}")
            print("   2. Autoriser dans Préférences Système > Sécurité")
            print("   3. Exécutez: ./scripts/fix-chromedriver.sh")
        return False

if __name__ == "__main__":
    success = test_chromedriver()
    sys.exit(0 if success else 1)

