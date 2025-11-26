# Résolution du problème Gatekeeper avec chromedriver sur macOS

## Problème

macOS Gatekeeper bloque chromedriver car il n'est pas signé par Apple. Cela cause l'erreur:
```
Status code was: -9
Service /opt/homebrew/bin/chromedriver unexpectedly exited
```

## Solutions

### Solution 1: Supprimer l'attribut quarantine (Recommandé)

```bash
# Trouver le chemin de chromedriver
which chromedriver

# Supprimer l'attribut quarantine
xattr -d com.apple.quarantine /opt/homebrew/bin/chromedriver

# Si ça ne fonctionne pas, essayer avec sudo
sudo xattr -d com.apple.quarantine /opt/homebrew/bin/chromedriver
```

### Solution 2: Utiliser le script automatique

```bash
./scripts/fix-chromedriver.sh
```

### Solution 3: Autoriser manuellement dans les Préférences Système

Si chromedriver ne fonctionne toujours pas après avoir supprimé l'attribut quarantine:

1. **Première tentative d'exécution:**
   ```bash
   chromedriver --version
   ```
   
2. **Si macOS affiche une alerte de sécurité:**
   - Ouvrez **Préférences Système** > **Sécurité et confidentialité** (ou **Sécurité**)
   - Cliquez sur **"Autoriser quand même"** ou **"Ouvrir quand même"**
   - Ou allez dans l'onglet **Général** et cherchez le message concernant chromedriver

3. **Alternative via ligne de commande:**
   ```bash
   # Forcer l'exécution pour déclencher l'alerte
   /opt/homebrew/bin/chromedriver --version
   
   # Puis autoriser dans Préférences Système
   ```

4. **Si vous ne voyez pas l'option "Autoriser quand même":**
   ```bash
   # Désactiver temporairement Gatekeeper (non recommandé)
   sudo spctl --master-disable
   
   # Tester chromedriver
   chromedriver --version
   
   # Réactiver Gatekeeper après
   sudo spctl --master-enable
   ```

### Solution 4: Réinstaller chromedriver

```bash
# Désinstaller
brew uninstall --cask chromedriver

# Réinstaller
brew install --cask chromedriver

# Supprimer l'attribut quarantine immédiatement après
xattr -d com.apple.quarantine /opt/homebrew/bin/chromedriver
```

### Solution 5: Désactiver temporairement Gatekeeper (Non recommandé)

⚠️ **Attention**: Cela réduit la sécurité de votre système

```bash
sudo spctl --master-disable
```

Pour réactiver:
```bash
sudo spctl --master-enable
```

## Vérification

Après avoir appliqué une solution, testez chromedriver:

```bash
chromedriver --version
```

Si cela fonctionne, vous devriez voir la version de chromedriver.

## Le script Python résout automatiquement

Le script `supplier-scraper-gemini.py` détecte maintenant automatiquement le problème Gatekeeper et essaie de le résoudre. Si cela échoue, il affichera des instructions claires.

