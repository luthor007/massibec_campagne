# Guide pour déplacer Docker vers le SSD externe

Votre disque principal est à **100% de capacité** (424GB utilisés). Docker prend **56GB**, ce qui est le principal problème.

Le SSD externe a **1.8TB d'espace disponible** (51GB utilisés sur 1.8TB).

## Solution recommandée : Changer l'emplacement Docker via les préférences

**C'est la méthode la plus sûre et la plus simple.**

### Étape 1 : Préparer le dossier sur le SSD

```bash
# Créer le dossier Docker sur le SSD
mkdir -p /Volumes/SSD/Docker

# Si DockerDesktop existe déjà, le supprimer
rm -rf /Volumes/SSD/Docker/DockerDesktop
```

### Étape 2 : Changer l'emplacement dans Docker Desktop

1. Ouvrez **Docker Desktop**
2. Cliquez sur l'icône ⚙️ (Settings) en haut à droite
3. Allez dans **Resources** → **Advanced**
4. Trouvez **"Disk image location"**
5. Cliquez sur **"Move disk image"** ou changez le chemin vers : `/Volumes/SSD/Docker`
6. Cliquez sur **"Apply & Restart"**

Docker va automatiquement déplacer toutes les données (images, conteneurs, volumes) vers le nouveau emplacement.

### Étape 3 : Vérifier

Après le redémarrage :
```bash
docker ps
df -h /System/Volumes/Data
```

Vous devriez voir environ **56GB d'espace libéré** sur le disque principal.

## Méthode alternative : Déplacement manuel (si la méthode ci-dessus ne fonctionne pas)

⚠️ **Attention** : Cette méthode nécessite d'arrêter Docker complètement.

### Étape 1 : Arrêter Docker Desktop

1. Ouvrez Docker Desktop
2. Cliquez sur l'icône Docker dans la barre de menu
3. Sélectionnez **"Quit Docker Desktop"**
4. Vérifiez qu'il est bien arrêté : `docker ps` (devrait échouer)

### Étape 2 : Déplacer les données Docker

```bash
# Créer le dossier sur le SSD
mkdir -p /Volumes/SSD/Docker

# Déplacer les données Docker (cela peut prendre 10-20 minutes pour 56GB)
sudo mv ~/Library/Containers/com.docker.docker /Volumes/SSD/Docker/

# Créer un lien symbolique
ln -s /Volumes/SSD/Docker/com.docker.docker ~/Library/Containers/com.docker.docker
```

### Étape 3 : Redémarrer Docker Desktop

1. Ouvrez Docker Desktop
2. Vérifiez que tout fonctionne : `docker ps`

## Autres éléments à déplacer (optionnel)

### node_modules (788MB)
Si vous avez plusieurs projets avec node_modules, vous pouvez les déplacer :
```bash
# Créer un dossier sur le SSD
mkdir -p /Volumes/SSD/Projects

# Déplacer le projet si nécessaire
# mv /path/to/project /Volumes/SSD/Projects/
```

### firecrawl (129MB)
Le projet firecrawl peut être déplacé :
```bash
mv ~/project/jappuie_plateforme/firecrawl /Volumes/SSD/
# Puis créer un lien symbolique si nécessaire
ln -s /Volumes/SSD/firecrawl ~/project/jappuie_plateforme/firecrawl
```

## Vérification de l'espace libéré

Après avoir déplacé Docker :
```bash
df -h /System/Volumes/Data
```

Vous devriez voir environ 56GB d'espace libéré.

