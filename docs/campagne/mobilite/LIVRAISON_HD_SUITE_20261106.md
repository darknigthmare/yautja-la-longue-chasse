# Mobilité — complément individuel HD après fusion de la PR 116

## Livraison réelle

**Dix PNG natifs individuels 21–30, déjà générés dans la conversation mais non envoyés, sont maintenant conservés.** Chaque source fait 1536 × 1024. La dernière image individuelle du Blade Fighter est archivée séparément : sa silhouette ne correspond pas à la référence Kenner et elle ne remplace aucun asset.

La PR 116 est fusionnée ; cet ajout utilise une branche de complément basée sur `cb2f7647ee1c2a1d9cef417d25145431b75d001a`. Les 87 anciens PNG sont contrôlés et conservés sans modification. Cette livraison ajoute 11 PNG / 26 746 681 octets. Le total devient **98 PNG : 30 sources individuelles HD de catalogue, 50 petits concepts, deux essais non retenus et 16 planches historiques**. Il y a toujours 50 sujets de catalogue, pas 98 véhicules.

## Génération et fidélité

La demande de poursuivre via `image_gen` a été exécutée, mais les nouvelles tentatives ont encore renvoyé des compositions collectives non conformes. Elles sont exclues de cette livraison : aucune découpe ou interpolation n'est présentée comme une nouvelle génération HD individuelle. Les inscriptions « 1:1 », « complet » ou « livré » dessinées dans ces compositions ne valent aucune attestation.

**31–50 restent sans nouvelle sortie individuelle HD acceptée.** Les dix images 21–30 sont des sources exploitables pour la revue, pas une certification canonique 1:1. La plupart sont des concepts originaux du jeu ; l'orbe reste une inspiration Badlands à confronter aux références primaires. Leurs halos alpha, états, vues utiles, postes de pilotage et effets séparés restent à traiter. Aucun sprite de PNJ autonome n'a été trouvé dans ces onze fichiers : aucun personnage n'est inventé pour gonfler le bilan.

## PNG ajoutés et observations

| N° | Source individuelle native | Observation à conserver |
|---|---|---|
| 21 | [Forge mobile de clan](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/21_mobile_forge__3q_left.png) | Atelier ouvert, creuset et bras visibles. Echelle et poste du conducteur a controler en jeu. Halo alpha conserve. |
| 22 | [Medivac Scarab](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/22_medivac_scarab__3q_left.png) | Trois alcoves lisibles et coque ivoire. Marques en croix et fumee a reprendre pour eviter une esthetique medicale humaine. |
| 23 | [Capsule Drop Spear](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/23_drop_spear_capsule__3q_left.png) | Pointe de lance visible ; trois petales et place effective pour un Yautja a demontrer dans la vue ouverte. Vue inclinee. |
| 24 | [Sphère d’éjection atmosphérique](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/24_escape_orb__3q_left.png) | Orbe, siege et arcs visibles ; inspiration Badlands seulement, non copie canonique certifiee. Preserver la transparence de la verriere. |
| 25 | [Blood Runner](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/25_blood_runner__3q_left.png) | Moteur rouge, chaines et plaques visibles ; asymetrie et plaques xenomorphes a comparer au brief. Marge de proue serree. |
| 26 | [Bone Grinder](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/26_bone_grinder__3q_left.png) | Broyeur, harpon et poste arriere visibles ; trois noyaux antigrav a confirmer dans les autres vues. Rotation non animee. |
| 27 | [Scavenger Raider](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/27_scavenger_raider__3q_left.png) | Voile dechiree et grappin arriere presents ; chassis double a clarifier. Vue statique unique. |
| 28 | [Sled du voleur de trophées](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/28_trophy_thief_sled__3q_left.png) | Cage et pinces visibles ; hauteur a reprendre pour les passages utilitaires. Emplacement pilote a preciser. |
| 29 | [Moto de poursuite Enforcer](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/29_enforcer_pursuit_bike__3q_left.png) | Fourche U et glyphes ivoire presents ; formes laterales evoquant des roues a clarifier. Arcs EMP a separer en VFX. |
| 30 | [Interceptor Enforcer](../../../art-source/mobilite/vehicules-montures/v0.2-individual-hd/30_enforcer_interceptor__3q_left.png) | Coque fermee et anneau blanc presents ; deux places a demontrer. Anneau actif a separer en VFX. |
| Essai | [Dernier essai Blade Fighter non retenu](../../../art-source/mobilite/essais-individuels/02_blade_fighter__essai_non_retenu.png) | Derniere image affichee : chasseur spatial a ailes en croissant, non conforme a Kenner et au sujet 31 demande. Archive uniquement, ne remplace aucun sprite. |

## Contrôles de source

Le vérificateur PNG existant est réutilisé : signatures, CRC, dimensions RGBA8, décompression et filtres des lignes. Les empreintes SHA-256 des fichiers de conversation sont fixées avant transfert ; les SHA Git sont calculés pour la relecture du dépôt. Un second passage sans écriture vérifie l'idempotence. Les observations d'alpha locales indiquent 0–254 : conserver le canal ne signifie pas un détourage prêt pour le moteur.

[Manifeste consolidé](LIVRAISON_HD_SUITE_20261106.json) · [Production visuelle](PRODUCTION_VISUELLE.md) · [Réception historique des 87 PNG](DEPOT_COMPLET_SPRITES_20261106.md).

Aucun runtime, sauvegarde, rang, recrutement, progression, accès ou atlas validé n'est modifié. Ni build du jeu, ni parcours navigateur, ni revue artistique humaine ne sont revendiqués. Pas de fusion ou déploiement automatique. Le catalogue 01–50 garde ses identifiants.
