# V123 — Recherche YouTube et captures PHG avant reconstruction de texture

**Portée :** complément à la V122, sans fermer artificiellement les 34 variantes manquantes. Les quatre vidéos ci-dessous ont été trouvées et leurs métadonnées / chapitres annoncés vérifiés, mais les **frames des vidéos n'ont pas été récupérées ni inspectées** depuis cet environnement : aucune minute n'est attribuée à un shader tant qu'un screenshot réel avec libellé choisi n'est pas disponible.

## Principales vidéos

- **ZACH SPEIGHT, 13 mai 2021**, PHG V2.19 PS4 Pro : [All Predator Skin Patterns and Colours](https://www.youtube.com/watch?v=VwwtSLpZJUA). Utiliser pour chercher les variantes des patches 2.0, 2.05, 2.08 ; *horodatages précis encore à relever*, et version de 2021 impropre à documenter les ajouts de 2022/2026.
- **Samhain13, 13 septembre 2022** : [All Predator Masks and Shaders](https://www.youtube.com/watch?v=9NRNOn9vC2I). À utiliser pour masques et matières métalliques, pas comme preuve d'une peau nommée.
- **VGam1ng, 25 février 2025** : [All Predators & Masks](https://www.youtube.com/watch?v=PIKANBWJvOA). Modèles de classes, pas les tints équipés.
- **VGam1ng, 22 janvier 2026** : [All Predators & Masks](https://www.youtube.com/watch?v=RvFoZ_NBNNM). Chapitres annoncés : City Hunter 03:33, Exiled 05:41, Valkyrie 08:46, Viking 11:56, Samurai 12:28, Elder 12:58, Cleopatra 13:56, Feral 14:26. Ces chiffres identifient une classe, pas une matière 1:1.

## Screenshots visuellement repérés comme témoins du système de sélection

- [Classic / Blood sélectionnée](https://www.avpcentral.com/yautja-skin-pattern-guide) : exemple positif du menu et du nom de teinte, pas une carte UV.
- [Wolf / Gator / Tension](https://forum.predator.illfonic.com/t/how-to-fix-skin-bug-for-wolf-predator-without-asking-illfonic/27024) : exemple de catégorie affichée et teinte ; vue du modèle partiellement cachée.
- [Raptor / Nuke dans le panneau de prévisualisation](https://forum.predator.illfonic.com/t/female-predator-nuke-skin-and-waves-skin/19720) : la coche d'équipement est sur **Default** ; le sujet parle d'un bug tête/corps, ce qui interdit de déclarer Nuke reproduite sur tout le modèle.

## Notes officielles par période

- [Patch 2.0 Part II (28 août 2020)](https://forum.predator.illfonic.com/t/patch-2-0-part-ii/13552) : JH87 Wasteland, Undergrowth, Badland, Quagmire ; Elder Ancient, Relic, Primeval, Stoic.
- [Patch 2.05 (29 septembre 2020)](https://forum.predator.illfonic.com/t/patch-notes-2-05/14947) : Mottle Ash, Raptor Putrid, Shatter Bleak.
- [Patch 2.08 (27 octobre 2020)](https://forum.predator.illfonic.com/t/patch-notes-2-08/15883) : Terror, Slice, Virus, Mottle Grape, Mottle Dread. C'est une liste de noms officiels, non des couleurs.
- [Patch 2.39 (19 avril 2022)](https://forum.predator.illfonic.com/t/patch-notes-2-39/27316) : Aurora au niveau 500 et teinte nouvelle pour les predlocks Exiled.
- [Patch 3.6.0 (22 janvier 2026)](https://forum.predator.illfonic.com/t/the-jotun-predator-has-arrived/37412) : motif Default de Feral ajusté ; ne pas confondre couleur du cloak et pigmentation.

## Règles d'admission

`app/game/data/phgVisualReferenceResearchV123.json` conserve 34 lignes associées aux 34 dossiers V122, leurs pages et vidéos candidates, les chapitres **issus de descriptions** et les erreurs d'interprétation déjà identifiées. Aucune ligne n'a encore une capture montrant simultanément *nom sélectionné + modèle avec peau sans masque + version contrôlée*.

La preuve 1:1 exige davantage qu'une simple vidéo YouTube compressée : captures du même shader sous éclairage neutre de face/dos/profil, tête et corps cohérents, masques originaux séparés, géométrie et UV de destination validés, tests multi-morphologies et absence d'erreurs de raccords. Une étude V122 peut être rapprochée de ces visuels, sans être déclarée texture officielle du jeu.

**Ne pas embarquer les vidéos ou les screenshots tiers dans ce dépôt public.** Conserver leurs URL, auteurs, versions, éventuels timecodes authentiquement inspectés et SHA-256 seulement si le fichier de capture est disponible légalement pour examen local.


## V123.1 — Anti-confusions vérifiées sur captures et catégories

Les discussions et images de menus changent parfois la classification d'une texture. Leur consultation **ne certifie pas** les pixels des variantes manquantes.

- [Rouge/vert attribué à tort à Epic Exclusive](https://forum.predator.illfonic.com/t/red-green-skin-pattern/5857) : plusieurs joueurs supposent une exclusivité Epic, mais Noktrum identifie le screenshot comme une teinte **Shatter / Fracture**, et l'auteur indique avoir retrouvé cette correspondance. La lumière de la partie n'est pas celle du menu. Cette image ne justifie pas une nouvelle matière Epic 1:1.
- [Patch officiel 2.19](https://forum.predator.illfonic.com/t/patch-notes-2-19/20975) : **Ogre** figure dans « Predator Mask Tint / Alpha Predator », pas dans « Predator Armor Tints ». L'élément `armure_v2_ogre_pending` reste donc non attribué ; ne pas transférer la matière d'un masque sur les plaques du corps.
- [Capture du menu JH87](https://forum.predator.illfonic.com/t/jh87s-armor-for-everyone/15917?page=9) : l'option sélectionnée est **Hunter Armor** parmi les styles d'armure ; l'image n'identifie aucun shader de peau Wasteland / Badland / Quagmire / Undergrowth.
- [Notes officielles V3.00](https://predator.illfonic.com/news/patch-notes-3-00/) : corrections de coloration de plusieurs teintes de peau et d'armure. La date du screenshot doit donc être enregistrée. Des joueurs expérimentant les textures signalent des UV non interchangeables sur certains morphs (témoignage communautaire, pas un export officiel) : [Compatible skins](https://www.reddit.com/r/HuntingGrounds/comments/1kr4hgk/compatable_skins/).

Ces quatre contre-exemples sont conservés dans `attributionPitfallsV123` et testés par la CI. Ils **n'autorisent aucune promotion** d'asset en statut fidèle 1:1.

- [Liste des manquants Elder de la version 2.20](https://forum.predator.illfonic.com/t/predator-customization-bugs-and-missing-stuff-as-of-patch-2-20/22242) : un joueur signale que les peaux Elder **Ancient / Relic / Primeval / Stoic** existent, mais que les **predlocks Elder correspondants ne sont pas disponibles à cette date**. Ne pas recréer une matière de dreads soi-disant officielle en recopiant simplement le nom d'une teinte de peau. Source communautaire datée, à revérifier sur une version plus récente avant d'affirmer leur absence définitive.
