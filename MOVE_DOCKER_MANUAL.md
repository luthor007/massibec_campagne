# Guide pour déplacer Docker manuellement vers le SSD

## Étape 1 : Arrêter Docker Desktop complètement

1. Ouvrez Docker Desktop
2. Cliquez sur l'icône Docker dans la barre de menu (en haut à droite)
3. Sélectionnez **"Quit Docker Desktop"**
4. Attendez quelques secondes
5. Vérifiez qu'il est bien arrêté :
   ```bash
   ps aux | grep -i docker | grep -v grep
   ```
   (Ne devrait rien retourner)

## Étape 2 : Vérifier les fichiers

```bash
# Vérifier l'ancien emplacement
ls -lh ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw

# Vérifier le nouvel emplacement
ls -lh /Volumes/SSD/Docker/DockerDesktop/Docker.raw
```

## Étape 3 : Déplacer le fichier (si pas déjà fait)

Si le fichier n'existe pas encore sur le SSD, déplacez-le :

```bash
# S'assurer que le dossier existe
mkdir -p /Volumes/SSD/Docker/DockerDesktop

# Déplacer le fichier (cela peut prendre 5-10 minutes pour 60GB)
mv ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw /Volumes/SSD/Docker/DockerDesktop/Docker.raw
```

## Étape 4 : Créer un lien symbolique

```bash
# Créer un lien symbolique de l'ancien emplacement vers le nouveau
ln -s /Volumes/SSD/Docker/DockerDesktop/Docker.raw ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw
```

## Étape 5 : Vérifier la configuration

```bash
# Vérifier que settings.json pointe vers le SSD
cat ~/Library/Group\ Containers/group.com.docker/settings.json | grep dataFolder
```

Devrait afficher : `"dataFolder": "/Volumes/SSD/Docker/DockerDesktop"`

## Étape 6 : Redémarrer Docker Desktop

1. Ouvrez Docker Desktop
2. Attendez qu'il démarre complètement
3. Vérifiez que tout fonctionne :
   ```bash
   docker ps
   df -h /System/Volumes/Data
   ```

Vous devriez voir environ 60GB libérés sur le disque principal.

## Si ça ne fonctionne pas

Si Docker ne démarre pas ou utilise toujours l'ancien emplacement :

1. Restaurer la configuration :
   ```bash
   cp ~/Library/Group\ Containers/group.com.docker/settings.json.backup ~/Library/Group\ Containers/group.com.docker/settings.json
   ```

2. Utiliser la méthode via Docker Desktop :
   - Ouvrir Docker Desktop → Settings → Resources → Advanced
   - Cliquer sur "Move disk image"
   - Sélectionner `/Volumes/SSD/Docker`
   - Cliquer sur "Apply & Restart"



