#!/bin/bash
# Script pour forcer l'autorisation de chromedriver sur macOS

echo "🔓 Forcer l'autorisation de chromedriver sur macOS..."
echo ""

# Trouver chromedriver
CHROMEDRIVER_PATH=$(which chromedriver 2>/dev/null)

if [ -z "$CHROMEDRIVER_PATH" ]; then
    echo "❌ chromedriver non trouvé"
    echo "💡 Installez-le avec: brew install --cask chromedriver"
    exit 1
fi

# Suivre le lien symbolique
if [ -L "$CHROMEDRIVER_PATH" ]; then
    REAL_PATH=$(readlink -f "$CHROMEDRIVER_PATH" 2>/dev/null || realpath "$CHROMEDRIVER_PATH" 2>/dev/null || ls -l "$CHROMEDRIVER_PATH" | awk '{print $NF}')
    if [ -n "$REAL_PATH" ] && [ "$REAL_PATH" != "$CHROMEDRIVER_PATH" ]; then
        CHROMEDRIVER_PATH="$REAL_PATH"
    fi
fi

echo "📍 Chemin chromedriver: $CHROMEDRIVER_PATH"
echo ""

# Supprimer quarantine
echo "1️⃣ Suppression de l'attribut quarantine..."
xattr -d com.apple.quarantine "$CHROMEDRIVER_PATH" 2>/dev/null && echo "   ✅ Quarantine supprimé" || echo "   ⚠️ Quarantine déjà supprimé ou nécessite sudo"

# Vérifier Gatekeeper
echo ""
echo "2️⃣ Vérification de Gatekeeper..."
GATEKEEPER_STATUS=$(spctl --status 2>&1)
echo "   Status: $GATEKEEPER_STATUS"

if [[ "$GATEKEEPER_STATUS" == *"enabled"* ]]; then
    echo ""
    echo "3️⃣ Gatekeeper est activé. Options:"
    echo ""
    echo "   Option A: Autoriser manuellement (RECOMMANDÉ)"
    echo "   - Exécutez: $CHROMEDRIVER_PATH --version"
    echo "   - macOS affichera une alerte"
    echo "   - Allez dans Préférences Système > Sécurité"
    echo "   - Cliquez sur 'Autoriser quand même'"
    echo ""
    echo "   Option B: Désactiver temporairement Gatekeeper"
    read -p "   Voulez-vous désactiver Gatekeeper temporairement? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   🔓 Désactivation de Gatekeeper..."
        sudo spctl --master-disable
        echo "   ✅ Gatekeeper désactivé"
        echo ""
        echo "   🧪 Test de chromedriver..."
        if timeout 3 "$CHROMEDRIVER_PATH" --version 2>/dev/null; then
            echo "   ✅ chromedriver fonctionne!"
        else
            echo "   ⚠️ chromedriver ne répond toujours pas"
        fi
        echo ""
        read -p "   Réactiver Gatekeeper maintenant? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            sudo spctl --master-enable
            echo "   ✅ Gatekeeper réactivé"
        fi
    fi
else
    echo "   ⚠️ Gatekeeper est désactivé (peut être un problème de sécurité)"
fi

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "💡 Si chromedriver ne fonctionne toujours pas, essayez:"
echo "   ./scripts/test-chromedriver.py"

