# Scar V100 — spéciaux et présentations BODY

Ce lot couvre les 14 actions Scar confiées à ce chantier : six spéciaux/équipements et huit présentations. Chaque action possède six dessins articulés par direction, soit 168 cellules natives sur 19 pages finales. Les neuf normales, deux projections et six mouvements M relèvent d’un autre lot ; ce dossier ne les revendique pas.

La source est `app/game/data/pitWorkbookAnimationPlanV100.json`, combattant `scar`, ligne source 7. Chaque proposition conserve le texte extrait, la feuille, la cellule et le SHA du plan. Les durées ci-dessous sont celles du lecteur BODY à 60 Hz ; elles ne certifient pas une mécanique de combat.

| Action | Cellule | Chorégraphie BODY | Durée du lecteur |
| --- | --- | --- | --- |
| S1 | 05_MOVES_PROPOSES!P7 | Deux mains, allonge télescopique, estoc, rétraction | 46 ticks ; source 17/5/24 |
| S2 | 05_MOVES_PROPOSES!Q7 | Sortie et ouverture du shuriken, lancer, suivi, garde | 56 ticks ; source 23/4/29 |
| S3 | 05_MOVES_PROPOSES!R7 | Visée corporelle, appui, recul, absorption et retour ; canon sur socle du pauldron | 51 ticks ; source 20/3/28 |
| S4 | 05_MOVES_PROPOSES!S7 | Déviation puis vrai coude plié ; lames rentrées | 49 ticks ; source 5/14/30 |
| SUPER | 05_MOVES_PROPOSES!T7 | Amorce courte, extension, estoc long, retrait et rétraction | 80 ticks ; source 24/8/48 |
| EQUIP | 05_MOVES_PROPOSES!U7 | Prise dans l’étui, sortie, inspection et rangement du même combistick | 40 ticks ; source 20/0/20 |
| INTRO | 07_PRESENTATIONS!C7 | Inspection d’une gravure hors feuille, pas et garde | 300 ticks |
| VICTOIRE | 07_PRESENTATIONS!D7 | Contrôle des menaces, arme abaissée, passage laissé à l’alliée hors feuille | 300 ticks |
| DEFAITE | 07_PRESENTATIONS!E7 | Garde cédée, genou au sol, lâcher du combistick, maintien vaincu | 300 ticks |
| TAUNT_1 | 07_PRESENTATIONS!F7 | Masque abaissé devant le bas du visage, marque touchée, défi des lames, remise | 60 ticks ; après initiation seulement |
| TAUNT_2 | 07_PRESENTATIONS!G7 | Inspection du vrai combistick, colliers tournés, segment testé puis rentré | 60 ticks |
| FATALITE_1 | 07_PRESENTATIONS!H7 | Fixation à la lance, sortie/ouverture du seul shuriken, coupe puis retrait | 300 ticks |
| FATALITE_2 | 07_PRESENTATIONS!I7 | Revers du talon, appui avant, estoc final, extraction et rétraction | 300 ticks |
| CLEMENCE | 07_PRESENTATIONS!J7 | Action latérale, paume ouverte, recul, ramassage d’un objet de mission, sortie calme | 300 ticks |

Les références BODY inspectées sont les originaux locaux V34 `scar-idle-v34.png`, `scar-medium-v34.png` et `scar-heavy-v34.png`. Les références de montage obtenues ensuite restent des poses de calibration, pas des animations supplémentaires. Chaque page finale est une copie publique byte-identique de son PNG Imagegen ; aucun miroir, rig, détourage par seuil modifié, réécriture de pixels ni remontage manuel de cellules n’a été utilisé.

`intake-manifest.json` est l’index du lot : propositions finales, cellules source, pages publiques, SHA, états d’admission et décisions de toutes les tentatives. `artifact-audit-v100.json` vérifie les 28 clips droite/gauche, six étapes chacun, durées, pivots dans les rectangles, transparence à seuil 2 et égalité des 19 copies publiques. Son état reste en attente tant qu’une proposition n’est pas réellement présente dans le JSON central détenu par l’agent moteur.

Le dossier `intake/` conserve les 68 PNG originaux, leurs 68 fichiers de provenance byte-identique, les 69 prompts, toutes les mesures et toutes les décisions. Une tentative S3 a retourné une erreur d’outil sans image ; elle est enregistrée sans inventer de PNG. Les tentatives refusées restent lisibles avec leur motif : canon frontal doublé, mauvais sens, troisième bras, visage impropre, objet de hanche dupliqué, pointe apparue, fond alpha non vide ou gouttières insuffisantes. Un statut de mesure sûr ne vaut jamais admission anatomique.

Les rectangles et candidats de pivots viennent de `scripts/measure-pit-workbook-native-v100.mjs`, avec `noiseFloor: 2` inchangé. Les pieds ont ensuite été revus visuellement ; une pointe de lance n’est pas un appui. Chaque page a une référence corporelle fixe couronne du biomask → ligne sous semelles, documentée dans les propositions et `intake/body-reference-review-v100.json`. Les deux pages d’une action peuvent avoir des tailles natives différentes, traitées par `pageBodyHeightPx` ; aucune pose n’est agrandie automatiquement pour remplir le cadre.

## Périmètre exact des adaptations

S3 ne contient aucun projectile, bouche lumineuse, flash ou faisceau. Le canon est déjà orienté et monté sur un socle continu du pauldron ; le corps montre la visée, les appuis et le recul. Cette admission BODY ne certifie pas le fonctionnement d’une bouche depuis son seul capuchon visible et ne crée aucune attaque ni entité plasma.

TAUNT_1 porte le contexte public « Après l’initiation de Scar ». Le même masque abaissé couvre physiquement toutes les mandibules et tout le bas du visage, tandis que le front marqué est visible et touché. C’est une adaptation de mise en scène BODY ; aucun visage Scar intégralement démasqué n’est certifié. Les recherches de référence publique ont rencontré un refus réseau CONNECT 403 ; aucune morphologie de Scarface ou d’un Yautja original n’a été substituée.

Les gravures, ombres, plans caméra, Lex, adversaires, armes adverses, géométries de contact, réactions à l’acide et provenance de l’objet de mission restent des dépendances de scène. Les fatalités montrent la vraie chorégraphie de Scar sans partenaire peint dans ces pages ; elles ne constituent pas une exécution synchronisée en duel. Les dégâts, coûts, conditions de confirmation de touche, changements de récit et transitions d’inventaire restent distincts des dessins et du lecteur.

S2 conserve un seul shuriken et des hanches vides après extraction, y compris au lancer gauche et aux deux retours. La première admission a été suspendue après découverte du disque fermé encore présent à la hanche. L’ancien `/game/sprites/v100/pit/scar/scar-special-s2.png` reste intact avec le SHA `d2aa200dca21c0f4d712a70eea33b110502832f341a4315df8490fa1da05ed35` ; il ne constitue plus la source finale du lecteur. Le correctif admis vient de `intake/scar-special-s2-attempt-05.png`, nouvelle URL `/game/sprites/v100/pit/scar/scar-special-s2-corrected.png`, SHA `fa8e84622de3acde190f6cd564c28fc82dc082f681ac518ff8ff2b5c036af752`. Les quatre tentatives intermédiaires et leurs décisions restent archivées.

FATALITE_1 conserve un seul shuriken : après sa sortie, la hanche est vide pendant que l’arme ouverte est tenue en main. CLEMENCE conserve la même lance asymétrique à une pointe avant et une extrémité arrière non tranchante pendant toute la séquence, sans apparition d’une deuxième pointe.
