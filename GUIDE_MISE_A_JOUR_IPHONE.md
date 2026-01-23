# Procédure de mise à jour du Scanner sur iPhone

Suivez ces étapes scrupuleusement sur votre Mac pour installer la version avec le scanner natif fluide.

## Étape 1 : Récupérer le code corrigé
Ouvrez votre terminal dans le dossier du projet et exécutez :

```bash
# 1. Récupérer les branches du serveur
git fetch origin

# 2. Basculer sur la branche avec les corrections
git checkout fix/ios-camera-and-constraints

# 3. Vérifier que vous êtes bien sur la bonne branche
git branch
```

## Étape 2 : Installer le nouveau plugin
Il est crucial d'installer la nouvelle dépendance que j'ai ajoutée :

```bash
# Installer le plugin capacitor-camera-view
npm install capacitor-camera-view

# Mettre à jour toutes les dépendances
npm install
```

## Étape 3 : Préparer le projet pour iOS
Cette étape compile votre code React et le synchronise avec Xcode :

```bash
# 1. Compiler l'application web
npm run build

# 2. Synchroniser les fichiers avec le projet iOS
npx cap sync ios
```

## Étape 4 : Configuration et Build dans Xcode
1. Ouvrez Xcode : `npx cap open ios`.
2. **Nettoyage (Indispensable)** : Allez dans le menu **Product > Clean Build Folder** (ou faites `Cmd + Shift + K`).
3. **Sélection de l'appareil** : Branchez votre iPhone et sélectionnez-le en haut de la fenêtre Xcode.
4. **Lancement** : Cliquez sur le bouton **Play** (triangle en haut à gauche).

## Étape 5 : Test sur l'iPhone
1. Une fois l'app lancée, allez dans la section **Scanner**.
2. Cliquez sur **Lancer le Scanner**.
3. **Autorisation** : Acceptez la demande d'accès à la caméra.
4. **Scan** : L'interface doit devenir transparente et vous devez voir la caméra. Testez avec un QR code de billet généré par votre app.

---
### En cas de problème (Écran blanc/noir) :
- Vérifiez que vous avez bien fait le `npm run build` avant le `npx cap sync ios`.
- Assurez-vous que votre iPhone n'est pas en mode "Économie d'énergie", ce qui peut parfois brider la caméra.
- Si l'interface ne devient pas transparente, vérifiez que le fichier `src/index.css` contient bien les styles `body.camera-running`.
