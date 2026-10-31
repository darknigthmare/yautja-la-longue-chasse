# V125 — PHG 2025–2026: sources officielles et études sélectionnables

## Références vérifiées
Les DLC Anubis (13 février 2025), Exalted (25 mars 2025), Witch (24 avril 2025), Oni (19 août 2025), Jotun (22 janvier 2026) et Father (28 avril 2026) ont des sources officielles datées dans `app/game/phgRecentReleasesV125.ts`. Les patchs 3.6.0 et 3.7.0 sont les plus récents repérés au 30 octobre 2026. Le correctif 3.6.0 **modifie le motif de peau Default de Feral**, sans publier les pixels ni les UV d'origine.

Le catalogue V120 contient déjà plusieurs reconstructions pour ces classes. Elles demeurent séparées des études V125, sans import automatique de copies non validées.

## Études V125 réellement utilisables en jeu
Les 12 études V125 sont **des matières originales générées**, assemblées dans un seul atlas WebP local. Elles sont sélectionnables dans le laboratoire cutané et à bord du vaisseau via `phg-study-v125-*`, avec leur statut provisoire visible. Chaque calque est découpé par les masques de silhouette existants, en CSS dans l'aperçu et sur Canvas en mission ; aucun squelette, tête, élément 3D ou équipement n'est écrasé.

Les noms historiques Wasteland/Undergrowth/Badland/Quagmire, Ancient/Relic/Primeval/Stoic, Sector/Ward/Tract sont repères de création **et non preuves des pigments exacts**. La peau Feral corrigée est une étude, non la texture officielle du patch. La fidélité UV/PBR 1:1 n'est pas certifiée.

| Référence officielle | Nom et équipement | Périmètre |
|---|---|---|
| [Anubis](https://forum.predator.illfonic.com/t/patch-notes-3-2-0/36078) | Eye of Ra | 3.2.0, 2025-02-13 |
| [Exalted](https://forum.predator.illfonic.com/t/exalted-predator-is-here/36265) | Dual Swords | 2025-03, 2025-03-25 |
| [Witch](https://forum.predator.illfonic.com/t/the-witch-predator-has-arrived/36352) | Drone | 2025-04, 2025-04-24 |
| [Oni](https://forum.predator.illfonic.com/t/oni-predator-is-here/36985) | Chain Whip | 2025-08, 2025-08-19 |
| [Jotun](https://forum.predator.illfonic.com/t/the-jotun-predator-has-arrived/37412) | Shock Gauntlet | 3.6.0, 2026-01-22 |
| [Father](https://forum.predator.illfonic.com/t/the-father-predator-joins-the-hunt/37649) | Yautja Sword | 3.7.0, 2026-04-28 |
| [Feral 3.6.0](https://forum.predator.illfonic.com/t/the-jotun-predator-has-arrived/37412) | Default Skin Pattern modifié | Ancien et nouveau séparés |

Le paquet source `PHG_V125_12_Etudes_Reconstitutions.zip` contient les douze PNG/WebP individuels, l'atlas et leurs SHA-256. Les videos/captures tierces ne sont pas copiées dans GitHub.

## Sécurité, sauvegardes et QA
Les identifiants des études restent une liste fermée ; un ID de sauvegarde arbitraire ne peut ni ouvrir une URL extérieure ni sélectionner un nouveau fichier. Le cache Canvas distingue le *tile* et pas seulement son chemin d'atlas. Le rendu de la peau n'applique pas les textures à la coiffure, aux anneaux, au masque ou aux plaques. La CI V114 vérifie le chargement du WebP et les régressions CSS/Canvas.

## V125.2 — Contrôle des noms historiques

La publication officielle du DLC utilise **City Hunter ('97)**, tout en attribuant le personnage au film *Predator 2* (1990). La liste du patch 2.0 emploie l'abréviation **CH90**. Ces dénominations ne sont donc pas interchangeables avec un nom de texture vérifié : Sector/Ward/Tract restent des **étiquettes de suivi non retrouvées dans les notes du patch 2.0**.

La traçabilité des douze études V125 a été ajoutée aux 34 dossiers du registre `phgVisualReferenceResearchV123.json` sans en fermer un seul. Les huit teintes JH87/Elder ont un nom reconnu par le patch 2.0, le correctif de Feral est attesté par le patch 3.6.0 ; aucune image de pixels ou carte UV authentique n'a été obtenue.
