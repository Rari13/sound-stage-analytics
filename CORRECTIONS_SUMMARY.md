# Résumé des corrections apportées

## 1. Composant QRScannerNative.tsx
- **Initialisation retardée :** Ajout d'un délai de 300ms avant de demander l'accès à la caméra pour s'assurer que l'élément `<video>` est bien monté dans le DOM.
- **Attributs iOS critiques :** Forçage des attributs `playsinline`, `webkit-playsinline` et `muted` avant l'assignation du `srcObject`.
- **Gestion d'événements robuste :** Utilisation de `addEventListener('loadedmetadata', ...)` au lieu de la propriété `onloadedmetadata` pour une meilleure fiabilité.
- **Optimisation du rendu :** Ajout de `WebkitTransform: "translateZ(0)"` sur l'élément vidéo pour forcer l'accélération matérielle et l'affichage sur iOS.
- **Nettoyage :** Amélioration de la fonction `cleanup` pour arrêter proprement tous les flux et intervalles.

## 2. Intégration dans les pages
- **OrganizerScan.tsx** et **PublicScan.tsx** : Mise à jour pour utiliser automatiquement `QRScannerNative` sur les plateformes natives (iOS/Android) et conserver `QRScanner` (basé sur html5-qrcode) pour le mode Web.

## 3. Configuration Capacitor
- Vérification et confirmation de `allowsInlineMediaPlayback: true` dans `capacitor.config.ts`.

## 4. Guide Xcode
- Création de `XCODE_FIXES.md` pour aider à résoudre les erreurs de contraintes et configurer correctement les permissions dans Xcode.
