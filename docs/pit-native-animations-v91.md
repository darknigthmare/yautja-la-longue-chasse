# THE PIT V91 — premier lot natif admis

Dix plaquettes OpenAI sont intégrées au registre réellement utilisé par les combats, après contrôle des PNG originaux, de leurs deux poses et de leur lecture dans un visualiseur privé. Les pixels sont copiés sans retouche. Ce lot couvre **20 dessins natifs**, pas dix cycles complets ni tout le roster.

| Combattant | Apparence exacte | Plaquettes et orientations |
| --- | --- | --- |
| Wolf | `wolf-avec-casque-4261aca172` | Respiration droite/gauche ; entrée accroupie droite/gauche |
| Falconer | `falconer-avec-casque-f5618ed362` | Respiration droite/gauche |
| Scarface | `scarface-avec-casque-bca00052d4` | Respiration droite/gauche |
| Enforcer | `enforcer-avec-casque-ca164d8925` | Respiration droite/gauche |

Chaque respiration boucle sur deux dessins (30/30 ticks, horloge60 ticks/s). Chaque entrée accroupie de Wolf passe de la pose debout à la pose basse (6/12 ticks), puis conserve le dernier dessin. La hauteur corporelle de référence debout reste identique entre ces deux poses ; le sprite accroupi n’est pas agrandi pour retrouver une hauteur debout.

Les deux côtés sont dessinés indépendamment, sans miroir dans ces clips. Les armes restent attachées au même bras ou tenues par les mêmes mains entre les poses : Maul à deux mains pour Scarface, lance à deux mains pour Enforcer, lame unique pour Falconer, pistolet et lame sur deux bras distincts pour l’apparence fournie de Wolf. La version gauche de Wolf dont le canon visait vers l’arrière a été refusée, préservée et corrigée par une nouvelle génération avant admission.

Ces costumes fournis et ces mouvements originaux sont des **adaptations**, sans certification canon1:1. Une seule vue de référence ne certifie pas les côtés anatomiques cachés. Les timings et la respiration sont des choix de jeu. Le moveset n’a pas été remplacé ; les180 profils partagés signalés par l’[audit de fidélité](pit-fidelity-v91.md) restent à spécialiser. Aucun cycle de marche, attaque, garde basse, victoire, défaite ou finisher manquant n’est annoncé terminé.

Les variantes non masquées et les autres costumes ne reçoivent pas ces plaquettes par emprunt. Le résolveur continue de parcourir les anciens atlas pour les sauts et les autres clips déjà présents. Un échec de décodage ou une action non couverte conserve le secours historique : ce lot ne retire pas tous les sprites fixes ni tous les miroirs de secours du jeu.

La provenance et les six décisions visuelles liées aux SHA des PNG et des contrats sont conservées dans `art-source/v91/pit/intake/manifest.json`. Les40 tentatives originales ont été archivées en quatre commits de dix. Leurs manifestes gardent le statut au moment de l’archivage ; la revue d’admission séparée ne réécrit pas les refus ni les états historiques en attente. Les archives et les outils privés sont exclus de Vercel.

L’audit des pixels du registre entier mesure désormais53 atlas,149 pages logiques,123 PNG physiques et751 dessins distincts. Il compte375 clips orientés, dont357 hors présentation. Ces chiffres incluent des phases isolées et des poses fixes héritées ; ils ne représentent pas375 animations complètes. La couverture reste18 identités /25 apparences, car ces quatre costumes avaient déjà des phases de saut.

Le laboratoire `/pit-lab` lit ce même registre, distingue pose fixe et animation native et tient désormais la dernière pose d’un clip non bouclé. La lecture relance ce clip depuis son début après la fin. La consultation privée n’est pas présentée comme un match public joué.

Validation : cinq tests nouveaux utilisent les PNG réels et le rendu de combat pour vérifier SHA, alpha, découpes, variantes, côtés, priorité, conservation des anciens sauts et accroupissement tenu. Les tests historiques restent inchangés hors des cinq compteurs globaux recalculés à partir des pixels. La compilation Next.js/webpack et le contrôle visuel du laboratoire sont des preuves séparées des tests et de la publication.
