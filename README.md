# GDCame

## USSR Simulator — édition personnelle

Ce dépôt est un fork de [EntityFX/GdcGame](https://github.com/EntityFX/GdcGame). Il conserve son historique et ses sources .NET et ajoute une édition web en français, adaptée au mobile, des mécanismes de gestion présents dans les sources de 2016.

La version jouable est dans **`web/`**. Elle fonctionne sans serveur applicatif ni dépendance JavaScript à installer. La progression est enregistrée dans le navigateur ; l’export et l’import permettent de conserver une copie ou de déplacer une partie.

**Adresse de publication : [app.lepotager.org/jeux/ussr-simulator/](https://app.lepotager.org/jeux/ussr-simulator/).**

### Lancer le jeu en local

Il faut Git et Python 3. Depuis un terminal :

```bash
git clone https://github.com/jasmin-abernathy/ussr-simulator.git
cd ussr-simulator
python3 -m http.server 8080 --directory web
```

Ouvrir ensuite [http://localhost:8080](http://localhost:8080). Garder ce terminal ouvert pendant le développement ; `Ctrl+C` arrête le serveur. Les modules JavaScript nécessitent de servir les fichiers par HTTP : ouvrir directement `index.html` depuis le disque ne suffit pas.

Avec Node.js 20 ou plus récent, les commandes suivantes sont aussi disponibles. Il n’y a pas d’étape `npm install` :

```bash
npm run serve
```

Dans un autre terminal, à la racine du dépôt :

```bash
npm run check
npm test
```

`check` vérifie les ressources locales, les imports, la syntaxe JavaScript et le manifest. `test` exécute les tests du moteur. `npm run dev` est un alias de `npm run serve`.

### Faire sa propre version

| Fichier ou dossier | Ce qu’on y modifie |
| --- | --- |
| `web/game-data.js` | Activités, intitulés, tarifs et paramètres du jeu |
| `web/engine.js` | Règles économiques, progression et validation des sauvegardes |
| `web/app.js` | Actions de l’interface, affichage et sauvegarde dans le navigateur |
| `web/index.html`, `web/styles.css`, `web/assets/` | Structure, présentation et illustrations |
| `web/manifest.webmanifest`, `web/sw.js` | Installation et cache de l’application web |
| `tests/` | Tests du moteur de jeu |
| `Sources/` | Code .NET historique conservé pour référence |

Commencer par `web/game-data.js` pour personnaliser les activités et l’équilibrage. Conserver les identifiants des activités permet de garder les sauvegardes existantes compatibles. Les guides décrivent les [mécanismes](docs/MECHANICS.md), le [développement](docs/DEVELOPMENT.md) et le [déploiement sur o2switch](docs/DEPLOYMENT.md).

### Provenance et périmètre

La référence historique est le commit [`3314540a14d069dd9246bf830025a6cf653a0a83`](https://github.com/EntityFX/GdcGame/commit/3314540a14d069dd9246bf830025a6cf653a0a83), daté du **2 septembre 2016**. La branche [`archive/ussr-2016`](https://github.com/jasmin-abernathy/ussr-simulator/tree/archive/ussr-2016) conserve cet état. Le fichier `Sources/EntityFX.Gdcame.EngineTestApplication/UssrSimulator/UssrSimulatorGame.cs` contient le scénario de gestion ayant servi de référence à ce port. Le projet de test d’origine est une application console .NET Framework 4.5.1 ; le titre initial du dépôt, **GDCame**, est conservé ici.

La présence de ce scénario ne prouve pas que ce dépôt soit le code de l’application mobile commercialisée par Hippo Games. Cette édition est un port personnel des sources retrouvées, avec sa propre interface web. Elle ne doit pas être présentée comme une version officielle ou comme une reproduction complète de cette application mobile.

Le dépôt conserve la [licence MIT originale](LICENSE.md), avec l’attribution à Artem Solopiy (2016). Conserver cette licence et les mentions d’auteur lors de la redistribution du code ou de parties substantielles.

### Sauvegardes et installation mobile

Cette livraison est une application web progressive (PWA). Elle ne produit pas d’APK Android ni d’application iOS native. L’installation sur l’écran d’accueil dépend du navigateur ; la publication en ligne doit utiliser HTTPS pour le service worker. Le mode hors connexion devient disponible après un premier chargement et une mise en cache réussis.

Il n’y a ni compte joueur ni synchronisation des parties sur un serveur. Une sauvegarde locale reste liée au navigateur et à son stockage. Effacer les données du site, utiliser la navigation privée ou changer d’adresse d’accès peut rendre cette progression indisponible. Utiliser régulièrement l’export de sauvegarde pour en conserver une copie.

## Android

Une application Android est construite avec Capacitor 8 dans [GitHub Actions](.github/workflows/android-debug.yml) et distribuée sous forme d’APK de test. Lire [docs/ANDROID.md](docs/ANDROID.md). La musique est **L’Internationale instrumentale**, fichier CC0 récupéré à la compilation et embarqué dans l’application.
