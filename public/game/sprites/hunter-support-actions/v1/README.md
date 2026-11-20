# Yautja — Survie, équipement et canopée

Ce lot prolonge les postures, emotes, attaques et déplacements du Yautja de référence. Il ajoute **304 dessins sur 19 planches de 16 images**, pour **16 séquences**. La livraison complète et les résultats réellement exécutés sont consignés dans `verification_report.json` ; l’audit initial conserve séparément son état de planification.

Les sources et les manifestes restent **draft**, orientés vers la droite et sans binding actif au gameplay ou au roster. Les PNG représentent un personnage équipé : ils ne remplacent pas le contrat de corps et d’équipement modulaires.

## Séquences

| Séquence | Dessins source | Lecture de revue |
| --- | ---: | --- |
| Repos vigilant | 16 | Boucle |
| Mise en visée | 16 | Action ponctuelle |
| Visée maintenue | 16 | Boucle |
| Fin de visée | 16 | Action ponctuelle |
| Accroche en canopée | 16 | Action ponctuelle |
| Suspension en canopée | 16 | Boucle |
| Lâcher de canopée | 16 | Action ponctuelle |
| Balancement en canopée | 16 | Boucle |
| Impulsion aérienne | 16 | Action ponctuelle |
| Analyse du terrain | 16 | Action ponctuelle |
| Activation du camouflage | 16 | Action ponctuelle |
| Désactivation du camouflage | 16 | Action ponctuelle |
| Soin de terrain | 32 | Pages A et B consécutives |
| Second souffle | 32 | Pages A et B consécutives |
| Réaction à un impact | 16 | Action ponctuelle |
| Chute mortelle | 32 | Pages A et B, maintien de la dernière pose |
| **Total** | **304** | **4 boucles et 12 actions ponctuelles** |

Le lecteur présente les dessins à 16 images/s. Les boucles peuvent se répéter ; les actions ponctuelles s’arrêtent sur leur dernière image et se relancent avec « Relire » ou la barre d’espace. Les entrées, maintiens et sorties de visée sont des séquences distinctes. Le MP4 montre tous les dessins retenus, sans créer de nouvelles images par interpolation.

## Aperçus

- `preview.html` : lecteur relatif aux PNG du dossier, à ouvrir depuis une copie complète ou un serveur statique.
- `Yautja_Survie_Equipement_Canopee_V1_Apercu.html` : lecteur autonome inclus dans l’archive téléchargeable. Ses atlas sont intégrés au HTML, sans requête d’image, de script ou de style externe. Ce gros fichier n’est pas copié dans le dépôt, à cause de la limite de transfert du connecteur.
- `Yautja_Survie_Equipement_Canopee_V1.mp4` : revue hors ligne des séquences complètes.
- `Yautja_Survie_Equipement_Canopee_V1_Raccords.mp4` : revue parallèle de la visée (entrée → maintien deux fois → sortie) et de la canopée (accroche → suspension deux fois → balancement deux fois → lâcher). Les 112 dessins concernés sont ceux du lot ; les répétitions ne sont pas de nouveaux dessins. Les pivots restent ceux du manifeste. Les instants précis des raccords sont décrits dans `continuity_preview.json`.
- `Yautja_Survie_Equipement_Canopee_V1_Contact.png` : une pose représentative par séquence ; la planche ne constitue pas 16 nouveaux dessins d’animation.

Pour régénérer le lecteur autonome depuis le dépôt :

```sh
node art-source/hunter-support-actions/v1/build_standalone.cjs public/game/sprites/hunter-support-actions/v1
```

## Contenu et pixels

`frames/<page>/01.png` à `16.png` contient les sprites individuels. `atlases/` conserve les 19 sources sélectionnées, byte pour byte. `import_atlases/` contient les 19 planches protégées par deux pixels de garde transparente autour de chaque cellule. Le total est donc **342 PNG d’animation**, auquel s’ajoute la planche de contact.

Chaque planche est divisée en une grille 4 × 4, dans l’ordre gauche à droite puis haut en bas. Les limites sont calculées avec `Math.round(i * dimension / 4)`. Pour une source de 1254 × 1254, les limites sont 0, 314, 627, 941 et 1254 ; les cellules de 313 ou 314 pixels sont exportées dans une image de 314 × 314 avec le seul complément transparent nécessaire à droite ou en bas. Les dimensions réelles de chaque source restent décrites dans `animations.json`.

L’export compare exactement les pixels RGBA décodés, garde l’alpha d’origine et ne redessine ni ne redimensionne le personnage. Les contrôles de bord s’appliquent aux rectangles source avant leur remplissage transparent : une cellule large de 313 pixels est inspectée jusqu’à son vrai bord x = 312. Les faibles traces d’alpha sont consignées, pas effacées automatiquement.

Le lot emploie deux recalages graphiques, appliqués aux métadonnées après inspection des sources. Aucun PNG n’est redessiné ou rééchantillonné.

Pour les **quatre pages de canopée**, le point de revue est le milieu graphique des deux dessus de poings : un pivot par image pour la suspension et le balancement, un pivot constant issu de l’image 16 pour l’accroche et de l’image 01 pour le lâcher. La cible commune vaut (157, 50) dans une cellule de 314 pixels. `apply_grip_registration.cjs` reproduit les mesures alpha ≥128, bande supérieure de 12 pixels et deux composantes à 8 voisins, puis exige le SHA exact de chaque source. Ce recalage de canopée conserve le mouvement des jambes relatif aux prises ; il ne recale pas les pieds ou les hanches.

Pour les **quatorze pages au sol**, `apply_floor_registration.cjs` mesure la dernière rangée source comportant au moins huit pixels d’alpha ≥128. Le pivot vertical utilise le centre de cette rangée (`indice + 0,5`) et la cible commune vaut **Y = 302,5**. Les 224 translations sont entières et exclusivement verticales ; le pivot X reste 157, avec un décalage horizontal nul. La canopée et l’impulsion aérienne sont exclues de cette opération. La position relative des différentes parties du dessin et les pixels restent inchangés, tandis que la dérive verticale du contact graphique est corrigée.

Ces proxies ne certifient ni l’anatomie ni les contacts réels avec un support. Aligner le milieu des poings ne corrige pas leur écartement ; aligner une rangée basse ne corrige pas les volumes, la taille du corps, l’écartement des pieds ou la phase du geste aux raccords A/B. Le support réel et la phase du pendule doivent encore être adaptés au jeu.

`grip_anchor_candidates.json` et `floor_anchor_candidates.json` conservent les reçus candidats originaux. Les fichiers `*_registration_receipt.json` décrivent leur application ; les fichiers `*_registration_checks.json` mesurent les dispersions corrigées, vérifient les pivots d’import +2 et l’unique translation. `png_freeze_receipt.json` et le rapport final attestent séparément la conservation byte pour byte des 342 PNG d’animation.

## Correspondance au jeu

`hunt_support_state_map.json` relie les séquences aux états et événements réellement présents au commit `b97ca20bb72a31ee5e773d9297f446818100c599`. Ces identifiants de production ne sont pas de nouveaux enums du moteur. Les sources et lignes de preuve sont recopiées dans `sources.json` et les manifestes d’import.

- La visée, le camouflage, le scan et les soins conservent leurs conditions et règles existantes. La durée d’une planche à 16 images/s n’ajoute aucune invulnérabilité, obligation d’immobilisation ou fenêtre de soin.
- `cloak_off` représente uniquement une désactivation volontaire acceptée. Une perte forcée du camouflage ne doit pas attendre ce geste.
- Le balancement doit être raccordé à l’angle et à la vitesse physique de suspension ; le lecteur montre seulement un cycle de revue.
- Les impacts ne créent pas un nouvel état de stun. Le second souffle ne modifie pas les règles qui le déclenchent.
- La mort fige immédiatement la simulation existante. Pour montrer la chute en jeu, un futur adaptateur devra utiliser une horloge de présentation indépendante, puis maintenir la dernière pose. Le lot ne change pas la pause ni la reprise du jeu.

Les futures priorités, adaptations aux angles de visée, horloges de présentation, variantes de côté gauche et changements d’équipement restent des travaux d’intégration. Une compatibilité de manifeste ne signifie pas que les séquences sont actives dans la Chasse.

## Reproduction et contrôles

Les outils ont été exécutés avec Node.js 24.22.1 et Sharp 0.35.5, ainsi qu’avec ffmpeg/ffprobe. Les versions exactes de ces exécutables figurent dans `verification_report.json` ; la compatibilité avec d’autres versions n’a pas été vérifiée. Les outils utilisent `require('sharp')`, puis l’emplacement `CODEX_PRIMARY_RUNTIME_NODE_MODULES` s’il est fourni. Le `package.json` local conserve une portée CommonJS, même dans le dépôt dont la racine est en ES modules.

Depuis le dépôt, avec toutes les sources présentes :

```sh
node art-source/hunter-support-actions/v1/build_all.cjs public/game/sprites/hunter-support-actions/v1 app/game/hunterSpriteAtlas.ts
```

Depuis l’archive autonome, passer le chemin du contrat réel du jeu :

```sh
node build_all.cjs . /chemin/du/depot/app/game/hunterSpriteAtlas.ts
```

`build_all.cjs` applique d’abord les reçus des prises et du sol aux seules métadonnées, exporte les PNG et les atlas, produit les manifestes natifs, contrôle les pixels, les prises, le sol et la lecture, crée le lecteur autonome, les deux MP4 et la planche de contact, puis écrit `verification_report.json`. Le contrat réel du jeu doit continuer à refuser la résolution des ressources draft.

Les contrôles du lecteur exécutent son JavaScript réel dans un DOM simulé sous Node, avec images, canvas et horloge simulés. Ils ne constituent pas un parcours navigateur. La vérification ffprobe et les comparaisons de pixels ne sont pas des tests de gameplay ou de performance en jeu. Le statut `validated` demeure réservé à une revue artistique humaine.

`prompts.json`, `provenance.json`, `technical_review.json` et les rapports de contrôle conservent les sources de génération, les opérations mécaniques et les réserves de la livraison. `package_file_index.json` décrit la disposition complète de l’archive téléchargeable ; `repository_file_index.json`, lorsqu’il est fourni, décrit la disposition réellement publiée dans le dépôt.
