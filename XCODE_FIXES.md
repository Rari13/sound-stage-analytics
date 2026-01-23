# Résolution des problèmes Xcode pour Spark Events

Ce document récapitule les étapes à suivre dans Xcode pour résoudre les erreurs de contraintes et les problèmes de caméra sur iOS.

## 1. Résolution des contraintes Auto Layout

L'erreur `Unable to simultaneously satisfy constraints` concernant `SystemInputAssistantView` est un avertissement interne courant d'iOS lié au clavier. Bien qu'elle ne bloque pas l'application, elle peut être résolue ou ignorée en toute sécurité.

### Actions recommandées :
1. **Désactiver les logs de contraintes (Optionnel) :**
   - Dans Xcode, allez dans **Product > Scheme > Edit Scheme...**
   - Sélectionnez **Run** dans la barre latérale gauche.
   - Allez dans l'onglet **Arguments**.
   - Dans **Environment Variables**, ajoutez : `OS_ACTIVITY_MODE` avec la valeur `disable`.
   - *Note : Cela masquera également d'autres logs système utiles.*

2. **Vérifier les contraintes personnalisées :**
   - Si vous avez ajouté des vues personnalisées au-dessus du clavier, assurez-vous qu'elles n'utilisent pas de hauteurs fixes qui entrent en conflit avec les suggestions d'iOS.

## 2. Correction de l'écran noir (Caméra)

Le problème de l'écran noir est souvent dû à des restrictions de sécurité de WKWebView sur iOS.

### Configuration Xcode (Info.plist) :
Assurez-vous que les clés suivantes sont présentes dans votre fichier `Info.plist` :

```xml
<key>NSCameraUsageDescription</key>
<string>Nous avons besoin d'accéder à votre caméra pour scanner les QR codes des billets.</string>
<key>NSMicrophoneUsageDescription</key>
<string>L'accès au microphone est requis pour certaines fonctionnalités vidéo.</string>
```

### Configuration Capacitor :
Le fichier `capacitor.config.ts` a été mis à jour pour inclure :
```typescript
ios: {
  allowsInlineMediaPlayback: true,
}
```
**Action requise :** Exécutez `npx cap copy ios` pour appliquer ces changements au projet Xcode.

## 3. Problème de Hash Salt (WebKit)
L'erreur `DeviceIdHashSaltStorage: The length of the hash salt (47) is different to the length of the hash salts defined in WebKit (48)` est une erreur interne de WebKit iOS 17+ liée à la gestion des identifiants de périphériques. Elle n'affecte pas le fonctionnement de la caméra et peut être ignorée.

## 4. Étapes de nettoyage
Si le problème persiste après les modifications de code :
1. Dans Xcode : **Product > Clean Build Folder** (Cmd+Shift+K).
2. Supprimez l'application de votre iPhone/Simulateur.
3. Réinstallez via Xcode.
