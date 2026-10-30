# Compatibilité des parcours V111 sur le build V112 R2

Les quatre parcours complets `Continuation`, `Recovery`, `MobileGuide` et `LegacyA` ont été rejoués sur le runtime `433ca03c651aad52de1cae02926152f4abfb4da3`, Build ID `NRapDZCMK0dVatwXlwZcw`. Le résultat compte **87 contrôles PASS**, **14 captures originales toutes ouvertes**, 14 réponses HTML portant le vrai Build ID et aucune erreur de page, console, Worker ou requête échouée.

Le brut exécuté est conservé sans perte dans `browser-result.json.gz` ; `opened.json` nomme les images réellement inspectées, et `browser.log` garde la sortie complète du pilote historique. Les 1 458 sources observées restent identiques avant/après et figurent dans le gel R2 de 1 560 entrées, conservé à l’octet près dans `runtime-freeze-r2.json`. Cette observation constitue un sous-ensemble explicite du gel ; elle ne remplace pas les recettes complètes V112 Homeworld et Pit. Une évolution ultérieure du pilote Pit ne transforme pas cette exécution en résultat R3.

La continuation B→A conserve le premier B, ses deux dépôts et sa provenance ; accords, refus de capacité d’enregistrement, interruption et reprise passent par l’interface. La récupération historique demande une confirmation et conserve le point initial et les documents sans déplacer les charges ni accorder de marche. Le carnet et le guide mobiles restent bornés et utilisables au clavier. Le parcours A direct reste indépendant de la continuation. Les quatre sauvegardes finales restent en version 12 et gardent leur outil de dépeçage explicitement possédé au départ.

Les checkpoints initiaux, cargaisons/B préparés par modèle, outil déjà possédé et refus de quota injectés restent déclarés dans le brut. Aucun achat, réparation du fragment, lien de lignée, achèvement global de campagne, exigence source ou cible artistique n’est déduit de ces contrôles. Les limites et empreintes sont consignées dans `verification.json` et `entry.json`.

Ce dossier est une **preuve bornée de compatibilité sur V112 R2**, pas un certificat de production V112 et pas un nouveau certificat V111. Les fichiers historiques V111, leur rapport, leur classeur et leur gel ne sont jamais écrasés.
