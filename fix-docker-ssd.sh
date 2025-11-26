#!/bin/bash

# Script pour déplacer Docker vers le SSD
# Usage: ./fix-docker-ssd.sh

echo "🔍 Vérification de l'état actuel..."

# Vérifier si Docker est en cours d'exécution
if pgrep -f "Docker Desktop" > /dev/null; then
    echo "❌ ERREUR: Docker Desktop est encore en cours d'exécution!"
    echo ""
    echo "Veuillez arrêter Docker Desktop complètement:"
    echo "1. Cliquez sur l'icône Docker dans la barre de menu"
    echo "2. Sélectionnez 'Quit Docker Desktop'"
    echo "3. Attendez quelques secondes"
    echo "4. Relancez ce script"
    exit 1
fi

echo "✅ Docker est arrêté"
echo ""

# Vérifier que le fichier existe sur le SSD
if [ ! -f "/Volumes/SSD/Docker/DockerDesktop/Docker.raw" ]; then
    echo "❌ Le fichier Docker.raw n'existe pas sur le SSD!"
    echo "   Emplacement attendu: /Volumes/SSD/Docker/DockerDesktop/Docker.raw"
    exit 1
fi

echo "✅ Fichier Docker.raw trouvé sur le SSD"
echo ""

# Vérifier l'ancien emplacement
OLD_FILE="$HOME/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw"
OLD_DIR="$HOME/Library/Containers/com.docker.docker/Data/vms/0/data"

if [ -L "$OLD_FILE" ]; then
    echo "⚠️  Un lien symbolique existe déjà"
    read -p "Voulez-vous le supprimer et le recréer? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$OLD_FILE"
        echo "✅ Ancien lien symbolique supprimé"
    else
        echo "❌ Opération annulée"
        exit 1
    fi
elif [ -f "$OLD_FILE" ]; then
    echo "⚠️  Le fichier Docker.raw existe toujours à l'ancien emplacement (60GB)"
    read -p "Voulez-vous le supprimer et créer un lien vers le SSD? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$OLD_FILE"
        echo "✅ Ancien fichier supprimé"
    else
        echo "❌ Opération annulée"
        exit 1
    fi
fi

# Créer le lien symbolique
echo ""
echo "🔗 Création du lien symbolique..."
ln -s /Volumes/SSD/Docker/DockerDesktop/Docker.raw "$OLD_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Lien symbolique créé avec succès!"
    echo ""
    echo "📋 Vérification:"
    ls -lh "$OLD_FILE"
    echo ""
    echo "✅ Configuration terminée!"
    echo ""
    echo "🚀 Vous pouvez maintenant redémarrer Docker Desktop"
    echo "   Après le redémarrage, vérifiez avec: df -h /System/Volumes/Data"
else
    echo "❌ Erreur lors de la création du lien symbolique"
    exit 1
fi



