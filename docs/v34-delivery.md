# Livraison V34 vérifiée — 13 septembre 2026

La version publique correspond au commit `abf24c204dc0249cee26498dbd50e41ea9a98db1`. Le déploiement de production `dpl_7p5X59U5TQgHRhtfqqMCagF4rbx6` a atteint l’état READY. Le jeu et les deux ateliers répondent HTTP 200 sur [le domaine public](https://yautja-la-longue-chasse.vercel.app).

Les 381 sources de l’[atelier OpenAI](https://yautja-la-longue-chasse.vercel.app/game/assets/v34/production-review/index.html) ont été chargées et leur SHA-256 vérifié depuis le site publié. Les filtres, le retour après une image indisponible, les dessins de revue et le cadrage mobile passent. Le combat public Wolf/Celtic au Tribunal charge ses 14 sous-plans sur six plans sans requête manquante. Wolf dispose d’une animation de repos ; Celtic utilise correctement son bitmap statique pour cette séquence encore absente.

La suite complète finale passe 1 150 tests, sans échec. La compilation Next de production, le contrôle TypeScript et ESLint passent également.

L’édition Windows 1.0.34 est construite depuis le même commit. L’exécutable a été lancé avec un profil de test isolé : déplacement, conversations, choix de justice, accès THE PIT, mission, suspension de chasse, export et reprise après fermeture complète passent. Les ateliers embarqués, leurs quatre fenêtres sans doublon, les quatre poses du bras de siège, le manifeste réellement empaqueté et l’export PNG avec vérification SHA passent. Le réseau externe reste bloqué.

Le ZIP est conservé dans `tmp/desktop-release/v34/Yautja-La-Longue-Chasse-PC-V34.zip` (stockage physique dans `work/v34/desktop-storage/release-v34`). Il contient 74 entrées et pèse 1 140 156 036 octets. Son SHA-256 est `d8f75a5c74810a8f474b5548ef6052db8e463efa4febd8b4a9adda8140970206`. Le paquet ne contient ni dépôt Git, ni fichiers d’environnement, ni archives de production privées. La recette PC utilise une session cachée et une horloge contrôlée : elle ne certifie pas les performances matérielles, une manette physique ni une campagne complète. L’EXE n’est pas signé.

Les preuves structurées et leurs horaires UTC sont dans `v34-delivery-verification.json`. Le correctif de la recette d’atelier remplace l’attente de navigation de Playwright pour les liens interceptés par Electron ; il ne modifie pas le paquet validé ni ses empreintes.

Cette livraison reste un état de production : 12 kits d’arène revus, 8 arènes jouables, 143 clips de chasseurs validés et aucun véhicule conduisible. Les nouveaux kits, chasseurs et essais de marche produits pendant la livraison restent séparés et ne sont pas ajoutés rétroactivement à ces chiffres. Le projet demeure un jeu de fan non commercial.
