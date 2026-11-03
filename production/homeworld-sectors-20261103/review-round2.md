# Revue du complément — huit sprites indépendants

La première livraison de 17 sprites est conservée. Cette revue porte uniquement sur les huit ajouts qui portent le lot à 25. Les PNG ont été affichés individuellement ou par paires, sans retouche de leurs pixels. Le coordinateur a généré S06/S07 ; un autre assistant les a aussi inspectés. Les six autres images ont été générées par deux assistants puis relues par le coordinateur. Il ne s’agit pas d’une validation artistique humaine.

| ID | Observation et limite |
| --- | --- |
| HWM162-S06 | Plateau vide unique, deux poignées intégrées, silhouette entière. Aucun équipement ni présentoir fusionné. Revue croisée de inventory_integration et du coordinateur. |
| HWM162-S07 | Palette basse ajourée unique, plateau vide, attaches intégrées. Aucun chariot, caisse ou abri fusionné. Revue croisée de inventory_integration et du coordinateur. |
| HWM162-M07 | Angle de clôture complet avec trois montants et deux bras. Forme angulaire native, sans retournement logiciel de M04. Les raccords et l’angle réel en scène ne sont pas certifiés. |
| HWM162-M08 | Cadre de portail complet et ouvert, deux montants, traverse et rail supérieur. Aucun battant fusionné. Marges latérales visibles inférieures à 80 px ; aucune coupe observée. |
| HWM162-M09 | Battant à barreaux seul avec deux roulettes supérieures, aucune paire de pylônes. Même toile que M08. Proposition de superposition sans changement d’échelle, avec environ 43 px de garde au sol et 10 px en haut. Raccord et course du battant à valider en scène. |
| HWM162-K07 | Laisse autonome avec poignée cousue, chaîne et mousqueton. Chaîne continue visuellement, objet entier. Référence Hot Toys limitée à l’association poignée/chaîne ; forme et longueur générées non certifiées identiques au film. |
| HWM162-K08 | Leurre cylindrique tressé, bandes bronze, boucle et anneau, sans râtelier. Génération indépendante reprenant la famille matérielle de K03. Aucune source de leurre canonique précis n’est revendiquée. |
| HWM162-K09 | Collier ouvert unique, cuir sombre rembourré, plaques bronze articulées et anneau. Aucune laisse ni créature fusionnée. Marge basse visible 67 px ; silhouette entière. Adaptation originale sans preuve de collier canonique précis. |

## Décision

Les huit sources sont retenues comme candidates artistiques indépendantes. Aucun défaut de silhouette justifiant une nouvelle génération n’a été relevé dans cette revue. Les empreintes exactes sont liées aux observations dans [review-round2.json](review-round2.json).

La mesure d’alpha est consignée dans [technical-report.json](technical-report.json). Les valeurs de faible alpha restent natives. Une silhouette entière à alpha > 24 ne signifie pas que toutes les marges sont parfaitement transparentes ou supérieures à 80 px.

Le battant M09 conserve environ 43 px de garde au sol et 10 px en haut dans la proposition de superposition avec M08. Ce point doit être contrôlé avec la profondeur d’affichage et le déplacement en scène. Aucun fonctionnement de porte, accès, collision, ancrage au sol, échelle physique ou perspective exacte n’a été testé en jeu.

Les architectures et les accessoires inventés restent des adaptations originales du projet. Les références de films, d’art de production et de produits officiels n’établissent pas de plans canoniques de marché, d’écurie ou de chenil, ni de modèle canonique pour K08/K09.

## Traçabilité

- Base de la continuation : `d4c43dce5286fbb64e41ae5fa22cb82854572a7e`.
- Première revue : [review-independent.md](review-independent.md).
- Audit des compléments et des réemplois : [modularity-audit-round2.json](modularity-audit-round2.json).
- Reçus et prompts exacts : [marché](receipts/market.json), [montures](receipts/mounts.json), [chenils](receipts/kennels.json).
