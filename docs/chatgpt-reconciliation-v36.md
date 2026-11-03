# Reprise des nouvelles conversations — 19 septembre 2026

Base comparée : `873aefd` (V35 vérifiée). Neuf conversations récentes du projet **Yautja The Long Hunt** ont été lues via le connecteur. Le manifeste `chatgpt-source-manifest-v36.json` consigne leur provenance et leurs limites. Les pages sont épuisées, mais quatre messages atteignent la limite de 20 000 caractères ; cela ne constitue ni une lecture exhaustive du projet ni la récupération de ses pièces jointes générées.

## Ce qui change le cahier des charges

| Sujet | Direction retenue | État du jeu à la reprise |
|---|---|---|
| Origines | Youngling dans la nurserie, puis Unblooded en ville ; titre existant conservé | Le bouton Jouer ouvre encore la campagne adulte V35 |
| Rang | Épreuves et reconnaissance distinctes de l’honneur ; Adjutant est une fonction | Quatre rangs de campagne encore calculés sur l’honneur |
| Vaisseau | Premier appareil personnel après le rite Blooded ; transports du clan auparavant | Accès initial de la campagne V35 conservé pour éviter une régression |
| Rites | Quatza-Rij à trois, pyramide changeante à trois sans armes à énergie, retour solitaire avant Élite | Ces missions ne sont pas jouables |
| Homeworld | Désert, Forêt, Slums : Unblooded. Lava, Darkjungle : Young Blood. Tous les territoires Élite : Élite | Les régions historiques ne sont pas automatiquement renommées ou remplacées |
| Warp | Nomination Adjutant et quête d’obtention ; chroniques de films avec avatar imposé puis rejouabilité personnelle | Portail, chroniques et module non implémentés |
| Réserves | Dix géographies proposées, huit secteurs chacune ; catalogue de 100 humains armés | Catalogue textuel récupéré ; pas un mode Battle Royale, pas 100 PNJ actifs |
| Compagnons | Recrutement puis affectation ; aucun occupant ou compartiment gratuit ; Premium désigne la qualité narrative | Système de recrutement et scènes de compagnon non implémentés |
| Expédition | Corps anatomique entier, coiffure entière, équipement séparé avec attaches/occultations | Rendu atomique historique encore utilisé ; les clips PIT ne couvrent pas l’Expédition |
| Xeno Prime / Berceau | Monde original xénomorphe ; secteur à douze tableaux, reine au dernier tableau | Proposition de niveau, aucun tableau déclaré jouable |

La règle d’accès Lava/Darkjungle vient d’une instruction **de l’utilisateur** dans « Mission jeunesse Yautja ». La simplification « toutes zones normales Unblooded » proposée par un assistant dans « Progression des rangs Predator » ne l’annule pas. Adjudicator et Black God ne sont pas introduits comme grades officiels. L’ordre des rangs, les critères et les rites sont une adaptation du clan jouable, pas une hiérarchie universelle certifiée de la franchise.

## Références visuelles effectivement obtenues

Trois PNG joints par l’utilisateur ont été récupérés, copiés à l’identique et inspectés. Ils restent privés dans `work/v36/new-world-specs` :

| Fichier | SHA-256 | Contenu observé |
|---|---|---|
| e19d211e-7f2b-4b3c-8900-32ff18e316b8.png | ef1e91b343559540db8bd37bd125f2b49bfabe34cc00b308dbfd2e9283162cb0 | Cité sombre, reliefs et lumière de lave |
| f575c404-05ed-4bda-86ae-96f232dfe20a.png | b59137f4d7985a9bf6355f04aae33a67b3ba414ff289d2d007c428bc0bd5a5f3 | Montage architectural : pyramides, terrasses, végétation et cascades |
| 4053724c-84d4-4225-91f1-8ec8ce527737.png | d9b5fc21a7806b9fbfa45d19dac560190c695d0c2ba236c16c04aa22f0f1d70b | Forteresse étendue sous ciel rouge et intérieur sombre |

Ces compositions ne sont pas des couches de parallaxe exportées. Aucune ne montre clairement la forêt souterraine bioluminescente : **le texte de l’utilisateur fait foi** (surface noire, forêt dense souterraine d’arbres et de fleurs lumineux). Le squelette de scolopendre de la nurserie doit être sec, ancien et évidé, jamais une créature charnue.

## Fichiers manquants et production honnête

Les références de téléchargement renvoyées par les chats sont opaques. Aucun des nouveaux ZIP générés n’a été téléchargé. Le pack final des humains est annoncé à 419,6 Mo / 200 PNG, également réparti en quatre sous-packs H001–H025, H026–H050, H051–H075 et H076–H100. Les 100 lignes corrigées avec armement ont en revanche été récupérées et conservées dans `preserveHumanConceptsV36.json`, sans inventer les biographies ou les portraits manquants.

Pour les animations, **50 lots / 517 entrées** reste un budget annoncé, pas 517 sprites importés ou animations validées. Les lots 46–50 et le JSON complet sont à récupérer ; la correction récente exclut désormais équipement fusionné, membres anatomiques détachés et coiffure constituée de mèches clonées. La direction Expédition n’invalide pas les atlas des combattants fixes de THE PIT.

Les annonces de jeunesse (233 poses/sprites), Warp (170 illustrations), biomes (204), Berceau (85 sprites + fonds/compositions) et Xeno Prime (54 images) ne sont pas additionnées aux assets du dépôt. Certains lots remplacent des précédents ou réutilisent une même Matriarche. Il faudra inventorier les archives, comparer les SHA, vérifier mains, identité, orientation, alpha, échelle, cohérence et états avant de compter une intégration.

## Lot V36 et ordre des raccordements

Cette passe ajoute un modèle pur de chronique et ses contrôles : preuves, rites, nomination, conditions d’accès et présence des compagnons. Une reprise V35 conserve une reconnaissance historique séparée ; elle ne fabrique aucun rite et ne supprime aucun acquis. Un dossier consultable expose le parcours cible et le catalogue de proies comme **contenu de conception**. Il n’accorde aucune récompense, ne modifie aucune sauvegarde et ne remplace pas le gameplay de jeunesse.

L’importateur d’animations dispose d’un contrat Expédition séparé pour refuser les nouveaux lots incohérents avant leur raccordement. Le renderer historique reste explicitement à migrer.

Prochaine tranche : récupérer les packs réels, construire la nurserie jouable sans HUD, maintien Prêt annulable et option pression simple, duel jusqu’au KO, révélation par caméra et changement de chapitre durable. Ensuite : cérémonie/formation/baraquements, Quatza-Rij et pyramide, remise du vaisseau, reine d’initiation accessible **avant** Élite, nomination Adjutant et Warp. Ne pas verrouiller les anciennes parties derrière des missions encore absentes.

Les 80 arènes PIT restantes, movesets complets, véhicules jouables, compagnons et mondes annoncés restent des travaux distincts. La livraison V35 compte toujours 20 arènes jouables, 14 combattants sélectionnables, 204 clips orientés validés sur neuf chasseurs, aucun moveset complet et aucun véhicule pilotable. Cette reprise documentaire ne gonfle pas ces compteurs.
