# THE PIT — roster V62

Emissary de **Predator: Hunting Grounds** possède désormais sa propre case `user-emissary-phg`, distincte des deux concepts Emissary du film *The Predator*. L’illustration suit les références officielles IllFonic et PlayStation, avec reconstruction déclarée des surfaces non visibles.

## Images et comportement

- Un portrait transparent natif et deux planches idle indépendantes, six dessins par orientation. Les trois PNG OpenAI sont copiés sans modifier leurs pixels.
- Douze dessins d’animation effectivement observés dans le Canvas du duel. Les lames restent sur le poignet droit anatomique lorsque le personnage change de côté ; aucun retournement de planche n’est appliqué.
- Une icône WebP dérivée, sans recadrage ni miroir, pour éviter le chargement du portrait plein format dans la grille.
- Les mouvements et attaques non dessinés utilisent une pose native tenue. Les deux poses tenues ne sont pas comptées comme des animations supplémentaires. Le kit complet de dix-huit actions, les introductions et les résultats de manche restent ouverts.
- Profil de duel équilibré partagé, sans techniques individuelles inventées ni déblocage de campagne. Association à une arène Hunting Grounds commune, sans lieu exclusif fabriqué.

Les deux premiers essais d’idle coupaient des orteils au bord des cellules. Ils restent documentés comme rejets et ne sont pas chargés par le jeu. Les secondes générations passent le contrôle des douze cellules : alpha maximal au bord égal à 1, puis bruit alpha retiré uniquement au chargement par le mécanisme existant.

## Réconciliation du classeur

Le fichier V54 n’est pas modifié. Son empreinte SHA-256 reste `32f2ee8e4fd801e7ca677a54862f2bd0123a2e78d12c015f64b50ab28184c380`.

Le roster compte **199 cases**, et **197 des 205 dossiers V54** correspondent à un personnage jouable. Ces deux nombres ne comptent pas la même chose : le dossier Samurai PHG recoupe une case historique déjà présente, et trois créations utilisateur V56 ne figurent pas dans les 195 identités historiques du classeur.

Les huit dossiers encore ouverts sont Bloodshed, le Super Predator de The Last Hunt, l’incarnation Jaguar, l’incarnation AVP Classic 2000, les candidats père et fils de Blood Ties, Elder PHG et Captured PHG. Une tenue anonyme fournie n’est pas réattribuée sans référence visuelle probante.

Samurai PHG est clarifié sans nouvelle case. Golden Angel et Greyback du film reçoivent des libellés distincts dans la même case. Classic 2010 reste distinct du héros Classic 2000. Les présentations Oni/Jotun distinguent la tenue du jeu, le visage du film et les interprétations fournies. Captive conserve l’indication de masque hypothétique. Aucun ancien ID, ordre de variante ou bitmap V44 n’est supprimé.

## Vérifications

Les 48 tests ciblés historiques, quatre tests Emissary et le test de production complet passent. Les contrôles couvrent la propriété des variantes, leur restauration, les empreintes PNG, les cellules natives, l’absence de miroir, les états non couverts et la panne de chargement d’atlas.

Le vrai parcours V62 est vérifié dans Chrome : sélection, combat dans les deux positions, six cellules natives par côté, pause stable, pose tenue lors d’un déplacement non couvert, puis sélection et combat sur viewport tactile 844 × 390 avec mouvement réduit demandé. Aucune erreur de page ou HTTP n’est enregistrée, et les octets du stockage local de la fixture restent identiques. Les quatre captures sont inspectées : pieds au sol, adversaires face à face, corps et interface non coupés. Il s’agit d’une émulation mobile, pas d’un appareil physique ni d’une preuve de publication.

Preuves : `v62-workbook-roster-audit.json`, `v62-generation/emissary-phg-art.json` et `v62-emissary-runtime-qa.json`. La présence au roster et ces contrôles ne constituent pas une certification visuelle 1:1.

## Références

- [IllFonic — Emissary, mise à jour 2.39](https://forum.predator.illfonic.com/t/patch-notes-2-39/27316)
- [PlayStation — Emissary Predator](https://store.playstation.com/en-us/product/UP3095-PPSA24179_00-PHGD17PDLC000000/)
- [PlayStation — Samurai et Elder de Hunting Grounds](https://blog.playstation.com/2020/06/30/the-samurai-predator-arrives-in-predator-hunting-grounds/)
- [NECA — Samurai Hunting Grounds](https://store.necaonline.com/products/predator-hunting-grounds-ultimate-samurai-predator-7-inch-scale-action-figure)
- [NECA — Elder The Golden Angel](https://necaonline.com/2018/02/predator-2-7-scale-action-figure-ultimate-elder-the-golden-angel/)
