# Xeno Prime — reprise des 23 demandes d’images

État documentaire au **5 novembre 2026**, à lire avec [ASSETS.md](ASSETS.md). Le snapshot consolidé contient **85 sprites livrés sur 108**. Les 23 IDs ci-dessous sont absents de l’archive auditée ; leur union avec les 85 livrés couvre exactement 001–108, sans doublon ni renumérotation.

Les prompts complets, les chemins prévus, les références et leur provenance sont conservés dans [REPRISE_ASSETS.json](REPRISE_ASSETS.json). Toutes les lignes portent `non_produit`. Aucun champ `technical_verified`, `runtime_integrated` ou `human_art_validation` n’est promu pour ces demandes.

## La limite historique ne décrit pas le service actuel

La production a été interrompue en septembre 2026 par une limite de génération, dont le service annonçait la réinitialisation le 17 septembre à 23:04:48 UTC. Ce timestamp est conservé comme **historique de production**, sans affirmer une limite actuelle ni une reprise automatique. Aucune nouvelle génération n’a été effectuée pendant cette intégration à la bible.

Les deux directions 056/057 remplacent des essais antérieurs de créatures non livrés : ce sont désormais un nid de guetteur fermé au sol et un cocon mural fermé. Cela n’établit aucune interdiction permanente de générer ces créatures ni aucune absence dans le bestiaire du jeu ; ces deux demandes restent des props passifs, sans ennemi visible.

## Demandes ouvertes

Tous les chemins du tableau sont **prévus dans les futures archives**, pas des fichiers déjà présents dans le dépôt ou sous `public/`. Les clés XENO-BE évitent les collisions avec les numéros d’autres packs.

| Clé documentaire | Image à produire | Chemin prévu | Référence | Dépendance à produire d’abord |
| --- | --- | --- | --- | --- |
| `XENO-BE-028` | Exuvie suspendue | `sprites/ruche/028_exuvie_suspendue.png` | `XENO-BE-BG01` | Aucune |
| `XENO-BE-030` | Vanne tissulaire fermée | `sprites/ruche/030_vanne_tissulaire.png` | `XENO-BE-032` | Aucune |
| `XENO-BE-031` | Filaments sensoriels | `sprites/ruche/031_filaments_sensoriels.png` | `XENO-BE-084` | Aucune |
| `XENO-BE-034` | Passage fermé | `sprites/ruche/034_porte_membrane_fermee.png` | `XENO-BE-017` | Aucune |
| `XENO-BE-035` | Passage sectionné | `sprites/ruche/035_porte_membrane_ouverte.png` | `XENO-BE-034` | `XENO-BE-034` |
| `XENO-BE-036` | Vanne après drainage | `sprites/ruche/036_vanne_drainee.png` | `XENO-BE-030` | `XENO-BE-030` |
| `XENO-BE-056` | Nid de guetteur fermé | `sprites/ruche/056_nid_guetteur.png` | `XENO-BE-025` | Aucune |
| `XENO-BE-057` | Cocon mural fermé | `sprites/ruche/057_cocon_mural.png` | `XENO-BE-017` | Aucune |
| `XENO-BE-067` | Nuage de spores | `sprites/effets/067_nuage_spores.png` | `XENO-BE-001` | Aucune |
| `XENO-BE-068` | Souffle de vapeur | `sprites/effets/068_souffle_vapeur.png` | `XENO-BE-033` | Aucune |
| `XENO-BE-069` | Pulsation nerveuse | `sprites/effets/069_pulsation_nerveuse.png` | `XENO-BE-063` | Aucune |
| `XENO-BE-070` | Impact de poussière | `sprites/effets/070_impact_poussiere.png` | `XENO-BE-013` | Aucune |
| `XENO-BE-071` | Onde tellurique | `sprites/effets/071_onde_sol.png` | `XENO-BE-013` | Aucune |
| `XENO-BE-072` | Voile de brume | `sprites/effets/072_voile_brume.png` | `XENO-BE-001` | Aucune |
| `XENO-BE-079` | Bouchon de résine brisé | `sprites/environnement/079_bouchon_resine_brise.png` | `XENO-BE-078` | Aucune |
| `XENO-BE-097` | Matriarche en agonie | `sprites/boss_actions/097_matriarche_agonie.png` | `XENO-BE-061` | Aucune |
| `XENO-BE-098` | Bulbe nerveux rompu | `sprites/boss_actions/098_bulbe_rompu.png` | `XENO-BE-063` | Aucune |
| `XENO-BE-102` | Éclats de chitine | `sprites/props_effets/102_eclats_chitine.png` | `XENO-BE-054` | Aucune |
| `XENO-BE-104` | Éclaboussure acide | `sprites/props_effets/104_acide_eclaboussure.png` | `XENO-BE-065` | Aucune |
| `XENO-BE-105` | Condensation de bouche | `sprites/props_effets/105_condensation_bouche.png` | `XENO-BE-068` | `XENO-BE-068` |
| `XENO-BE-106` | Poussière de chute | `sprites/props_effets/106_poussiere_chute.png` | `XENO-BE-070` | `XENO-BE-070` |
| `XENO-BE-107` | Étincelles d’impact | `sprites/props_effets/107_etincelles_impact.png` | `XENO-BE-069` | `XENO-BE-069` |
| `XENO-BE-108` | Suintement acide | `sprites/props_effets/108_suintement_acide.png` | `XENO-BE-066` | Aucune |

**18 demandes** disposent déjà de toutes leurs références dans les livrables ; **5** dépendent d’une autre image : **030 → 036**, **034 → 035**, **068 → 105**, **069 → 107** et **070 → 106**. 079 dispose de la vraie source 078 ; 108 de la vraie source 066 ; 102 peut utiliser les débris 054. Une référence disponible signifie seulement que son image source existe, pas qu’elle est intégrée au moteur.

Pour 028, l’ancien résumé A_PRODUIRE_V2.md citait 025, tandis que la reprise consolidée et son prompt choisissent BG01 pour la palette et la matière. La présente bible conserve **BG01 comme référence principale du prompt consolidé** ; 025 reste un repère secondaire possible. Le sujet demeure une exuvie creuse et vide, suspendue à ses propres filaments.

## Ordre et critères de production

1. Chercher les équivalents déjà présents dans le jeu et les autres lots. Conserver l’ID existant s’il couvre réellement la demande ; ne pas importer un second exemplaire simplement pour combler un numéro.
2. Produire les bases nécessaires avant leurs variantes dépendantes. Examiner les références complètes, puis créer **une image indépendante par demande**, avec silhouette entière et véritables vides alpha.
3. Garder le noir de chitine et de résine, le cuivre, les accents cyan/ambre et l’acide jaune-vert. Les variantes d’un même objet conservent son identité et ses points d’attache.
4. Pour 097, garder la tête enracinée au sol, de profil vers la gauche, avec sa couronne entière ; distinguer l’agonie de la mort 062. Pour 098, produire un état de bulbe rompu identifiable, sans réemployer le PNG 063 sous un autre nom.
5. Vérifier décodage, dimensions, empreinte, pixels visibles et transparents, silhouette, trous et franges sur fonds clair/sombre ou gris. Préserver l’alpha natif ; les valeurs de couleur cachées sous alpha zéro ne sont pas à elles seules un halo visible.
6. Enregistrer le PNG source, le final, le prompt et la provenance, puis réviser les états des tableaux concernés, le catalogue et les compteurs. Les états dont l’image manque gardent un comportement documentaire explicite.
7. Lors de l’import moteur, effectuer la revue de pivot, échelle, couches, collision, sockets, commandes et sauvegarde en scène. La revue humaine de fidélité reste distincte des contrôles techniques.

Les sprites 067–072 et 102–108 sont des effets séparés, pas de nouveaux décors complets. Leur orientation, leur ancrage et leur durée seront définis lors du raccord au moteur. Leurs PNG fixes ne constituent pas des systèmes de particules ou des animations certifiées.

## Conditions avant de clôturer ce suivi

- Le nombre livré et le nombre manquant sont fondés sur les fichiers présents, avec IDs uniques et empreintes vérifiées ; aucun numéro prévu n’est compté comme une image.
- Les 056/057 restent des props fermés tant que leur conception n’est pas explicitement changée, et les 097/098 ne sont pas annoncés comme produits avant leur existence réelle.
- Les variantes de passage et de drainage rendent les changements avant/après lisibles ; le boss demeure révélé en entier au dernier tableau seulement.
- Les preuves documentaires, les preuves de fichiers, l’intégration runtime, les tests de gameplay et la validation artistique humaine restent des états distincts.
