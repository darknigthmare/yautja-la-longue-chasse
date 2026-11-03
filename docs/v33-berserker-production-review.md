# Berserker V33 — premier lot réel

Contrôle : 2026-09-12T18:49:49.672Z. Dix planches sources OpenAI de1536×1024, huit dessins chacune, ont été produites. Les quatre poses regardant à droite et les quatre poses regardant à gauche ont été demandées séparément ; aucun miroir de moteur n’a été utilisé.

5 planches restent en revue artistique ; 5 sont rejetées. Zéro clip runtime validé dans ce premier lot. Un décodage correct et huit hashes différents ne prouvent ni une bonne animation ni une anatomie correcte.

Référence inspectée : public/game/assets/v23/pit/fighters/berserker-key-art.webp. Les PNG sources et les copies publiques sont identiques octet par octet ; les copies publiques sont des supports de revue, pas une déclaration de couverture gameplay.

| Planche | État | Observations |
|---|---|---|
| idle | authored-review | Eight complete poses, no visible clipping; mask and one wrist blade retained. Breathing/free-hand movement drawn; final anatomy, opposite-side hardware and pixel distinctness not yet validated. |
| walk-forward | rejected | Eight poses produced, body/feet complete. Leg alternation insufficient: contact1/contact3 appear to keep the same leg leading; passing shapes repeat. Do not publish as a working walk cycle. |
| walk-backward | rejected | Eight complete backward-guard drawings produced. Contact phases1/3 retain matching leg lead rather than a clear opposite contact; locomotion cycle not accepted. |
| crouch | authored-review | Eight complete grounded crouch-transition poses with visibly bent knees and changing hip height. Standing/half/full/rising silhouettes distinct; no obvious extra limb or held sword. Extraction and native-runtime review pending. |
| jump-land | authored-review | Anticipation, ascent, tucked descent and landing are distinct in both facings. Some blade tips approach cell boundaries; explicit rectangle/ground-pivot review required before runtime use. |
| guard | authored-review | Eight distinct guard/brace poses, single forearm-mounted blade, no shield or added weapon. High free-hand position touches mask; guard silhouette and hidden blade-hand anatomy require close-up review before acceptance. |
| hurt | authored-review | Readable non-graphic recoil, peak recoil, balance recovery and neutral phases. Tilted head changes mask projection; reference-shape consistency and outer foot margins need close review. |
| light | rejected | Startup/strike/recovery poses drawn in both facings. Active strike hides or omits the fist at the end of the right gauntlet; cannot validate wrist-blade anatomy. Active blade crosses requested regular-cell boundary. Requires targeted hand repair and explicit safe frame extraction. |
| medium | rejected | Both directions have four action poses and the fist is visible in active phase. Active wrist weapon appears split into two parallel blades rather than the reference single blade. Left-facing early recovery rotates far away from intended compact side-view stance; not accepted. |
| heavy | rejected | La lame du startup ne prolonge pas clairement l'axe du poignet : son orientation évoque une lame rabattue vers l'avant-bras. Les dessins d'impact et de suivi masquent le poing et peuvent évoquer deux pointes de lame ; cohérence anatomique non validable. Une variation dessinée est présente mais ce n'est pas un clip accepté. |

La découpe régulière384×512 est un outil de contrôle seulement. Toute silhouette traversant cette grille nécessite des rectangles explicites validés ; aucune découpe n’a été acceptée automatiquement. Le fond magenta est déclaré avec un color-key explicite. Les résidus de contours mesurés et les éventuelles frontières occupées restent documentés dans le rapport pixels.

Provenance et paramètres : art-source/v33/pit/berserker/berserker-ten-sheets-provenance-v33.json. Prompts exacts : berserker-ten-sheets-prompts-v33.json. Les réparations ciblées à venir doivent conserver ces brouillons et produire de nouvelles sources.


## Réparations et cohérence d’identité

V23 conservée pour tout le lot après comparaison visuelle avec V5. La V5 comporte filet, trophée hanche/colonne, écran ouvert et lame ambiguë ; pas de mélange partiel. Aucune revendication1:1 film.

Dix nouvelles sources de réparation sont conservées, soit vingt planches produites au total. Les anciens rejets sont conservés, pas remplacés ni comptés comme clips. Les reçus locaux complets restent privés sous work/v33-sources ; les manifestes partageables contiennent uniquement identifiants exec-*.png, chemins relatifs et SHA256.


## Couverture acceptée après réparations

Sept pages et54 dessins sont acceptés pour14 séquences orientées, soit26 clips de moteur : idle, entrée accroupie puis maintien, entrée garde haute puis maintien, recul, et trois attaques debout avec startup/contact/récupération. La dernière pose de remontée de crouch est volontairement exclue : maintenir la commande ne doit pas relever le personnage. Les coups courts utilisent un dessin tenu par phase et deux dessins de récupération ; ils ne sont pas déclarés bibliothèques complètes.

La recette Chrome utilise le vrai loader et drawPitSpriteSheetAnimation.56 captures vérifient54 dessins et deux maintiens de crouch : zéro bord tronqué, zéro erreur JavaScript/HTTP. Des pixels magenta de contour demeurent visibles sur certains détails (1852 pixels mesurés dans les56 captures agrandies avant correction du seul pivot de recul). Aucun damier ni aplat magenta n’est accepté. Le pivot horizontal du recul suit le bassin pour éviter que l’appui d’un seul pied décale le buste.

Marche avant rejetée après plusieurs réparations, sauts/réceptions, réactions hurt, garde basse et toutes les actions non listées restent manquants. La pose idle tenue de la bonne orientation est un repli explicite, pas une animation inventée.


## Contrôle à taille native et bilan final

Le renderer intégré a été capturé à100% (deviceScaleFactor1, aucun agrandissement Canvas/CSS) sur fonds clair et sombre :16 poses,5 à15 pixels magenta isolés par pose testée, pas de halo continu observé. Ces détails restent une limite artistique visible à l’inspection, sans nécessiter un nettoyage global risquant le masque ou les dreadlocks. Le processeur partagé et les PNG sources restent inchangés.

Bilan du lot :20 sources réelles et160 échantillons produits ;7 pages acceptées,5 en revue,8 rejetées.54 dessins entrent réellement dans26 clips de moteur, ou14 séquences quand les deux orientations sont comptées séparément. Les10 planches initialement demandées ne constituent donc pas10 animations complètes.

Manques prioritaires de Berserker après intégration : marche avant ; saut/apex/chute/réception ; hurt et réactions de garde ; garde basse et sortie accroupie ; attaques accroupies/aériennes ; technique, saisies synchronisées et réactions de victime ; chutes/relevés, finisher et états de fin de manche. Aucune pose tenue de repli ne compte comme couverture de ces actions.


Recette finale dans le vrai PitCanvas :14 contrôles clavier passent (les trois attaques, accroupissement, garde haute, recul et marche avant tenue, chacun dans les deux orientations). Les trois phases de chaque attaque et leurs quatre dessins ont été observés réellement ; la marche avant affiche uniquement le premier idle de la bonne orientation avec statut sprite-sheet-hold. Zéro erreur JavaScript/HTTP.27 tests de pixels/loader/phase/repli passent, TypeScript et ESLint ciblé passent. Aucun changement de PitCanvas ni du processeur de transparence partagé dans ce lot.
