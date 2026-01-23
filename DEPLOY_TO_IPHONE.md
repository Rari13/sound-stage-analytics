# Guide de déploiement sur iPhone (v2 - Plugin Natif)

Pour résoudre définitivement le problème d'écran noir, nous utilisons maintenant le plugin `capacitor-camera-view` qui affiche la caméra nativement sous l'interface web.

## 1. Récupérer le nouveau code
Ouvrez votre terminal dans le dossier de votre projet sur votre Mac :

```bash
# Récupérer les dernières modifications
git fetch origin
git checkout fix/ios-camera-and-constraints
```

## 2. Installation du nouveau plugin
Le nouveau plugin nécessite une installation propre :

```bash
# Installer le nouveau plugin
npm install capacitor-camera-view

# Construire le projet
npm run build

# Synchroniser avec iOS
npx cap sync ios
```

## 3. Configuration Xcode (Crucial)
1. Ouvrez Xcode : `npx cap open ios`.
2. **Permissions** : Vérifiez dans `Info.plist` que `NSCameraUsageDescription` est bien présent.
3. **Nettoyage** : Faites **Product > Clean Build Folder** (Cmd+Shift+K).
4. **Build** : Lancez l'application sur votre iPhone.

## 4. Comment tester
1. Allez sur la page de scan.
2. Cliquez sur "Lancer le Scanner".
3. L'interface web deviendra transparente et vous verrez le flux de la caméra native apparaître derrière.
4. Placez un QR code dans le cadre ; il sera détecté automatiquement par le système iOS.

**Note sur la transparence** : Si vous voyez un écran blanc au lieu de la caméra, assurez-vous que les styles dans `src/index.css` ont bien été appliqués (ils rendent le fond du body transparent quand le scanner tourne).
