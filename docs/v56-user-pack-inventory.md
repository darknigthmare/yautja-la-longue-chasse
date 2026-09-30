# Pack utilisateur V56 : inventaire vérifié

Lecture du 30 septembre 2026, avant les intégrations parallèles. Source : `C:/Users/chuck/Downloads/Yautja To integrate to the game/Yautja To integrate to the game.rar`. Aucun fichier utilisateur modifié. Après l’inventaire, les **15 originaux ont été copiés octet pour octet** dans `public/game/user-pack/v56/source/`, puis vérifiés par SHA-256. **11 détourages OpenAI statiques** sont maintenant conservés dans `public/game/user-pack/v56/cutouts/` ; mesures et provenance dans `docs/v56-companion-cutouts.json`.

Le RAR pèse **28 421 588 octets**, pour **29 154 305 octets** décompressés. SHA-256 : `f80fa1e70eaac0cb4fc67138bdfffaa0b41c16676c4028b688e0facaa97afe12`. `tar.exe -tvf` confirme 15 fichiers ordinaires, tous des images, sans script ni chemin sortant du dossier.

Les 15 fichiers étaient déjà présents à côté du RAR. Leur contenu a été comparé à chaque entrée décompressée en mémoire : **15 correspondances SHA-256 sur 15**. Il n’a donc pas fallu créer une deuxième extraction. C: disposait de 2,58 Go libres au début du contrôle ; cette valeur n’est pas une garantie pour une génération ou un build ultérieur.

## Ce qui est réellement fourni

**15 images fixes RGB, aucune transparence, aucune planche d’animation, aucun clip.** Chacune représente une seule pose. Les dix compagnons ont des anatomies différentes : ils ne constituent ni dix frames de marche, ni dix variantes validées d’une même espèce. Le JSON associé conserve les dimensions, SHA-256, nom exact, pose, fond et décision de classement de chaque fichier.

| Fichier exact | Dimensions | Observation / destination prudente |
|---|---:|---|
|`Yautja-Compagnion.jpg`|2484 × 1696|Créature brune cornue, épines longues, vers la gauche. Compagnon original utilisateur, non attribué au chien cinéma de Tracker.|
|`Yautja-Compagnion-2.jpg`|2414 × 1760|Quadrupède gris-brun, tête haute, crête et queue ; compagnon distinct.|
|`Yautja-Compagnion-3.jpg`|2360 × 1824|Quadrupède trapu à plaques claires ; compagnon distinct.|
|`Yautja-Compagnion-4.jpg`|2360 × 1824|Quadrupède sombre à grandes pointes ; compagnon distinct.|
|`Yautja-Compagnion-5.jpg`|2360 × 1824|Quadrupède noir au museau allongé et crinière ; compagnon distinct.|
|`Yautja-Compagnion-6.jpg`|2360 × 1824|Quadrupède bas, reptilien et cuirassé ; compagnon distinct.|
|`Yautja-Compagnion-7.jpg`|2360 × 1824|Quadrupède à grandes canines, avant-patte levée ; une pose, pas une marche animée.|
|`Yautja-Compagnion-8.jpg`|2360 × 1824|Quadrupède élancé à queue recourbée ; compagnon distinct.|
|`Yautja-Compagnion-9.jpg`|2360 × 1824|Quadrupède à longue tête cuirassée et longue queue cuirassée recourbée en S ; préserver son anatomie avant rig.|
|`Yautja-Compagnion-10.jpg`|2360 × 1824|Quadrupède bleu-noir, museau effilé et plaques dorsales. Fond blanc opaque.|
|`Yautja-PredDog.jpg`|2106 × 2048|PredDog distinct, vers la droite, quatre pieds visibles, fond noir opaque. Ne pas fusionner avec le chien de Tracker.|
|`Amengi female.png`|1533 × 1026|Bipède insectoïde rouge aux yeux dorés, vers la droite. Attribution Amengi du nom utilisateur ; design non certifié canonique.|
|`Arid Ermit Yautja.png`|1024 × 1536|Humanoïde maigre gris-beige, vers la droite. Personnage original utilisateur, conserver ce nom.|
|`Yautja Mutated.png`|1024 × 1536|Humanoïde mutant rouge-brun, vers la droite. Personnage original utilisateur, sans cause de mutation inventée.|
|`f9813tjlmsz21.jpg`|575 × 385|Petite référence de créature rouge sur fond noir ; identité incertaine. Ne pas créer automatiquement une quatrième identité.|

Les compagnons 1 à 10 regardent la gauche. Les personnages et le PredDog regardent la droite. Une future découpe doit conserver les griffes, dents, épines et queues ; retirer le fond ne créera aucune pose supplémentaire. Le contact au sol et les ombres actuelles sont peints dans les images, pas des ancres moteur.

## Fidélité et doublons

La [fiche officielle Hot Toys Tracker With Hound MM#147](https://www.hottoys.jp/item/view/100001667) associe le chien à Tracker dans *Predators* (2010), et décrit une gueule dentée avec de longues épines dorsales. Une ressemblance générale ne suffit pas à attribuer le fichier sans suffixe à ce chien : **les dix compagnons sont conservés comme créations originales utilisateur**. PredDog reste une interprétation fournie distincte de la créature 2018. Aucun dessin du pack n’est certifié 1:1.

Comparaison binaire **avant les copies d’import** : 3 721 fichiers de `public/**` et `app/game/data/**` examinés par taille, puis SHA-256 pour toute taille candidate : **aucun doublon exact**. Aucun nom exact du nouveau pack retrouvé dans les registres consultés. Cela n’exclut pas une ancienne version recadrée ou recompressée : aucun alias d’identité n’est déduit d’un simple nom ou d’une ressemblance. Les quinze sources copiées sont désormais volontairement présentes.

Le bestiaire possède déjà `hell-hound-stalker` dans `enemyRosterV7.ts`, et une déclinaison écologique de Cinder dans `ecologyV8.ts`. Ce profil ne prouve ni la présence de ce nouveau dessin, ni celle d’un compagnon invoqué par Tracker. Il ne doit pas être écrasé ni renommé silencieusement.

## Intégration concrète par priorité

1. **Compagnons terrestres et Tracker distinct** : utiliser les dix détourages comme créatures originales, avec leur provenance et leurs ancres au sol. Créer une vraie entité terrestre déterministe : entrée annoncée, une seule créature active, corps vulnérable, fenêtre d’attaque lisible, rappel, délai avant nouvel appel et arrêt après KO du maître. Le chien cinéma de Tracker demande un dessin de référence séparé ; aucun original ni drone ne devient silencieusement ce chien. Tester les deux orientations, garde/esquive, interruption, attaque unique, rappel, limites d’invocation, transitions de round et replays.
2. **PredDog** : identité et présentation séparées. Un moteur commun de compagnon est possible ; l’apparence, l’espèce, le rôle et le propriétaire ne doivent pas être confondus. Son fichier ne fournit pas de morsure ou de course animée.
3. **Amengi** : ennemi distinct avec rig insectoïde, fiche de bestiaire et rencontre explicite. Ne pas le placer aléatoirement dans une scène de film. Corps, locomotion, attaque, réaction et défaite doivent avoir des volumes et états propres avant annonce de livraison complète.
4. **Deux Yautja originaux** : noms et continuité originale du projet préservés. Aucun canon, clan, arme ou pouvoir ajouté depuis la seule apparence. L’entrée de présentation peut être livrée avant les animations ; la disponibilité combat doit refléter le véritable état des dessins et mouvements.
5. **Dix compagnons originaux** : dix références distinctes, sans noms canoniques inventés. Définir leur rôle réel, contrôler les silhouettes et produire leur rig avant activation.
6. **Référence opaque** : garder `f9813tjlmsz21.jpg` comme référence, sans personnage supplémentaire tant que son identité n’est pas établie.

Livraison art après l’inventaire : `companion-01.png` à `companion-10.png` et `preddog.png`, onze PNG RGBA natifs OpenAI, 14 088 630 octets au total. Quatre premiers essais ont été repris pour cadrage trop serré ou halo. Les silhouettes retenues sont complètes, contrôlées individuellement et sur fond clair ; les limites alpha visibles et les points bas des pieds sont mesurés. De très faibles pixels alpha peuvent subsister hors de la silhouette visible : l’ancre au sol ne doit pas prendre le bas brut du canevas. Le dessin généré n’est pas identique pixel pour pixel à l’original, qui reste conservé.

Cette livraison ne revendique aucune animation créée ni compagnon déjà jouable. Une image fixe déplacée ou légèrement transformée par le moteur reste une présentation procédurale ; elle ne doit pas être annoncée comme une nouvelle planche native de course ou de morsure. Les prompts finaux et chemins de provenance sont conservés dans `docs/v56-companion-cutouts.json`.

## Intégration du registre

Les onze découpes sont maintenant consommées par `CompanionCataloguePanel.tsx`, accessible depuis l’onglet **Compagnons · registre** du dossier du clan. Les fiches montrent leur origine, la pose disponible, l’absence de clips natifs, et proposent le téléchargement de l’original. Elles ne recrutent personne, ne modifient pas la sauvegarde et ne placent aucun occupant dans le vaisseau. La présence à bord est contrôlée par la règle existante `canCompanionAppearAboard`, sans affectation fabriquée par le catalogue.

Validation technique après cette intégration : TypeScript global sans émission réussi ; ESLint ciblé sans erreur (trois avertissements de rendu `<img>` natif) ; 25 tests de contrat/équipement réussis.

Recette navigateur du build V56 sur `127.0.0.1:4175` exécutée par l’agent principal avec une campagne synthétique isolée, puis revue visuelle indépendante des quatre captures : **réussie**. Les onze fiches ont été sélectionnées sur desktop 1280 × 900, mobile 390 × 844 et paysage 844 × 390. Les onze PNG et les onze liens d’originaux répondent HTTP 200 avec SHA-256 identiques aux fichiers attendus ; activation clavier et focus visibles ; aucun débordement horizontal aux deux formats mobiles. Aucune erreur JavaScript ou requête en échec n’a été relevée. Les trois clés de stockage de la fixture restent identiques octet pour octet après consultation, téléchargements et retour au pont (`afc0fce60993270a8e145dce67e192ef34b801e0a1c86dbbda524673c4f56cf7`).

La revue des captures confirme des silhouettes complètes, sans rectangle de fond, des états de sélection lisibles et les limites de livraison explicitement affichées. Aucun correctif visuel bloquant n’a été identifié. Rapport versionnable : `docs/v56-companion-catalogue-qa.json` ; captures locales : `work-local/v56/qa/companion-catalogue/`. La recette ne revendique ni recrutement, ni apparition automatique dans un vaisseau, ni animation native, ni certification cinéma 1:1.
