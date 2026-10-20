# Feral V100 — spéciaux et présentations

Ce lot contient les dessins natifs des treize gestes historiques suivants, dans deux orientations dessinées indépendamment. Les poses de calibration restent hors des animations. Le nombre de dessins décrit les étapes effectivement retenues ; une calibration ou une pose refusée ne complète jamais artificiellement une séquence.

| Source Excel | Geste | Étapes réelles par sens |
| --- | --- | --- |
| `05_MOVES_PROPOSES!Q10` | S2 — déployer, garder, frapper du bouclier puis replier | 6 |
| `05_MOVES_PROPOSES!R10` | S3 — scinder, frapper alternativement puis réassembler | 6 |
| `05_MOVES_PROPOSES!S10` | S4 — déposer la mine puis retrait et témoin ambre/éteint/rouge | 6 |
| `05_MOVES_PROPOSES!T10` | SUPER — coup de bouclier, vraie prise gauche du lanceur puis visée/recul/retour | 6 |
| `05_MOVES_PROPOSES!U10` | EQUIP — sortie, assemblage, séparation et rangement | 6 |
| `07_PRESENTATIONS!C10` | INTRO — bouclier, point visé par masque puis lance séparée | 6 |
| `07_PRESENTATIONS!D10` | VICTOIRE — récupération, assemblage, contrôle des carreaux puis écoute | 5 |
| `07_PRESENTATIONS!E10` | DÉFAITE — recherche de visée, perte d'appui puis effondrement | 6 |
| `07_PRESENTATIONS!F10` | TAUNT1 — clac sur la tranche du bouclier puis garde volontairement ouverte | 6 |
| `07_PRESENTATIONS!G10` | TAUNT2 — lever et inspecter le lanceur existant puis retour | 6 |
| `07_PRESENTATIONS!H10` | FATALITÉ1 — prise contre support, écran, contact masqué, retrait et contrôle | 6 |
| `07_PRESENTATIONS!I10` | FATALITÉ2 — parade, fermeture, seconde lame, retrait, contrôle et rangement | 7 |
| `07_PRESENTATIONS!J10` | CLÉMENCE — désarmement, espace, récupération de la boîte puis départ | 6 |

La source contractuelle est `app/game/data/pitWorkbookAnimationPlanV100.json`, issue de l'extraction V56 épinglée par SHA. Le classeur privé V54 d'origine reste indisponible ; cette limite est conservée dans le manifeste. S1 réutilise les carreaux V59 dans le registre central et ne fait pas partie de ce lot de nouveaux dessins.

## Preuves et admission

- [manifest.json](manifest.json) décrit les treize actions et les admissions réellement présentes dans le registre central.
- [intake/intake-review-ledger.json](intake/intake-review-ledger.json) conserve chaque tentative, son SHA, ses prompts/références, l'original Imagegen, la décision et les seuls rectangles joués. Les essais refusés restent archivés ; aucun n'est effacé pour masquer une reprise.
- `intake/*.measurement.json` mesure à **alpha2** les gouttières, les pixels de bord et les rectangles natifs. Une page globalement refusée peut fournir un fragment sûr ; seuls les rectangles effectivement revus et sans pixel de bord sont admis.
- `intake/reviewed-pages.json` contient les références corporelles fixes et les pivots relus sur les pieds de Feral. Le haut des dreadlocks, une pointe de lance, le mannequin ou une boîte au sol ne définissent pas sa taille.
- `intake/admission-proposal-*.json` est remis au moteur après les revues. Seul son propriétaire fusionne `app/game/data/pitWorkbookAnimationsV100.json` et copie les PNG publics après admission. Le manifeste vérifie ensuite leur identité octet par octet avec l'original conservé.

Les PNG proviennent d'Imagegen avec transparence native, y compris les reprises ciblées d'espacement/anatomie. Aucun miroir, rig, détourage, suppression de halo ou transformation de pixels par script n'a été utilisé. Les nouveaux deux sens ont une anatomie propre : bouclier et lance-carreaux à gauche, lames au poignet droit. Les sorties de Clémence tournent intentionnellement vers le départ.

Les scripts de ce dossier ne changent que des métadonnées : `build-admission-proposals.mjs` vérifie les crops/pivots et interdit les calibrations jouées ; `build-intake-ledger.mjs` vérifie les SHA de toutes les tentatives, les originaux et les copies publiques, puis reconstruit le suivi. Ils ne modifient aucun PNG.

```sh
node art-source/v100/pit/feral/specials-presentations/intake/build-admission-proposals.mjs
node art-source/v100/pit/feral/specials-presentations/intake/build-intake-ledger.mjs
```

## Portée et limites visibles

Les études BODY admises sont accessibles dans le laboratoire ; le statut de chaque geste figure dans le manifeste courant. Elles ne créent aucune mécanique manquante dans le duel : bouclier/Q10, mine `E_F006_mine`, proximité/dégâts, inventaire, confirmation de touche, son, nouvelle munition, fatalité ou récompense ne sont pas déduits des PNG.

H10/I10/J10 utilisent un mannequin articulé neutre et des accessoires dessinés dans la scène. Le support basaltique reste présent pendant la prise/retrait de H10 et la boîte fermée de J10 existe au sol avant sa récupération. Un véritable adversaire et ses réactions synchronisées demeurent des dépendances distinctes. Ces études ne sont pas peintes une seconde fois dans le combat existant.

Quelques variations natives restent explicitement acceptées dans cette portée : largeur de la mine S4 environ **19–21 %** plus grande après normalisation du corps (environ 3–4 pixels affichés), détails des pointes de S3, proportions/cerclage de la boîte J10 et abdomen droit de VICTOIRE B08 plus rouge que A. Elles ne certifient ni une échelle physique stable de l'entité mine ni une continuité chromatique parfaite. VICTOIRE comporte une ellipse entre l'assemblage de la lance et le lance-carreaux déjà en main pour son contrôle ; aucune prise d'inventaire continue n'est revendiquée.

TAUNT1 a fait l'objet d'une lecture contradictoire conservée dans le suivi. La revue finale a confirmé le contact sur l'épaisseur métallique grise du disque de profil ; la source n'impose pas une couleur de peinture. À l'ouverture, les deux lames restent alignées avec le même gantelet droit, leurs racines étant naturellement masquées par la paume.
