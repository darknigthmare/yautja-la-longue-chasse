# Warp Universe — reprise de production et acceptation

État documentaire au 5 novembre 2026. À lire avec [le chapitre Warp](WARP_UNIVERSE.md) et [le catalogue des 170 fichiers contrôlés](WARP_UNIVERSE_ASSETS.md).

## 1. Comptage sans faux achèvement

| Périmètre | Livré comme image | À produire ou à couvrir par un asset compatible |
| --- | --- | --- |
| Lot 01 | 48 | 0 dans son inventaire |
| Lot 02 | 48 | 0 dans son inventaire |
| Lot 03 | 40 | 2 demandes historiques distinctes, IDs 097 et 098 |
| Lot 04 | 24 | 0 dans son inventaire |
| Lot 05, prévu pour 48 | 10 | 38 |
| Total du périmètre numéroté | **170** | **40** |

Les ensembles « livré » et « manquant » sont disjoints et couvrent les IDs 001 à 210. Les images ne sont ni 210 animations ni 210 éléments intégrés au moteur. Une destination ou une chronique reste un dossier de conception tant que sa scène, ses règles et ses tests ne sont pas produits.

Le lot 05 a été interrompu par une limite de génération dans une session antérieure. Les dates de réinitialisation annoncées alors sont **historiques**, pas un état actuel du service. Les essais 097/098 n'ont pas livré d'image ; cela n'établit ni une interdiction permanente de ces créatures ni leur absence dans les autres ressources du jeu. La bible signale déjà un bestiaire Xénomorphe : le réemploi doit être examiné en priorité.

## 2. Les 40 demandes ouvertes

**Statut de toutes les lignes : image non livrée dans les cinq archives auditées.** Les priorités ci-dessous sont un ordre de travail proposé : P0 = module pilote ; P1 = scènes terrestres/pilotage ; P2 = extension hors Terre. Une ressource existante peut satisfaire la demande après vérification de son identité, de sa provenance et de son adaptation, sans créer de doublon.

Pour les IDs 165 à 210, le chemin reprend le plan de reprise original du lot 05. Pour 097 et 098, ne pas inventer un nom de fichier existant : associer d'abord un asset du bestiaire ou fixer un nouveau chemin lors de sa production.

| ID | Priorité | Chemin prévu ou demande | Contenu et contrôle préalable |
| --- | --- | --- | --- |
| 097 | P1 | Guerrier Alien — chemin à attribuer | Chercher le bestiaire existant, choisir l'œuvre et la caste, vérifier silhouette entière, queue et pose. |
| 098 | P1 | Predalien — chemin à attribuer | Chercher une ressource compatible AVPR, vérifier anatomie et rôle ; pas de succès annoncé sur la base des anciens essais. |
| 165 | P2 | `cinema/165_predators_hanzo.png` | Hanzo ; verrouiller scène, costume et équipement avant génération. Les formulations historiques du prompt et du brief divergent : ne pas mélanger deux phases. |
| 166 | P2 | `cinema/166_predators_nikolai.png` | Nikolai ; tenue et arme à canons multiples, équipement entier. |
| 167 | P2 | `cinema/167_predators_mombasa.png` | Mombasa ; vérifier tenue, arme et silhouette sur référence. |
| 168 | P2 | `cinema/168_predators_stans.png` | Stans ; costume, tatouages et posture entière à vérifier. |
| 169 | P2 | `cinema/169_predators_noland.png` | Ronald Noland ; tenue et matériel récupéré de la scène retenue. |
| 170 | P2 | `cinema/170_predators_edwin.png` | Edwin ; vêtements civils et accessoires selon la scène. |
| 171 | P2 | `cinema/171_predators_berserker.png` | Berserker ; biomask, morphologie et armure propres à cette incarnation. |
| 172 | P2 | `cinema/172_predators_falconer.png` | Falconer ; biomask allongé, équipement et référence de l'appareil distincts. |
| 173 | P2 | `cinema/173_predators_tracker.png` | Tracker ; défenses du masque et matériel de traque à contrôler. |
| 174 | P2 | `cinema/174_predators_classic.png` | Classic ; pose entière debout, équipement usé correspondant à la scène. |
| 178 | P1 | `decors/178_rome_thermes_fond.png` | Thermes vides, arcades et bassins, bande de circulation libre. |
| 179 | P1 | `decors/179_viking_halle_fond.png` | Maison longue, poutres, bancs, foyer en retrait et passage continu. |
| 180 | P1 | `decors/180_medieval_forge_fond.png` | Forge, enclume, soufflet et foyer ; aire de mouvement lisible. |
| 184 | P1 | `decors/184_1916_poste_secours_fond.png` | Poste de secours vide, lits et fournitures hors du passage. |
| 185 | P1 | `decors/185_1942_hangar_fond.png` | Hangar aéronaval, établis et caisses ; perspective compatible avec l'appareil. |
| 186 | P1 | `decors/186_moderne_station_metro_fond.png` | Quai, escaliers et couloirs raccordables ; aucune géographie réelle prétendue sans référence. |
| 189 | P1 | `epoques/189_egypte_contrepoids.png` | Mécanisme pierre/bois/cordes complet ; parties mobiles à préparer séparément. |
| 190 | P1 | `epoques/190_rome_grille_coulissante.png` | Grille dans son cadre ; vrais vides alpha et débattement documenté. |
| 191 | P1 | `epoques/191_viking_treuil.png` | Treuil d'amarrage, corde et socle ; orientation et axe cohérents. |
| 192 | P1 | `epoques/192_medieval_brasero.png` | Brasero entier ; flamme séparée pour animation plutôt que feu supposé animé. |
| 193 | P1 | `epoques/193_japon_cloche_bonsho.png` | Cloche et portique ; balancement, point d'attache et accès. |
| 194 | P1 | `epoques/194_caraibes_chaloupe.png` | Chaloupe avec rames rangées ; pose de navigation distincte si pilotable. |
| 195 | P1 | `epoques/195_west_aiguillage_levier.png` | Levier, socle et tringlerie ; états et raccord aux voies. |
| 196 | P1 | `epoques/196_1916_telephone_campagne.png` | Boîtier, combiné et câble contenus ; appareil de référence à fixer. |
| 197 | P1 | `epoques/197_1942_generatrice.png` | Génératrice sur châssis ; câbles et raccords électriques identifiables. |
| 198 | P1 | `epoques/198_moderne_armoire_electrique.png` | Armoire entrouverte ; états fermé/ouvert et panne à prévoir ensuite. |
| 199 | P0 | `module/199_module_baie_warp_fond.png` | Salle de baie vide, sol dégagé ; réserver l'espace des vrais props 001–005, éviter un portail peint en doublon. |
| 200 | P0 | `module/200_module_salle_avatar_fond.png` | Salle de synchronisation ; alcôves, circulation et capsule indépendante. |
| 201 | P0 | `module/201_module_archiviste_yautja.png` | Archiviste original ; réutiliser un rôle/PNJ existant si approprié, sans inventer son recrutement automatique. |
| 202 | P0 | `module/202_module_sas_decontamination.png` | Sas complet, aperture transparente, circulation et états de porte. |
| 203 | P0 | `module/203_module_memoire_avatar.png` | Réceptacle d'archive original ; provenance et place dans la console. |
| 204 | P2 | `cinema/204_predators_cuchillo.png` | Cuchillo ; tenue, moustache et armes conformes à la scène de référence. |
| 205 | P2 | `cinema/205_predators_jungle_fond.png` | Forêt de la planète-réserve ; monde extraterrestre, pas Terre. |
| 206 | P2 | `cinema/206_predators_camp_chasse_fond.png` | Camp de chasse ; géométrie et entrées à documenter, pas un simple décor générique certifié 1:1. |
| 207 | P2 | `cinema/207_predators_refuge_noland_fond.png` | Refuge dans l'épave ; raccords et surfaces praticables à construire. |
| 208 | P1 | `cinema/208_kok_village_viking_fond.png` | Identifier la scène et le lieu avant reproduction ; ne pas confondre avec le fjord original WU-E05. |
| 209 | P1 | `cinema/209_kok_chateau_japon_fond.png` | Château et toitures ; identifier la phase temporelle du récit japonais. |
| 210 | P1 | `cinema/210_kok_pont_aeronaval_fond.png` | Pont et îlot aéronaval ; vérifier navire, scène, orientation et théâtre atlantique avant prétention 1:1. |

Les briefs artistiques originaux et leurs références sont conservés dans `PLAN_REPRISE.json` et `A_PRODUIRE.md` de l'archive 05. Ils sont des points de départ, pas une preuve d'exactitude de tous les costumes. Les exigences ajoutées ici évitent les incohérences avec le module et la géographie de la bible.

## 3. Reste à produire au-delà des 40 images

| Chantier proposé | Réemploi et tâche | Critère de sortie |
| --- | --- | --- |
| WU-PROD-01 — raccord de progression | Relire WARP-R01–R24 et les sauvegardes ; mapper M029–M034 sans renommer les flags | Matrice des 24 règles, mapping réel et migration testée, aucun rang gratuit. |
| WU-PROD-02 — baie pilote | Géométrie jouable autour des props existants ; sortie et zones d'usage | Aller de l'entrée à la console puis au portail et revenir, sans obstacle/porte flottante. |
| WU-PROD-03 — états du portail | Silhouette/pivot communs, membrane séparée, ouvertures et pannes | Pas de changement de taille/position entre états, effets attachés au bon endroit. |
| WU-PROD-04 — transit et retour | Instance, checkpoint, budget de retour, interruption et débriefing | Retour possible après les cas d'échec prévus, personnage et inventaire restaurés. |
| WU-PROD-05 — première expédition | Une carte terrestre complète et ses trois propositions de mission | Objectifs, IA, conséquences, raccourcis et extraction réellement vérifiés. |
| WU-PROD-06 — première chronique | Arc précisément délimité, avatar prescrit, conclusion et reprise | Mort scénarisée et mort de gameplay distinguées ; Réécriture débloquée seulement au bon terme. |
| WU-PROD-07 — Réécriture | Avatar personnel, restrictions explicites, fins alternatives | Même géographie, nouvelles issues clairement non canoniques, pas de duplication de récompenses. |
| WU-PROD-08 — animation des acteurs | Poses et gestes par rôle, atlas et sockets existants | Déplacements et actions lisibles en scène ; une pose fixe ne compte pas comme cycle. |
| WU-PROD-09 — systèmes d'époque | Trains, navires, portes, treuils et alarmes selon la mission | Référentiels mobiles, collisions et commandes cohérents, pas seulement props décoratifs. |
| WU-PROD-10 — aérien de 1942 | Angles, vol, caméra, poursuite, dégâts, transfert de contrôle | Parcours aérien réel testé ; aucun modèle au sol renommé « combat aérien ». |
| WU-PROD-11 — VFX/SFX/musique | Réutiliser les besoins M030–M033, MUS-43/44 ; nouveaux exports séparés | Sons réellement présents, boucles propres, effets orientés et niveau sonore contrôlé. |
| WU-PROD-12 — fidélité et performance | Revue œuvre/scène/angle + rendu à l'échelle du jeu | Revue humaine tracée ; mesures matérielles distinctes du contrôle des fichiers. |

Les identifiants WU-PROD sont ceux de ce suivi documentaire. Ils ne doublent pas les quêtes R2 et ne sont pas des fonctions déjà codées.

## 4. Contrôles d'acceptation à exécuter lors de l'implémentation

**Tous les contrôles de gameplay ci-dessous restent ouverts.** Ils sont des critères de test, non des résultats obtenus pendant la rédaction.

| ID | Cas | Résultat attendu |
| --- | --- | --- |
| WU-QA-01 | Blooded possède un vaisseau mais n'est pas Adjutant | Module non ouvert ; progression ordinaire possible. |
| WU-QA-02 | Adjutant reconnu, fonction différée ou accès narratif manquant | Motif précis affiché ; aucun contournement par XP ou simple menu. |
| WU-QA-03 | Ancienne sauvegarde avec chasses déjà terminées | Crédit des accomplissements attestés, sans nouveau grind ni succès fictif. |
| WU-QA-04 | Catalogue jouable inférieur au seuil proposé de 12 | Aucun verrou impossible imposé par cette valeur non arrêtée. |
| WU-QA-05 | Pièce de M031 ratée, module M032 non calibré | Réparation/test requis ; travaux acquis conservés. |
| WU-QA-06 | Joueur sans clan ship | Baie du vaisseau personnel utilisable dès que les vrais prérequis sont remplis. |
| WU-QA-07 | Campagne sans Warp | Route vers Elite et suite de campagne toujours accessible. |
| WU-QA-08 | Expédition originale | Avatar personnel, pas de personnages de film ajoutés par défaut. |
| WU-QA-09 | Première entrée dans une chronique | Avatar, équipement et règles de cette chronique appliqués, inventaire personnel préservé. |
| WU-QA-10 | Mort prématurée de l'avatar cinéma | Reprise de l'instance, pas d'achèvement ni de déblocage indu. |
| WU-QA-11 | Conclusion scénarisée mortelle atteinte | Chronique réussie ; avatar principal vivant et restauré au retour. |
| WU-QA-12 | Une chronique terminée, autres inachevées | Sa Réécriture seule devient accessible immédiatement. |
| WU-QA-13 | Réécriture choisie | Avatar personnel et issues alternatives annoncés, référence canon conservée séparément. |
| WU-QA-14 | Même reçu traité deux fois ou deux onglets actifs | Récompenses appliquées une seule fois ; conflit de sauvegarde détecté. |
| WU-QA-15 | Fermeture/rechargement pendant transit ou instance | Reprise versionnée ou retour sûr ; ni perte silencieuse ni copie d'inventaire. |
| WU-QA-16 | Stockage indisponible lors de l'entrée ou du retour | Échec explicite, état récupérable, pas de succès de sauvegarde mensonger. |
| WU-QA-17 | Énergie insuffisante ou fenêtre de retour expirée | Départ empêché ou procédure d'urgence annoncée, jamais de joueur enfermé sans recours prévu. |
| WU-QA-18 | Fin de l'arc suspendant le prototype | Archives et accomplissements conservés, accès suspendu cohérent, instance active sécurisée. |
| WU-QA-19 | Acte imposé au personnage du film | Pas d'exil ni de sanction attribuée automatiquement au Yautja personnel. |
| WU-QA-20 | Infraction du joueur en expédition/Réécriture | Témoins, preuves et jugement JUST ; pas de jauge cachée remplaçant la justice. |
| WU-QA-21 | Recrutement ou récompense d'avatar | Aucun PNJ, animal, véhicule ou compartiment accordé sans sa règle d'acquisition et d'affectation. |
| WU-QA-22 | Passage vers Predators/Badlands ou finale extraterrestre | Coordonnées hors Terre et extension distincte ; aucun renommage d'une carte terrestre. |
| WU-QA-23 | Portail actif/inactif et personnage au seuil | Pivot stable, occlusion correcte, aucun saut de silhouette ou VFX flottant. |
| WU-QA-24 | Château, grotte, tranchée, navire et train | Raccords physiques, collisions, profondeur et accès dans les deux sens contrôlés. |
| WU-QA-25 | Chronique aérienne de 1942 | Appareil compatible, contrôles de vol, caméra, dommages, sortie et reprise testés. |
| WU-QA-26 | Vues clavier/manette/mobile et réductions d'effets | Choix accessibles, sortie identifiable et flashes/distorsions ajustables. |
| WU-QA-27 | Chargement des cinq lots dans le moteur | Mesurer mémoire, temps de chargement et rendu ; ne pas charger 170 PNG pleine résolution sans budget. |
| WU-QA-28 | Promotion d'un asset à `validated` | Revue artistique humaine avec œuvre/scène/angle et contexte de rendu, distincte de l'audit ZIP. |

## 5. Vérifications effectivement réalisées pour cet ajout

- Lecture de la PR #116 et de sa branche, des règles du dépôt, des sections de rangs, de l'arc NECA, de la justice, de L-10 et des fiches M029–M034 de la bible.
- Récupération des cinq archives sources et ouverture des manifestes ; décodage des 170 PNG et contrôle de leurs dimensions, SHA-256 et alpha.
- 170 IDs uniques ; aucun doublon exact de PNG par SHA-256 ; **146 transparents / 24 opaques** ; 40 IDs ouverts distincts ; union exacte des IDs 001–210.
- Conservation des 68 fiches de campagne, des branches W-01–W-05, des flags documentaires existants et des voies d'accès ; les 36 missions proposées restent un catalogue.

**Non effectué :** implémentation de Warp Universe, intégration de ces PNG dans `public/`, lancement du jeu, QA navigateur/manette, certification artistique 1:1, tests de sauvegarde du futur module, nouvel audio, merge ou déploiement. Les contrôles documentaires et de fichiers ne valent pas ces validations.
