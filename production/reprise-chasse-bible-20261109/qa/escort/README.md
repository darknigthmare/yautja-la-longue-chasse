# OPS-B04 : parcours navigateur natif

La recette `scripts/qa-clan-return-escort-browser-20261109.mjs` utilise le **vrai GameClient desktop**, servi par sa configuration Vite. Les commandes visibles passent par le modèle de retour, `persistSocialProgress`, le writer de campagne et la relecture du stockage, puis leur état confirmé est rendu. Aucun callback de quête, résultat de chasse, acteur ou horloge de scène n’est injecté par le navigateur.

Le [lot final natif 07](native-07/browser-verification.json) termine **19 contrôles et 25 captures PNG natives complètes**, dans Chromium 154.0.8037.57, sur 1440 × 1000, 390 × 844 et 320 × 740. Il conserve 1 312 observations de marche et 42 écritures observées. Aucune erreur JavaScript, console ou ressource manquante n’est relevée dans cette passe. Les quinze empreintes de sources contrôlées avant et après, dont les styles globaux, Hub et intérieur, restent identiques.

La commande exécutée est :

```sh
CLAN_RETURN_ESCORT_QA_OUTPUT=production/reprise-chasse-bible-20261109/qa/escort/native-07 node scripts/qa-clan-return-escort-browser-20261109.mjs
```

Une nouvelle exécution doit choisir un autre répertoire : un reçu existant est protégé contre l’écrasement. Le défaut de la commande pointe vers `outputs/qa-clan-return-escort-20261109`, sans réécrire les preuves committées. `CHROMIUM_EXECUTABLE` permet de sélectionner le navigateur installé par la CI.

## Parcours réellement joués

- **Desktop :** préparation du retour avec Garde du Seuil, contrôle de la voie au seuil du hangar, choix du poste médical, retour à l’équipe, départ, quota refusé sur un checkpoint de marche, gel et relecture, suspension par panneau et perte de focus, rechargement depuis les positions sûres, passage physique de toute l’équipe, refus d’écriture sur la porte puis sur la confirmation médicale, reprises, contrôle et relevé au conseil.
- **390 px, tactile émulé :** même trajet vers le second poste médical, avec arrêt/rechargement et relevé final. Les scénarios de quota déjà exécutés en desktop ne sont pas additionnés une seconde fois.
- **320 px, tactile émulé :** reprise déclarée avec le joueur au hangar et l’équipe déjà dans les soins. L’équipe reste à l’arrêt tant que le joueur est dans l’autre salle ; les portes permettent de la rejoindre, puis le joueur termine le contrôle et le relevé au conseil.

Chaque échantillon de position du joueur et des membres est confronté aux empreintes traversables du moteur de l’intérieur. Les coordonnées DOM sont arrondies ; seule cette précision est tolérée à une frontière de collision. Le franchissement vérifie que les deux membres ont réellement atteint la porte, que leurs derniers pas sont confirmés si nécessaire, puis que groupe et docking passent ensemble dans la même écriture.

Une écriture de mouvement valide peut précéder une confirmation médicale refusée. La recette conserve donc **le dernier état durable**, pas un checkpoint plus ancien lu avant ce flush. Une panne de confirmation laisse la phase `escorting` et le solde intact ; le bouton de relecture dégèle réellement les commandes avant une nouvelle validation explicite.

Le guidage entre salles rejoint d’abord le service de la salle, puis peut demander un second guidage vers le groupe trop éloigné. Les boucles de la recette suivent ce guidage visible, sans déplacer directement le joueur. Après le relevé, le groupe reste aux soins pendant le déplacement du joueur, le rechargement et sa visite suivante.

## Fixtures et limites

Les [fixtures déclarées](native-07/fixture-disclosure.json) passent les vrais export/import. L’accueil, les contrats de confinement/triage et les ordres spatiaux qui fournissent `space-recovery` sont préparés par les reducers en dehors du navigateur : leur gameplay n’est pas revendiqué. Le scénario principal ne reçoit aucun état B04 prérempli. La reprise séparée prépare ses positions par le contrôleur natif et le modèle, puis les déclare comme point de départ.

Une troisième fixture vérifie aussi le format portable avec joueur dans son vaisseau personnel amarré et groupe aux soins. **Ce cas hors navire n’est pas un parcours navigateur dans cette recette**. Les registres de compagnons et C-37 absents de ces fixtures ne sont ni ajoutés ni modifiés ; la préservation de registres non triviaux relève des tests de sauvegarde et des suites voisines du lot.

Le retour ne soigne pas gratuitement, ne donne pas de monnaie, ne recrute pas et ne déduit aucune blessure des intégrités spatiales abstraites. Profil, inventaire, opérations et champs de compagnon sont comparés à leur état initial. Ces contrôles ne qualifient ni une campagne entière, ni des débutants, ni un appareil/manette physique, ni la performance sur matériel cible.

Les deux dessins individuels existants sont réellement décodés. Le corps de chaque réponse réseau est vérifié contre l’empreinte originale de `hunter/17.png` et `hunter/11.png`, et l’image affichée doit être sa source native. Le journal indique explicitement `translated-static-source` : aucune animation de marche nouvelle ou validation artistique humaine n’est inventée. Après inspection des images 05, la formation a été déplacée vers deux flancs distincts. La passe 07 attend un écart horizontal d’au moins 70 unités et des positions au-dessus du joueur au poste médical, tous à portée. Les captures natives desktop et mobiles inspectées montrent les deux têtes et silhouettes distinctes à cette étape. Le tri en profondeur conserve des recouvrements naturels ; aucune composition toujours entièrement dégagée n’est certifiée.

## Provenance et essais conservés

Le [reçu de source du lot 07](native-07/implementation-source-receipt.json) rapproche ses quatorze entrées applicatives et de fixture committées à `85ca8099d96fffb37fbe6f46b26a76c8eaf73df1`. Le rapport conserve ce véritable checkout, l’arbre de travail contenant les recettes/proofs non committés et les octets de sa recette. Ce rapprochement d’identité ne prétend pas être une nouvelle exécution. Les reçus 04/05 restent liés à leur ancienne formation dans `cb5c4a47`.

- [01](native-01/browser-verification.json) : attente prématurée de l’ancien état `moving=false` dans la recette ; deux images natives de préparation manquaient également. Le guidage est ensuite attendu à sa vraie destination et les fichiers du main sont matérialisés. Le favicon du document de QA reçoit une réponse vide explicite ; aucune ressource du jeu n’est remplacée.
- [02](native-02/browser-verification.json) : l’assertion exigeait à tort que le checkpoint soit déjà au seuil avant le flush du geste. Le prochain essai observe la confirmation de ces pas puis l’écriture atomique.
- [03](native-03/browser-verification.json) : même distinction nécessaire avant le contrôle médical ; une écriture de marche légitime précède le refus de confirmation.
- [04](native-04/browser-verification.json) : première passe complète réussie ; ses sources et son [reçu d’identité](native-04/implementation-source-receipt.json) restent conservés.
- [05](native-05/browser-verification.json) : passe du launcher aux sorties protégées, avec styles supplémentaires dans les empreintes et preuve React/lint à jour dans le dossier QA parent.
- [06](native-06/browser-verification.json) : la nouvelle formation passe les premiers contrôles, mais le hot reload Vite redémarre le GameClient lors de la génération documentaire parallèle du compagnon HTML. La passe reste en échec. Sa recette est conservée.
- [07](native-07/browser-verification.json) : passe finale de la formation corrigée, avec HMR désactivé et sorties documentaires ignorées par le watcher du serveur de QA. Les sources avant/après restent contrôlées ; aucune commande du jeu, horloge ou sauvegarde n’est remplacée pour éviter ce rechargement propre au serveur de développement.

Les premiers reçus et PNG ne sont ni repeints ni requalifiés en réussites.
