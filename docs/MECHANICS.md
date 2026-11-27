# Mécaniques du port web

## Référence historique

Ce moteur JavaScript reprend les paramètres et les règles du commit
[`3314540a14d069dd9246bf830025a6cf653a0a83`](https://github.com/EntityFX/GdcGame/tree/3314540a14d069dd9246bf830025a6cf653a0a83)
du dépôt **EntityFX/GdcGame**, daté du 2 septembre 2016. Il conserve les 22 activités de
la classe `UssrSimulatorGame`, alors que des versions ultérieures en commentent une
partie. Le code historique et sa licence MIT restent dans le dépôt.

Les fichiers consultés pour ce port sont :

- [`UssrSimulatorGame.cs`](https://github.com/EntityFX/GdcGame/blob/3314540a14d069dd9246bf830025a6cf653a0a83/Sources/EntityFX.Gdcame.EngineTestApplication/UssrSimulator/UssrSimulatorGame.cs) : données, compteurs et trois règles spéciales.
- [`GameBase.cs`](https://github.com/EntityFX/GdcGame/blob/3314540a14d069dd9246bf830025a6cf653a0a83/Sources/EntityFX.Gdcame.GameEngine/GameBase.cs) : achats, gains, inflation et plans.
- [`GenericCounter.cs`](https://github.com/EntityFX/GdcGame/blob/3314540a14d069dd9246bf830025a6cf653a0a83/Sources/EntityFX.Gdcame.GameEngine.Contract/Counters/GenericCounter.cs) : calcul des bonus et plafonnement de l’inflation.
- [`CustomRules`](https://github.com/EntityFX/GdcGame/tree/3314540a14d069dd9246bf830025a6cf653a0a83/Sources/EntityFX.Gdcame.GameEngine/CustomRules) : réduction des durées, division des prix et doublement des bonus.

Cette provenance établit celle du code réutilisé. Elle ne constitue pas une preuve
que ce dépôt était le code officiel de l’application mobile commerciale du même nom.
Les noms et descriptions français de cette version web ont été rédigés pour ce port.

## Départ et boucle économique

Une nouvelle partie commence avec **0 rouble**, **10 roubles par clic**, **0 rouble
de taxes par seconde** et **0 point de communisme**. Vingt clics permettent donc
d’acheter les premières allumettes, qui portent la production à 20 par clic.

Un achat ne dépense que des roubles. Le seuil de communisme est une condition
d’accès, jamais un coût. Les bonus de communisme sont ajoutés au moment de l’achat.
Le total gagné cumule les revenus et ne diminue pas lors des dépenses.

Sans réduction spéciale, le prix de la prochaine unité est :

```text
prix initial × 1,15 ^ nombre d’unités déjà achetées
```

Le moteur conserve les fractions de rouble. L’arrondi d’affichage relève de
l’interface et ne modifie pas les calculs. Les lots « 10 » et « max » achètent le
nombre effectivement abordable ; un lot de 10 peut donc acheter moins de 10 unités.

Les bonus en pourcentage s’additionnent. Deux marchés noirs ajoutent 4 points de
pourcentage à la production ; ils ne multiplient pas successivement celle-ci par
1,02. Le pourcentage s’applique à toute la base, y compris aux bonus fixes acquis
plus tard :

```text
revenu effectif = base × (1 + somme des bonus % / 100) × (1 − inflation / 100)
```

## Les 22 activités

Les bonus du tableau sont ceux de départ, avant les effets de la réunion en
appartement. « Production % » et « taxes % » ajoutent des points de pourcentage.

| Activité | Prix initial | Seuil de communisme | Production par clic | Taxes par seconde | Communisme |
| --- | ---: | ---: | ---: | ---: | ---: |
| Allumettes | 200 | 0 | +10 | — | +1 |
| Chewing-gum | 400 | 5 | — | +10 | +1 |
| Brasserie | 800 | 10 | +20 | +20 | +2 |
| Radio étrangère | 1 500 | 25 | +80 | +40 | — |
| Réunion en appartement | 3 000 | 40 | +160 | — | — |
| Petit commerce | 6 000 | 80 | — | +80 | +5 |
| Distributeur de soda | 10 000 | 120 | +240 | +80 | +5 |
| Épicerie | 20 000 | 180 | +80 | +80 | +5 |
| Marché noir | 50 000 | 220 | +2 % | +80 | +10 |
| Atelier d’affiches | 223 200 | 250 | — | +150 | +10 |
| Télévision | 250 000 | 280 | +100 | +150 | +5 |
| Bureau de censure | 300 000 | 500 | +200 | — | +10 |
| Visite du mausolée | 500 000 | 600 | +250 | — | +5 |
| Statue de Lénine | 800 000 | 650 | — | — | +30 |
| Électrification | 1 100 000 | 700 | +5 % | — | +10 |
| Conserverie | 1 100 000 | 800 | +100 | +100 | +10 |
| Confiserie | 1 350 000 | 900 | +150 | +200 | +10 |
| Vin pétillant | 2 200 000 | 1 000 | +300 | +50 | +15 |
| Collectivisation | 2 500 000 | 1 200 | — | +2 % | +10 |
| Champs de maïs | 2 500 000 | 1 300 | +500 | — | +20 |
| Terres vierges | 1 000 000 | 1 500 | — | +500 | +25 |
| Cinéma | 2 500 000 | 1 800 | +500 | +150 | +15 |

## Les trois règles spéciales

**Brasserie.** Chaque achat retire cinq minutes à la durée des prochains plans.
Le code historique effectue encore cette réduction lorsque la durée est de
30 minutes, ce qui donne un minimum effectif de **25 minutes** après 43 achats.
Ce comportement est conservé. Un plan déjà lancé garde sa durée initiale.

**Radio étrangère.** Chaque achat divise par trois le prix courant d’une activité.
La première cible est Allumettes, puis Chewing-gum, puis Brasserie, etc. Après les
22 activités, la rotation recommence. Une radio peut donc réduire son propre prix.
Le prix combine toutes les augmentations de 15 % et toutes les divisions par trois,
sans effet rétroactif sur l’argent déjà dépensé. Les devis de lots tiennent compte
des réductions déclenchées au milieu du lot.

**Réunion en appartement.** La rotation utilise le même ordre, avec son propre
compteur indépendant. L’achat double les bonus fixes et en pourcentage des
**futurs achats** de l’activité ciblée. Le communisme n’est jamais doublé. Les
revenus des unités déjà possédées restent inchangés. La règle s’applique après les
bonus de l’achat qui la déclenche, comme dans le moteur historique.

Pour conserver ce dernier détail, la sauvegarde stocke les bases de production et
de taxes déjà acquises. Le seul nombre d’unités possédées ne permettrait pas de
reconstituer ces bases : l’ordre des achats compte.

## Inflation et lutte contre la corruption

Le moteur historique distingue deux compteurs :

- La production gagne un pas d’inflation à chaque clic et en perd un chaque
  seconde. Mille pas nets correspondent à un point d’inflation.
- Les taxes gagnent un pas chaque seconde, même avant l’achat d’une activité
  fiscale. Deux mille secondes correspondent à un point d’inflation.

Les valeurs sont entières en pourcentage, entre 0 et 100. Le revenu d’un clic ou
d’une seconde est calculé **avant** l’ajout du pas correspondant. Ainsi, les
2 000 premières secondes fiscales utilisent le taux sans inflation ; la seconde
suivante utilise 99 % du taux de base.

L’action **Lutter contre la corruption** est disponible lorsqu’il existe au moins
un point d’inflation fiscale. Elle retire 2 000 pas au compteur fiscal, verse une
seconde de taxes au taux ainsi amélioré et ajoute un point de communisme. Elle
ne coûte pas de roubles et n’agit pas directement sur l’inflation de production.
Une tentative sans inflation fiscale ne rapporte rien.

## Plan quinquennal

Le plan se débloque à **10 000 points de communisme**. Sa durée initiale est de
**quatre heures** et son premier versement vaut **5 000 000 de roubles**. Un seul
plan peut être en cours ou en attente d’encaissement. Après chaque encaissement,
le montant du prochain plan augmente de **20 %**.

Le port demande un encaissement explicite lorsque le plan est prêt. Dans le C#,
le versement automatique intervenait au passage suivant après un compteur arrivé
à zéro. Le port considère le plan prêt à l’échéance exacte. Cette adaptation rend
le résultat visible et évite de dépendre du réveil d’un minuteur de navigateur.

La durée est fixée au lancement et sauvegardée avec le temps restant. Acheter une
brasserie pendant un plan peut raccourcir le prochain, sans modifier la progression
du plan courant. Une absence de huit heures suffit à terminer un plan de quatre
heures, mais ne lance pas de nouveau plan automatiquement.

## Temps, absence et sauvegardes

`advance(state, now)` reçoit un timestamp en millisecondes et compte les secondes
entières réellement écoulées. Les fractions de seconde sont conservées entre les
appels et dans la sauvegarde. Appeler cette fonction toutes les 100 ms, toutes les
secondes ou après quelques minutes produit le même résultat, sauf si la limite
d’absence est dépassée. Les taxes sont additionnées par paliers d’inflation ; on
n’applique pas artificiellement le taux final à toute la période.

Chaque intervalle sans mise à jour est limité à **huit heures** créditées. Le temps
excédentaire est abandonné et l’horodatage est mis à jour : un second appel ne peut
pas récupérer à nouveau les heures écartées. Le même plafond s’applique à la
progression du plan et à la récupération de l’inflation de production.

Une horloge qui recule ne produit ni gain négatif ni gain répété : l’horodatage le
plus avancé reste en place jusqu’à ce que le temps le rattrape. Au chargement d’une
sauvegarde datée dans le futur, la date est ramenée à l’heure actuelle sans verser
de revenu d’absence. Le temps restant d’un plan est une durée, pas une différence
non vérifiée entre deux dates importées.

Les fichiers de sauvegarde utilisent `version: 1`. Seuls les champs connus sont
reconstruits. Les chaînes à la place de nombres, valeurs infinies, nombres négatifs,
comptages fractionnaires et clés inconnues ne sont pas utilisés comme données de
jeu valides. Une version inconnue ou un JSON illisible redonne un état initial avec
`recovered: true` ; un état partiellement endommagé est réparé et signalé de la même
façon. Une sauvegarde normale exportée puis réimportée garde ses données.

Les garde-fous du port sont exposés dans `RULES` :

| Limite | Valeur |
| --- | ---: |
| Taille d’un JSON importé | 1 Mio en UTF-8 |
| Montant ou bonus numérique | `1e100` |
| Unités possédées par activité | 10 000 |
| Unités achetées par action, y compris « max » | 1 000 |
| Prix minimum après réductions | 0,000001 rouble |
| Compteurs de clics et secondes | `Number.MAX_SAFE_INTEGER` |

Ces limites évitent les débordements numériques et les boucles démesurées. La
sauvegarde reste locale et modifiable par son propriétaire : il n’y a ni serveur
de confiance, ni classement, ni mécanisme anti-triche. Une application locale ne
peut pas vérifier qu’une horloge système a réellement avancé. Les nombres utilisent
la précision flottante de JavaScript ; de faibles différences d’arrondi sont
possibles par rapport au type `decimal` du C#.

## API d’intégration

Les modules sont indépendants du DOM et sans dépendance tierce. `game-data.js`
exporte `ACTIVITIES` et `RULES` ; `engine.js` expose les fonctions ci-dessous.

| Fonction | Résultat et comportement |
| --- | --- |
| `createState(now)` | Nouvel objet d’état version 1. |
| `hydrateState(raw, now)` | Accepte un objet ou du JSON, assainit, applique l’absence, renvoie le nouvel état. Le bilan est dans `state.offline`. |
| `getStats(state)` | Valeurs calculées, inflation, progression et état du plan. Aucune mutation. |
| `getActivity(state, id)` | Définition, bonus du prochain achat, quantité, prix et disponibilité ; `null` si l’identifiant est inconnu. |
| `quotePurchase(state, id, quantity)` | Devis sans mutation : `{ok, reason?, quantity, cost, requested, maxReached}`. Quantité entière ou `'max'`. |
| `buyActivity(state, id, quantity)` | Achat éventuellement partiel : `{ok, reason?, bought, spent}`. |
| `clickProduce(state)` | Produit un clic : `{ok: true, earned}`. |
| `advance(state, now)` | Applique le temps : `{ok: true, earned, elapsedMs, creditedMs, capped}`. |
| `startPlan(state, now)` | Avance le temps puis lance un plan : `{ok, reason?, durationMs?}`. |
| `claimPlan(state, now)` | Avance le temps puis encaisse une seule fois : `{ok, reason?, earned}`. |
| `reduceInflation(state)` | Action anticorruption : `{ok, reason?, earned}`. |
| `exportState(state, now)` | Avance le temps et renvoie une copie indépendante prête pour `JSON.stringify`. |
| `getGoals(state)` | Jalons informatifs avec progression entre 0 et 1. Aucun bonus ou changement de règles. |

Les mutations prennent un état déjà créé ou assaini par ce moteur. L’interface
appelle `advance` avant les clics, achats et actions anticorruption pour attribuer
correctement les revenus aux taux en vigueur avant chaque action. Les fonctions
de plan et d’export le font elles-mêmes. Un devis ne fait jamais avancer le temps.

`state.lastUpdate` est l’horodatage de référence ; `state.tickRemainderMs` conserve
les fractions de seconde. `getStats(state).plan.durationMs` désigne la durée réelle
du plan en cours ou prêt, et la durée du prochain lorsque le plan est inactif.
`nextDurationMs` désigne toujours celle du prochain plan. `offline` et `recovered`
sont des informations de chargement et ne sont pas enregistrées dans l’export.

## Personnaliser et vérifier

Les prix, seuils, bonus, noms et descriptions se modifient dans
[`web/game-data.js`](../web/game-data.js). Les règles de calcul se trouvent dans
[`web/engine.js`](../web/engine.js). Les identifiants textuels sont stables : les
renommer change la correspondance avec les sauvegardes existantes. Les bonus déjà
acquis sont sauvegardés ; commencer une nouvelle partie permet de mesurer un
rééquilibrage complet sans conserver les valeurs d’une ancienne version.

Les tests n’utilisent aucun navigateur ni service externe :

```sh
node --test tests/engine.test.mjs
```

Ils couvrent les données historiques, le départ jouable, les seuils, les achats
groupés, les trois règles spéciales, les bonus en pourcentage, les frontières
d’inflation, l’équivalence des mises à jour fréquentes et groupées, les fractions
de seconde, les absences, les dates futures, les plans et les sauvegardes abîmées.

Le port ajoute la sauvegarde locale, le retour d’absence, les achats en lots et des
jalons d’interface. Il omet la vérification arithmétique anti-clics du moteur console
historique, qui interrompait la production après environ 200 clics. Ces adaptations
sont explicites et ne changent pas les valeurs de départ des activités.
