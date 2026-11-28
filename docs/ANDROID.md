# USSR Simulator — Android
Le jeu Android utilise Capacitor pour embarquer les fichiers HTML/JS dans une application Android installable, sans dépendance au site web lors de la partie. Le projet Android est généré lors de la compilation.

## Obtenir l'APK
Ouvrir l'onglet Actions sur GitHub puis le workflow **Build Android APK**. Après une exécution réussie, télécharger l'artifact **ussr-simulator-android-debug** ; il contient `app-debug.apk` (version de test, non signée pour le Play Store). Installer cet APK sur Android en autorisant temporairement l'installation depuis cette source, si nécessaire.

## Construire en local
Prérequis : Node 24, JDK 21, Android SDK et ses outils (API compatible avec Capacitor 8).

```bash
npm install --no-audit --no-fund
curl -fL 'https://commons.wikimedia.org/wiki/Special:Redirect/file/L%27internationale.ogg' -o web/assets/internationale.ogg
node -e "const fs=require('fs');const p='web/index.html';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('https://commons.wikimedia.org/wiki/Special:Redirect/file/L%27internationale.ogg','./assets/internationale.ogg'))"
npm test
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

Le fichier sonore doit être téléchargé **avant** `cap sync`. Il est intégré dans l'APK et fonctionne sans réseau. Les fonctionnalités de sauvegarde continuent d'utiliser le stockage local de WebView. La version installable du Play Store nécessitera ensuite signature, icônes Android dédiées, tests sur appareil et publication.

## Enregistrement musical
**L’Internationale**, interprétation instrumentale publiée par son auteur sous CC0, Wikimedia Commons : https://commons.wikimedia.org/wiki/File:L%27internationale.ogg . Le fichier est récupéré à la construction pour éviter de dépendre d'un hébergeur tiers pendant le jeu.

La version web charge l'enregistrement sur Wikimedia Commons en ligne. L'APK utilise une copie locale du même fichier, intégrée avant la synchronisation Capacitor.

## Musique écourtée

L'enregistrement instrumental de Wikimedia Commons dure environ 78 secondes. Le passage instrumental demandé comprend l'introduction et le premier refrain, et se termine près de 1 min 16. Le workflow Android recoupe l'enregistrement à 76 secondes avant de l'embarquer. Dans la version web, le lecteur arrête le fichier source au même point. Les +3 points ne sont attribués qu'une seule fois au terme de chaque écoute de cet extrait ; pause et reprise sont autorisées.

## Publication signée

La compilation release utilise le secret GitHub Actions `ANDROID_SIGNING` (objet JSON avec `keystore` en base64 et `password`, alias `communist-world`, format PKCS12). Ne jamais committer la clé privée. La publication est bloquée si le secret manque ou si la vérification apksigner échoue. Le numéro de version Android augmente avec le numéro de build. Télécharger via https://github.com/jasmin-abernathy/ussr-simulator/releases/download/android-latest/communist-world-simulator.apk .
