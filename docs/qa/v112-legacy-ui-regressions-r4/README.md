# Compatibilité des parcours V111 sur le build V112 R4

Les quatre parcours complets `Continuation`, `Recovery`, `MobileGuide` et `LegacyA` ont été rejoués sur le runtime `aa891dfff9bc022d1b7363d4b7085aca19b4d1e3`, Build ID `WZwxZDYUZhpepqlaPWKpe`, après le raccord de la carte à la position de l’acteur affiché. Résultat : **87 contrôles PASS**, **14 captures originales toutes ouvertes**, 14 réponses HTML portant le vrai Build ID, aucune erreur de page/console/Worker ni requête échouée.

`browser-result.json.gz` conserve le brut exécuté sans perte. `opened.json` nomme les images réellement inspectées et `browser.log` conserve la sortie complète. Les 1,458 sources observées restent identiques avant/après et figurent dans le gel R4 de 1,563 entrées, conservé à l’octet près dans `runtime-freeze-r4.json`. Cette observation est un sous-ensemble explicite du gel et ne remplace pas les deux recettes complètes de production V112.

La continuation B→A conserve le premier B et ses deux dépôts ; les accords, refus de capacité, interruptions et reprises sont joués dans l’interface. La récupération historique est explicitement confirmée, garde le point initial et les documents et ne déplace pas les charges ni n’ajoute de marche. Le carnet et le guide mobiles restent bornés et utilisables au clavier ; le parcours A direct reste indépendant de la continuation. Les quatre sauvegardes finales gardent leur version12 et leur outil de dépeçage possédé au départ.

Les fixtures de départ, le B et les charges préparés par modèle, l’outil déjà possédé et les refus de quota injectés restent déclarés dans le brut. La recette n’atteste pas à elle seule tous les scénarios de latence, les routes du Homeworld, une réparation du fragment, un lien de lignée ou un achèvement global de source/campagne/art.

Ce dossier est une **preuve bornée de compatibilité sur R4**, pas un certificat de production des recettes Homeworld/Pit V112 et pas un nouveau certificat V111. L’archive R2 séparée et les certificats, classeur et gel V111 restent inchangés. Aucun résultat R2 ou R3 n’a été réétiqueté.
