# Déployer la version web sur o2switch

L’adresse prévue pour cette édition est [https://app.lepotager.org/jeux/ussr-simulator/](https://app.lepotager.org/jeux/ussr-simulator/).

Le jeu est un site statique. Publier **le contenu de `web/` uniquement** dans le sous-répertoire qui correspond à cette adresse. Servir le jeu ne nécessite ni serveur Node.js ni .NET. Le script de publication utilise Python 3.6 ou plus récent sur l’hébergement, sans dépendance supplémentaire.

La racine du dépôt, son historique Git, `Sources/`, les tests et la configuration de développement n’ont pas à être accessibles publiquement. Les fichiers `.env`, secrets et identifiants de connexion doivent rester hors du répertoire publié.

## Préparer une version

À la racine du dépôt :

```bash
npm run check
npm test
```

Vérifier également le jeu dans un navigateur, notamment à une largeur de téléphone. Mettre à jour l’identifiant du cache dans `web/sw.js` pour la publication ; sa liste de ressources doit correspondre aux fichiers réellement transférés. Garder une référence au commit publié pour pouvoir reproduire ou restaurer cette version.

## Choisir le répertoire de destination

Le répertoire public exact dépend de la configuration du domaine dans cPanel. Le retrouver dans les réglages de l’hébergement au lieu de supposer que tous les domaines utilisent le même dossier.

Dans la racine publique correspondant à `app.lepotager.org`, utiliser le sous-répertoire `jeux/ussr-simulator/`. Le script crée les dossiers parents nécessaires puis fait de la destination un lien symbolique vers la version publiée. Au premier déploiement, laisser cette destination absente : le script refuse de remplacer un dossier existant ou un lien pointant hors de son répertoire de versions. Conserver les autres applications et les réglages généraux du domaine.

Le fichier `web/index.html` doit devenir le fichier `index.html` de ce sous-répertoire. Il ne faut pas ajouter un niveau supplémentaire `web/` dans l’URL.

## Publier un commit avec le script

Le script [`scripts/deploy-static.py`](../scripts/deploy-static.py) s’exécute sur l’hébergement, via la connexion SSH déjà configurée dans Make ou une session SSH autorisée. Il télécharge l’archive d’un commit précis du dépôt GitHub public et en extrait uniquement `web/`. Le commit doit donc avoir été poussé sur GitHub avant la publication. Les identifiants restent dans la connexion ; aucune copie n’est nécessaire dans le dépôt ou dans une page publique.

Commande à adapter avec les valeurs de l’environnement de déploiement :

```bash
python3 scripts/deploy-static.py \
  --commit SHA40 \
  --document-root "ROOT_RUNTIME" \
  --release-root "PRIVATE_RUNTIME" \
  --subdir jeux/ussr-simulator \
  --repo jasmin-abernathy/ussr-simulator
```

| Argument | Valeur à fournir |
| --- | --- |
| `--commit SHA40` | SHA complet de 40 caractères hexadécimaux du commit à publier ; une branche ou un SHA abrégé ne suffit pas |
| `--document-root ROOT_RUNTIME` | Chemin absolu de la racine publique existante du domaine, renseigné au moment de l’exécution |
| `--release-root PRIVATE_RUNTIME` | Chemin absolu d’un répertoire dédié aux versions, hors de la racine publique et qui n’en est pas un parent |
| `--subdir jeux/ussr-simulator` | Destination relative dans la racine publique ; cet argument est facultatif et cette valeur est la valeur par défaut |
| `--repo jasmin-abernathy/ussr-simulator` | Dépôt GitHub public ; cet argument est facultatif et cette valeur est la valeur par défaut |

`SHA40`, `ROOT_RUNTIME` et `PRIVATE_RUNTIME` sont des espaces réservés à remplacer, pas des chemins réels à copier. Le fichier du script peut être préparé hors du répertoire public ; adapter son chemin dans la commande si nécessaire. Le serveur doit pouvoir joindre GitHub en HTTPS.

Le script prépare un répertoire de version identifié par le SHA, vérifie ses fichiers puis remplace le lien public en une seule opération atomique. Il conserve les anciennes versions. Une version existante est réutilisée seulement si ses chemins, tailles et empreintes correspondent exactement au commit demandé ; ne pas la modifier directement.

Chaque version contient un fichier généré **`release-manifest.json`** avec le dépôt, le SHA du commit et, pour chaque fichier publié, son chemin relatif, sa taille et son empreinte **SHA-256**. Ce manifest ne contient aucun chemin privé du serveur. Le résultat JSON de la commande indique notamment `commit`, `target`, `previous`, `files` et `digest` ; `digest` est l’empreinte SHA-256 du manifest. Conserver ce résultat dans les journaux privés du déploiement pour retrouver la cible précédente.

## Contenu publié

La version comprend notamment :

| Fichier ou dossier publié | Fonction |
| --- | --- |
| `index.html` | Page de lancement |
| `styles.css` | Présentation |
| `app.js`, `engine.js`, `game-data.js` | Interface, moteur et données |
| `manifest.webmanifest` | Déclaration de l’application installable |
| `sw.js` | Cache hors connexion |
| `assets/` | Illustrations et icônes |
| `LICENSE.txt` | Attribution et licence distribuées avec le jeu |
| `.htaccess` | Réglages Apache propres à cette application statique |
| `release-manifest.json` | Inventaire et empreintes des fichiers de la version, générés au déploiement |

Le script accepte les types de fichiers statiques prévus dans sa liste et refuse notamment les liens symboliques dans l’archive, les chemins sortant de `web/` et les fichiers inattendus. Si un nouveau type de ressource est nécessaire, adapter explicitement cette liste avant de publier. Ne pas créer `release-manifest.json` dans le dépôt : ce nom est réservé au script.

## Vérifier après publication

Ouvrir l’adresse HTTPS avec sa barre oblique finale : [https://app.lepotager.org/jeux/ussr-simulator/](https://app.lepotager.org/jeux/ussr-simulator/).

1. Vérifier le chargement de la page, des icônes et des styles, sans ressource en erreur dans l’onglet Réseau du navigateur.
2. Produire, acheter une activité et vérifier les compteurs.
3. Recharger la page et vérifier que la sauvegarde est conservée.
4. Exporter une sauvegarde et la réimporter.
5. Vérifier le manifest et l’enregistrement du service worker. Après une mise en cache réussie, essayer un lancement hors connexion.
6. Tester l’ajout à l’écran d’accueil si le navigateur le propose.

Le service worker doit contrôler le sous-répertoire du jeu. Garder `start_url`, `scope` et les chemins d’icône relatifs dans le manifest. Il n’est pas nécessaire de lui donner le contrôle des autres pages du domaine.

Les fichiers JavaScript doivent être servis avec un type MIME JavaScript, et le manifest avec un type JSON approprié. Éviter un cache HTTP de très longue durée pour `index.html` et `sw.js` : le navigateur doit pouvoir détecter les nouvelles versions. Une redirection globale ou une règle de réécriture d’un autre site ne doit pas transformer les requêtes des modules en pages HTML.

## Sauvegardes et retour à une version précédente

Les parties sont stockées dans chaque navigateur. Sauvegarder les fichiers du site ne sauvegarde donc pas les parties des joueurs. Avant un changement de domaine, de protocole, de format de sauvegarde ou de clé de stockage, prévoir l’export et la réimportation des parties.

Pour revenir à la version précédente, reprendre la cible indiquée dans **`previous`** par le dernier résultat de déploiement. Son nom de répertoire est le SHA de cette version : relancer la même commande avec ce SHA dans `--commit`, en conservant les mêmes racines et le même sous-répertoire. Le script vérifie la version conservée puis rebascule le lien public de façon atomique. Lors du premier déploiement, `previous` vaut `null` : aucune version antérieure n’est encore disponible.

Ne pas supprimer les versions archivées pendant un retour arrière et ne pas modifier leurs fichiers en place. Le manifest de la cible précédente permet de confirmer le commit choisi. Vérifier que les sauvegardes créées entre-temps restent lisibles par cette version et contrôler la prise en compte du service worker après rechargement. Si une publication de retour nécessite un nouvel identifiant de cache, créer un nouveau commit à partir de la version souhaitée puis le publier ; garder les versions déjà archivées intactes.

La version web peut rester exclue de l’indexation par les moteurs de recherche pendant son développement. La publication de cette édition personnelle ne constitue pas une affirmation d’affiliation avec Hippo Games.
