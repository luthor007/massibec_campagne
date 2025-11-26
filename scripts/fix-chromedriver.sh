#!/bin/bash
# Script pour installer et configurer chromedriver sur macOS

echo "🔧 Configuration de chromedriver pour Selenium..."

# Vérifier si Homebrew est installé
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew n'est pas installé. Installez-le d'abord:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

# Vérifier si chromedriver est déjà installé
if command -v chromedriver &> /dev/null; then
    echo "✅ chromedriver est déjà installé: $(which chromedriver)"
    chromedriver --version
else
    echo "📦 Installation de chromedriver..."
    # Essayer d'installer via Homebrew
    if brew install --cask chromedriver 2>/dev/null; then
        echo "✅ chromedriver installé avec succès"
    else
        echo "⚠️ Installation via cask échouée, essai avec formula..."
        brew install chromedriver
    fi
fi

# Vérifier l'installation
if command -v chromedriver &> /dev/null; then
    echo "✅ chromedriver est maintenant disponible: $(which chromedriver)"
    chromedriver --version
else
    echo "❌ chromedriver n'est toujours pas disponible après l'installation"
    echo "💡 Essayez manuellement:"
    echo "   brew install --cask chromedriver"
    exit 1
fi

# Nettoyer le cache de webdriver-manager si nécessaire
echo "🧹 Nettoyage du cache webdriver-manager..."
rm -rf ~/.wdm/drivers/chromedriver/*/chromedriver-mac-arm64/THIRD_PARTY_NOTICES.chromedriver 2>/dev/null

# Résoudre le problème Gatekeeper (macOS bloque chromedriver)
if [ -f "/opt/homebrew/bin/chromedriver" ]; then
    CHROMEDRIVER_LINK="/opt/homebrew/bin/chromedriver"
    # Suivre le lien symbolique pour trouver le vrai fichier
    CHROMEDRIVER_PATH=$(readlink -f "$CHROMEDRIVER_LINK" 2>/dev/null || realpath "$CHROMEDRIVER_LINK" 2>/dev/null || ls -l "$CHROMEDRIVER_LINK" | awk '{print $NF}')
elif [ -f "/usr/local/bin/chromedriver" ]; then
    CHROMEDRIVER_LINK="/usr/local/bin/chromedriver"
    CHROMEDRIVER_PATH=$(readlink -f "$CHROMEDRIVER_LINK" 2>/dev/null || realpath "$CHROMEDRIVER_LINK" 2>/dev/null || ls -l "$CHROMEDRIVER_LINK" | awk '{print $NF}')
else
    CHROMEDRIVER_LINK=$(which chromedriver 2>/dev/null)
    if [ -n "$CHROMEDRIVER_LINK" ]; then
        CHROMEDRIVER_PATH=$(readlink -f "$CHROMEDRIVER_LINK" 2>/dev/null || realpath "$CHROMEDRIVER_LINK" 2>/dev/null || ls -l "$CHROMEDRIVER_LINK" | awk '{print $NF}')
    fi
fi

if [ -n "$CHROMEDRIVER_PATH" ] && [ -f "$CHROMEDRIVER_PATH" ]; then
    echo "🔓 Résolution du problème Gatekeeper pour chromedriver..."
    echo "   Lien symbolique: $CHROMEDRIVER_LINK"
    echo "   Fichier réel: $CHROMEDRIVER_PATH"
    
    # Supprimer le quarantine attribute sur le vrai fichier (pas le lien)
    if xattr -d com.apple.quarantine "$CHROMEDRIVER_PATH" 2>/dev/null; then
        echo "   ✅ Attribut quarantine supprimé du fichier réel"
    else
        echo "   ⚠️ Impossible de supprimer quarantine (peut nécessiter sudo)"
        echo "   💡 Essayez: sudo xattr -d com.apple.quarantine $CHROMEDRIVER_PATH"
    fi
    
    # Aussi supprimer sur le lien symbolique (au cas où)
    if [ -n "$CHROMEDRIVER_LINK" ] && [ "$CHROMEDRIVER_LINK" != "$CHROMEDRIVER_PATH" ]; then
        xattr -d com.apple.quarantine "$CHROMEDRIVER_LINK" 2>/dev/null
    fi
    
    # Vérifier si chromedriver est exécutable
    if [ ! -x "$CHROMEDRIVER_PATH" ]; then
        echo "   🔧 Ajout des permissions d'exécution..."
        chmod +x "$CHROMEDRIVER_PATH"
    fi
    
    # Tester chromedriver
    echo "   🧪 Test de chromedriver..."
    if timeout 3 chromedriver --version 2>/dev/null | head -1; then
        echo "   ✅ chromedriver fonctionne correctement!"
    else
        echo "   ⚠️ chromedriver ne répond pas (peut être bloqué par macOS)"
        echo ""
        echo "   🔓 Solutions pour débloquer chromedriver:"
        echo ""
        echo "   Option 1: Autoriser dans Préférences Système"
        echo "   1. Exécutez: $CHROMEDRIVER_PATH --version"
        echo "   2. macOS affichera une alerte de sécurité"
        echo "   3. Allez dans Préférences Système > Sécurité"
        echo "   4. Cliquez sur 'Autoriser quand même'"
        echo ""
        echo "   Option 2: Désactiver temporairement Gatekeeper (non recommandé)"
        echo "   sudo spctl --master-disable"
        echo "   chromedriver --version"
        echo "   sudo spctl --master-enable"
        echo ""
        echo "   Option 3: Réinstaller chromedriver"
        echo "   brew uninstall --cask chromedriver"
        echo "   brew install --cask chromedriver"
        echo "   xattr -d com.apple.quarantine $CHROMEDRIVER_PATH"
    fi
fi

echo "✅ Configuration terminée!"

