# Communist World Simulator

Jeu de gestion indépendant et open source, développé à partir du moteur de gestion MIT de **EntityFX/GdcGame (2016)**. Le joueur choisit un pays de départ, développe son économie, arbitre entre production, fiscalité, investissements publics et risques de corruption, puis construit progressivement un réseau de coopérations internationales.

**Statut :** version de développement et de test, non indexée par les moteurs de recherche. Le jeu n'est pas affilié à Hippo Games ni à un jeu officiel portant un nom voisin.

## Jouer à la version web

**[Ouvrir le jeu sur advarP](https://www.advarp.org/jeux/communist-world-simulator/)**

La progression est conservée localement dans le navigateur. Les options d'export et d'import permettent de conserver ou de transférer une partie. Effacer les données du site peut supprimer une sauvegarde qui n'a pas été exportée.

## Fonctionnalités

### Économie et activités

- Production manuelle et revenus automatiques, avec gestion de la trésorerie, des taxes, du communisme et de la corruption.
- **22 activités historiques**, complétées par des investissements particuliers : importations américaines, accords bilatéraux, agents publics corrompus, maisons de mobilisation et instituts idéologiques.
- Politiques fiscales et projets publics, besoins collectifs, plans quinquennaux, institutions de contrôle et mécanismes de réduction de la corruption.
- Transformation de certains commerces en d'autres activités, avec calcul des éventuels frais plutôt qu'une revente intégrale.
- Achat de plusieurs unités, filtres, recherche et pagination du catalogue.

**Présentation uniforme des cartes :** chaque activité et chaque investissement affiche, dans cet ordre et au même emplacement :

| Ligne | Gauche | Droite |
| --- | --- | --- |
| 1 | **CA / s** | **Taxe** |
| 2 | **Trésorerie / s** (sur toute la largeur) | |

Ces trois indicateurs sont affichés **même en l'absence de chiffre d'affaires ou de taxation**, avec `0 ₽` et `0 %` selon le cas. La trésorerie bénéficie d'un traitement visuel vert ; les effets positifs (dont les gains de communisme) sont distingués des risques de corruption en rouge. Les effets propres à chaque activité sont affichés **après** les indicateurs financiers. Ce principe s'applique également aux maisons de mobilisation, aux instituts idéologiques et aux autres investissements non commerciaux.

### Monde et coopération internationale

- **195 pays** répartis en vagues géographiques de 30 pays, sauf la dernière.
- Choix initial parmi les pays de départ proposés (les États-Unis sont réservés au défi final).
- Progression d'abord vers les voisins terrestres du pays d'origine, puis vers le reste du continent et les autres continents, en fonction de la distance.
- Dans l'onglet **Monde**, **le pays de départ reste toujours en tête** ; les autres pays visibles sont classés par **coût de coopération croissant**.
- Déblocage progressif selon la vague, les seuils de communisme, le financement nécessaire et un minimum de **85 % de confiance**.
- Les États-Unis constituent le dernier objectif de coopération.

Les seuils politiques sont des paramètres **fictionnels d'équilibrage du jeu**, et non des mesures d'opinion ou des prédictions. Voir [la méthodologie](docs/political-difficulty.md).

### Musique des camarades

Le lecteur de **L'Internationale** permet la lecture, la pause et la reprise, avec un indicateur circulaire de progression. Le bonus de communisme est affiché dynamiquement sur le lecteur et attribué à la fin de l'extrait prévu. Son montant dépend du rythme de production de communisme : le calcul courant est `max(2, 3 × communisme/min)`.

Le lecteur utilise des éléments de texte indépendants de son illustration pour conserver une bonne lisibilité. La version web de test utilise un extrait audio local. La documentation Android explique comment les médias sont intégrés aux constructions mobiles.

## Démarrer en local

**Prérequis :** Node.js 20 ou plus récent et npm.

```bash
npm install
npm run check
npm test
npm run serve
```

La commande `npm run dev` est également disponible pour lancer le serveur local. La commande `npm test` exécute la suite de tests Node.js ; les tests de déploiement ne remplacent pas une validation visuelle sur navigateur mobile.

## Organisation du dépôt

| Emplacement | Rôle |
| --- | --- |
| `web/index.html` | Structure et écrans du jeu |
| `web/runtime-anthem-v15/app.js` | Interface, événements et affichage |
| `web/runtime-anthem-v15/engine.js` | Moteur économique, achats et sauvegardes |
| `web/runtime-anthem-v15/game-data.js` | Définition des activités |
| `web/runtime-anthem-v15/world.js` | Pays, vagues, coopération et bonus |
| `web/runtime-anthem-v15/styles.css` | Styles de la version web active |
| `web/runtime-anthem-v15/anthem-clip.js` | Fin de l'extrait musical et déclenchement de la récompense |
| `web/assets/` | Illustrations, icônes et médias |
| `tests/` | Tests automatisés |
| `scripts/` | Outils de contrôle et serveur de développement |
| `docs/` | Documentation complémentaire |

**Attention :** les fichiers directement sous `web/app.js`, `web/engine.js` ou `web/styles.css` ne sont pas les modules chargés par l'actuel `web/index.html`. Pour modifier le jeu affiché, intervenir dans `web/runtime-anthem-v15/` et adapter les références des fichiers dans `index.html`.

## Déploiement web

La version de test est hébergée sur **advarp.org** chez **o2switch**. La synchronisation GitHub → hébergement est réalisée par un script de contrôle périodique côté serveur (environ toutes les cinq minutes) : récupération de la branche publiée, vérifications de syntaxe et tests, création d'un répertoire de version puis bascule du lien public. **En cas d'échec des tests, la version publique précédente est conservée.**

Pendant les tests web, les en-têtes HTTP des fichiers HTML, JavaScript et CSS sont configurés en `no-store, max-age=0, must-revalidate`, et les références d'actifs dans `index.html` comportent un paramètre de version afin de limiter les problèmes de cache. Le script de déploiement doit copier également `web/.htaccess`.

La sauvegarde du joueur reste locale : déployer le code ne doit ni la réinitialiser ni la modifier.

## Android

**[Télécharger l’APK Android (version de test)](https://www.advarp.org/jeux/communist-world-simulator/communist-world-simulator.apk)** — mis à jour automatiquement après une compilation réussie sur la branche principale et la synchronisation du site. [SHA-256](https://www.advarp.org/jeux/communist-world-simulator/communist-world-simulator.apk.sha256) · [Version publiée](https://www.advarp.org/jeux/communist-world-simulator/android-version.json) · [Copie GitHub](https://github.com/jasmin-abernathy/ussr-simulator/releases/download/android-latest/communist-world-simulator.apk).


Le projet utilise **Capacitor 8** pour embarquer le jeu dans une application Android. Les scripts `npm run android:sync` et `npm run android:build` sont disponibles lorsque l'environnement Android est configuré.

Consulter [le guide Android](docs/ANDROID.md) pour les prérequis, la compilation, les médias embarqués et la distinction entre APK de test et version distribuable. Le fonctionnement dans un navigateur web et celui d'un APK doivent être validés séparément.

## Licence, attribution et limites

- Le projet s'appuie sur le moteur original de **Artem Solopiy (2016)** sous licence **MIT** ; voir [LICENSE.md](LICENSE.md).
- **L'Internationale** : voir les informations d'attribution et d'intégration musicale dans [docs/ANDROID.md](docs/ANDROID.md), ainsi que la [source Wikimedia Commons](https://commons.wikimedia.org/wiki/File:L%27internationale.ogg).
- Cette adaptation ne revendique aucune affiliation avec Hippo Games.
- Le nom final, les graphismes et les droits des médias devront être vérifiés avant une éventuelle distribution commerciale.

Les indicateurs politiques, les coûts et les mécanismes de coopération appartiennent à une **simulation ludique** : ils ne représentent pas des données économiques ou géopolitiques réelles.
