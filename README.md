# Communist World Simulator

Adaptation indépendante fondée sur le moteur de gestion MIT de EntityFX/GdcGame (2016). Un joueur choisit l'un des 49 pays de départ, développe son économie et noue des coopérations internationales volontaires. De nouveaux paliers déclenchent des encouragements. Les 22 activités historiques restent disponibles.

## Développement

```bash
npm install
npm test
npm run serve
```

La version web est dans `web/`, le noyau économique dans `web/engine.js`, les 49 pays dans `web/world.js`, les interfaces dans `web/index.html`, `web/styles.css`, `web/app.js`. Les sauvegardes du moteur historique restent compatibles. L'export inclut maintenant le pays choisi et les partenaires.

## Android

Compiler avec le workflow [Android](.github/workflows/android-debug.yml) et consulter [la documentation](docs/ANDROID.md). La musique instrumentale L'Internationale, enregistrée sous CC0, est embarquée dans l'APK lors de la compilation. La compilation et le test sur appareil physique sont des étapes distinctes.

## Hébergement

Version web de développement non indexée destinée à l'advarP, sans menu public avant validation finale.

## Licences

Source historique : copyright 2016 Artem Solopiy, MIT dans [LICENSE.md](LICENSE.md). Ce projet ne revendique aucun lien avec le jeu officiel Hippo Games. Interface indépendante ; aucune image commerciale reproduite. Enregistrement de L'Internationale sous CC0 : https://commons.wikimedia.org/wiki/File:L%27internationale.ogg . Le nom final et les éléments graphiques devront faire l'objet d'une vérification de marque avant distribution commerciale.
