# Développer sa version du jeu

## Démarrer

Le jeu servi au navigateur se trouve entièrement dans `web/`. Il utilise HTML, CSS et des modules JavaScript natifs. Aucun bundler, serveur de base de données ou paquet npm n’est requis.

```bash
git clone https://github.com/jasmin-abernathy/ussr-simulator.git
cd ussr-simulator
python3 -m http.server 8080 --directory web
```

Ouvrir [http://localhost:8080](http://localhost:8080). Python 3 suffit pour jouer et travailler sur l’interface. `Ctrl+C` arrête le serveur. Si le port est occupé, remplacer `8080` par un autre port libre et adapter l’adresse.

Node.js 20 ou plus récent permet d’utiliser `npm run serve` ou `npm run dev`, qui lancent le serveur statique Node fourni dans `scripts/serve.mjs`, ainsi que les commandes de validation. `npm run dev -- --port 8081` permet de choisir un autre port. Aucun `npm install` n’est nécessaire.

## Où intervenir

| Besoin | Fichier |
| --- | --- |
| Renommer une activité, modifier les prix ou la progression | `web/game-data.js` |
| Changer une règle économique ou le calcul du temps écoulé | `web/engine.js` |
| Modifier une interaction, l’affichage ou l’enregistrement d’une partie | `web/app.js` |
| Changer la structure de la page | `web/index.html` |
| Modifier les couleurs, la disposition ou le comportement mobile | `web/styles.css` |
| Changer les illustrations et icônes | `web/assets/` |
| Modifier le nom installé ou les ressources hors connexion | `web/manifest.webmanifest`, `web/sw.js` |

Commencer par une petite modification de `web/game-data.js` et vérifier son effet dans une nouvelle partie. Les identifiants d’activité sont des données persistantes : modifier un libellé est simple, renommer un identifiant peut nécessiter une migration de sauvegarde.

Le moteur est séparé de l’interface et n’a pas besoin du DOM. Une règle nouvelle doit rester dans `engine.js`, avec ses paramètres dans `game-data.js` lorsque cela convient. `app.js` relie ces règles aux actions du joueur. Les [mécanismes du jeu](MECHANICS.md) détaillent les choix de portage et d’équilibrage.

## Vérifier une modification

Depuis un deuxième terminal à la racine du dépôt :

```bash
npm run check
npm test
```

Le contrôle statique vérifie la présence des fichiers requis, les chemins locaux reconnus dans les pages et feuilles de style, les imports JavaScript, la syntaxe des scripts et la cohérence du manifest PWA. Il n’effectue aucune requête réseau. Les chemins calculés dynamiquement et le rendu se vérifient dans le navigateur.

Les tests portent sur le moteur. Après une modification de règle ou de sauvegarde, vérifier aussi une partie existante et une nouvelle partie dans l’interface. Pour une modification visuelle, contrôler au minimum une largeur de téléphone et une largeur d’ordinateur, les actions d’achat et la navigation au clavier. Pour une évolution de l’import, essayer une sauvegarde valide et un fichier invalide.

## Comprendre les sauvegardes

Les parties sont conservées dans le stockage local du navigateur. Elles ne sont ni enregistrées dans le dépôt Git ni envoyées à o2switch. Le fichier exporté par le jeu sert de copie transportable : le réimporter dans la même version permet de retrouver la progression. Dans les navigateurs prenant en charge Web Locks, un seul onglet peut modifier la partie à la fois ; les autres suivent la progression et deviennent jouables quand cet onglet se ferme.

Avant de changer le format ou les identifiants d’activités, exporter une partie de référence. Prévoir une migration explicite si le changement casse la structure existante. Un retour à une version plus ancienne du code ne garantit pas qu’elle saura relire une sauvegarde créée par une version plus récente.

Les gains liés au temps écoulé sont calculés par le jeu lors de la reprise selon les règles du moteur. Le serveur d’hébergement ne fait pas tourner une simulation pour chaque joueur pendant son absence.

## Mettre à jour le cache hors connexion

`web/sw.js` conserve les ressources nécessaires au lancement hors connexion. Lorsqu’une version est prête à être publiée, mettre à jour son identifiant de cache et sa liste de ressources si des fichiers ont été ajoutés, déplacés ou supprimés.

Si le navigateur montre une ancienne interface pendant le développement, recharger la page et consulter l’état du service worker dans les outils de développement. Désinscrire le service worker permet de travailler sans son cache. Effacer toutes les données du site supprime également la sauvegarde locale : l’exporter auparavant si elle doit être conservée.

Les chemins du manifest et du service worker doivent rester relatifs. Le jeu doit fonctionner à la racine d’un serveur local comme dans `/jeux/ussr-simulator/` en production.

## Travailler avec Git

Créer une branche pour une évolution permet de la comparer facilement à la version publiée :

```bash
git switch -c ma-version
git status
git diff
```

Ajouter ensuite les fichiers voulus et créer un commit lorsque la modification est validée. Ne jamais ajouter un export contenant des informations privées, des identifiants d’hébergement ou des fichiers de configuration de connexion.

Le code .NET d’origine reste dans `Sources/`. Pour retrouver la référence de 2016 sans toucher à la version web, consulter la branche `archive/ussr-2016` sur GitHub ou le commit `3314540a14d069dd9246bf830025a6cf653a0a83` avec `git show`.

## Portée du projet

Cette version cible les navigateurs et l’installation PWA. Créer un APK, une application iOS native ou un projet Godot nécessiterait un travail distinct sur l’emballage ou le moteur. L’interface actuelle est une création pour ce port ; le lien entre les sources historiques et l’application mobile de Hippo Games n’est pas établi.
