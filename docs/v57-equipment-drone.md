# V57 — équipement du duel final et capteur Falconer

## Demandes et périmètre livré

Classeur utilisateur `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx`, lu sans modification. La discussion locale « Audit GitHub de The Pit » confirme de finir les combattants existants avant d'agrandir encore le roster.

| Source exacte | Demande | Résultat V57 |
| --- | --- | --- |
| `02_PERSONNAGES!S5` ; `14_VARIANTES!C5:I5` ; `05_MOVES_PROPOSES!P5` | Le duel démasqué final du Jungle Hunter supprime le canon ; distinguer les incarnations et équipements perdus. | Variante explicite `jungle-hunter-final-duel-v57`, sans canon ni harnais. Refus moteur de l'action et de son projectile ; lames et corps à corps conservés. Les autres versions démasquées ne sont pas désarmées. |
| `16_REGLES!C8:D8` | Respecter les orientations et asymétries natives. | Deux dessins OpenAI distincts droite/gauche, équipements de poignet corrigés ; aucune symétrie logicielle de cette variante. Deux poses fixes, aucun nouveau clip animé. |
| `16_REGLES!C19:D19` | « Capteur mécanique : repérage et retour, pas animal, pas canon. » « Zéro dégât de reconnaissance ; réutiliser la même entité pour l’appel et le rappel. » | Un capteur par Falconer. Deuxième commande : rappel du même ID. Retour automatique, après un marquage unique ou une interruption physique. Le retour ne touche pas et ne renouvelle pas le marquage. |
| `02_PERSONNAGES!S12` | Le drone ne tire pas ; le duel contre Hanzo doit permettre son retrait complet. | Absence de tir conservée. Le retrait lié à un scénario Hanzo n'est pas livré par ce lot. |

Les durées et coûts de l'ensemble des 18 propositions de coups ne sont pas implémentés par cette passe. Le Falconer conserve les paramètres existants du marquage, de déplacement et de la commande ; aucun coût de 30 % n'est revendiqué. Son capteur conserve son rendu technique existant, sans nouvelle animation native produite. Les deux PNG Jungle sont des adaptations du dessin utilisateur, pas une certification de reproduction cinématographique 1:1.

## Moteur et replays

- `pitEquipmentV57.ts` autorise/refuse uniquement le cas exact Jungle Hunter + duel final. `pitCombat.ts` contrôle l'entrée, l'apparition du projectile et la validité des états sérialisés.
- `pitFalconerDrone.ts` conserve une définition historique séparée et ajoute la version avec retour. Les états entrants refusent les doublons et les capteurs déjà utilisés qui tenteraient d'attaquer encore.
- Moteur courant V8 ; les replays V7 passent par un stepper et un checksum de compatibilité. Le fixture Falconer V7 conservé avant modification reste au checksum `823e993e`, octet pour octet.
- Un ancien snapshot de combat V7 repris dans le moteur courant convertit les capteurs historiques en un seul capteur V8 en conservant le premier ID. Cette migration ne réécrit pas les archives d'entrées V7.
- La variante nouvelle ne peut pas être placée dans un replay prétendument V7 ou antérieur. Les modes rematch, reset, changement de round et replay conservent le choix explicite.
- La sélection explique l'absence de canon ; le HUD l'affiche. Le Falconer affiche prêt / rappel disponible / retour. Les deux attributs Canvas `pitPlasmaCount` et `pitTechniqueEntities` sont uniquement des observations, jamais des commandes moteur.

## Preuves

- 158 tests ciblés : PASS, zéro échec. Incluent restrictions réelles des projectiles, corps à corps, deux orientations du capteur, même ID, impacts sans PV/Traque, interruption physique, KO, sérialisation, replays anciens et actuels.
- ESLint ciblé moteur, replays, Canvas, nouveaux modules, tests et recette navigateur : PASS, zéro erreur et avertissement après les ajouts finaux de télémétrie.
- La recette de build a détecté une régression de télémétrie (`state.projectiles` inexistant) : elle a été remplacée par un comptage des vrais `techniqueEffects` dont `device === 'plasma'`. Le contrôle TypeScript global après correction passe, exit 0. Le build fautif n'est pas déclaré validé.
- 16 tests supplémentaires de recettes, UI et intégrité des images passent après mise à jour de leurs attentes V57 : les 410 images V44 conservent leurs SHA et leur total d'octets ; seule la variante générée nommée explicitement est vérifiée séparément, avec ses deux vues natives.
- Recette navigateur reproductible : `scripts/verify-pit-equipment-drone-v57.mjs`. Parcours public roster → variantes → stage → combat, entrées clavier réelles, deux vues desktop/mobile et Falconer des deux côtés. Fixture synthétique dans des contextes jetables ; aucune modification du profil utilisateur. Son exécution et l'inspection de captures sont des validations distinctes des tests moteur.
- Validation navigateur du build local `http://127.0.0.1:4177` : **PASS 6 groupes / 8 duels réels**, le 30 septembre 2026 à 10:33 UTC. Rapport machine `work-local/v57/qa/equipment-drone-final/report.json`. Aucune erreur page/console ni requête HTTP en échec ; toutes les valeurs localStorage sont restées octet pour octet identiques. Exécution par le parent dans des contextes Chrome synthétiques, puis revue indépendante des 12 captures par ce sous-agent.
- La Traque passive est contrôlée exactement, pas ignorée : au spawn immobile à distance 360, gain attendu `floor(frameFin/12) - floor(frameDébut/12)` ; lors des rappels à distance 799,5, gain attendu zéro. Les PV restent strictement identiques. Chaque rappel garde le même ID et un seul capteur ; le marquage puis le retour sont observés des deux côtés.
- Revue visuelle : Jungle final complet, orientation tournée vers l'adversaire, bon gantelet de lames et contre-vue distincte, sans canon/harnais, pied d'appui raccordé au sol, HUD lisible. Formats 1280×720 et 844×390 ; les contrôles tactiles restent sous les silhouettes. Le roster compact mobile ne montre qu'une partie de sa liste défilante et réduit les détails, sans débordement horizontal.
- Limite visible : le drone utilise toujours le symbole procédural cyan existant et son cadre de suivi ; les captures valident son intégration et le statut retour/traqué, pas une reproduction mécanique 1:1 ni une animation bitmap nouvelle. L'aide générique de variantes visible dans ces captures (« pas les règles ») a été corrigée par le parent pour les exceptions d'équipement ; ce changement de texte attend le prochain build et ne fait pas partie des captures référencées.
- La recette a d'abord été rectifiée pour respecter l'interdiction de dupliquer une identité dans le roster, puis pour distinguer la pression passive d'un gain offensif. Ces échecs de recette et la régression Canvas corrigée sont conservés localement ; seul le rapport final est annoncé PASS. Build final suivant et publication restent à établir par le parent.

## Art natif

La provenance complète et les trois prompts (dont une contre-vue rejetée puis corrigée) figurent dans `v57-jungle-final-art-provenance.json`. Les sorties finales sont copiées octet pour octet. Le renderer applique uniquement son contrat privé d'alpha `noiseFloor:1` pour ignorer 19 pixels alpha=1 au bord de l'image gauche ; aucune modification du PNG livré. Les limites optionnelles de caméra ont été retirées pour prendre en compte toute la page native, sans découper la silhouette.
