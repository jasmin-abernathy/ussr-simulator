# Caisse fiscale et confiance internationale

Décisions validées pour Communist World Simulator :
- Chewing-gum : +2 corruption **à l’achat de chaque exemplaire**, aucune corruption récurrente attachée à cette industrie.
- Les recettes des taxes sont maintenant isolées dans `publicBudget`. Les revenus personnels en trésorerie sont les dividendes, les clics et les plans. Les anciennes économies ne sont pas débitées lors de la migration, et seules les nouvelles recettes fiscales alimentent la caisse.
- Services publics : coût initial de 25 ₽ de caisse fiscale, puis ×1,6 par niveau ; +3 % d’efficacité fiscale par niveau, 10 maximum.
- Solidarité internationale : coût initial 40 ₽, puis ×1,7 par niveau ; −5 % de coût en roubles des nouvelles coopérations par niveau, 8 maximum ; aucun changement des seuils de communisme.
- Gestion des crises : crise toutes les 15 minutes d’activité économique, 3 simultanées maximum ; chaque crise −10 % de collecte fiscale et +1 corruption une seule fois ; résolution par caisse fiscale (coût 20 ₽ +15 ₽ par crise en attente), restaure 10 % et réduit de 1 corruption.
- Le ratio `communisme / (communisme + corruption)` doit être **≥85 %** pour coopérer, en plus du seuil de communisme, des fonds disponibles et des vagues géographiques. Les pays déjà partenaires ne sont jamais révoqués.
- Une seconde de taxes est comptabilisée dans la caisse fiscale, et la même seconde de dividendes va en trésorerie. La caisse fiscale fonctionne aussi hors ligne, plafonnée à huit heures, avec fractions de secondes et migration v1.

Ces valeurs sont des décisions d’équilibrage du gameplay, ajustables après tests utilisateur. Elles ne constituent pas une mesure scientifique des opinions politiques.
