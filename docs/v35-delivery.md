# Livraison V35 vérifiée — 13 septembre 2026

La version publique correspond au commit `abd0fda5b4540bf315e7a72303d69fdcabb5f297`. Le déploiement de production `dpl_HLL3HYbgWVGDCz4n6c18UUynWv5B` est READY et les quatre pages vérifiées répondent HTTP 200 sur [le domaine public](https://yautja-la-longue-chasse.vercel.app). L’édition Windows 1.0.35 provient du même commit.

Les 548 images de l’atelier public ont été chargées et leur SHA-256 vérifié. Les filtres, les échecs de chargement, la récupération et le cadrage mobile passent. Le laboratoire public passe 21 contrôles : atlas, orientations, durées du moteur, export JSON, lecture/pause et mobile. Les duels Tracker/Greyback aux Quais du Premier Sang et Greyback/Tracker au Trône Fracturé chargent chacun 14 PNG sur six plans, sans ressource absente. La navigation par manette virtuelle passe ; elle ne certifie pas une manette physique.

La suite complète passe 1 168 tests, sans échec. La compilation Next, TypeScript et ESLint passent. Les contrôles du lot comprennent douze parcours d’arène, huit cadrages desktop/mobile/tactile, la panne volontaire d’un PNG, la conservation des routes de progression historiques et les replays déterministes.

Le véritable EXE Windows a été lancé avec un profil isolé. Déplacement, dialogues, choix de justice, accès THE PIT, trois combats testés, mission, suspension, export et reprise après fermeture complète passent. Les ateliers ouvrent quatre fenêtres sans doublon ; les atlas Tracker/Greyback, l’export PNG, le siège à quatre poses, le Bone Bison équipé/nu dans ses deux vues et les douze compositions Razorwing avec quatre états d’ailes passent. Aucune erreur JS ou ressource locale manquante ; le réseau externe reste bloqué.

Les captures globales d’une fenêtre Electron cachée peuvent conserver un écran antérieur. Elles ne sont pas utilisées comme preuve du contenu du combat. Trois captures supplémentaires lisent directement les pixels du Canvas réel et enregistrent avec eux l’arène, ses 14 sous-plans et les identités/statuts des chasseurs. Ces images ont été inspectées.

Le ZIP `tmp/desktop-release/v35/Yautja-La-Longue-Chasse-PC-V35.zip` contient 77 entrées et pèse 1 409 408 353 octets. SHA-256 : `4732e923a82215c106e06d813dc7f772671c7676615d6705a993cf2c3cd17c26`. EXE : `e4be4a4dda9cdf20dbca1e6442671d132a2212ee31f909114fb78ced1441cc85`. ASAR : `4c7b758e2bde28ee50b085c55958bcc7ac67bf50cc460c94c598ad05bbbeaf49`. Le paquet exclut dépôt Git, fichiers d’environnement, sources artistiques privées et outils de développement. Le ZIP V34 reste conservé.

Les deux ajustements des recettes PC après le commit de source corrigent une attente de navigation interceptée et la collecte des captures ; ils ne changent ni le programme, ni les assets, ni les empreintes du paquet livré. Les preuves structurées, horaires et hashes sont consignés dans `v35-delivery-verification.json`.

Cette livraison compte 20 arènes jouables, 204 clips validés pour neuf chasseurs disposant de clips, 14 personnages sélectionnables et aucun véhicule conduisible. Les 80 autres arènes, les movesets complets, les transitions/props interactifs des extensions et les animations de véhicules acceptées restent à produire. L’édition est non signée, non commerciale et non certifiée pour les performances matérielles, une manette physique ou une campagne complète.
