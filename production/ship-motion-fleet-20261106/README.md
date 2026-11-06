# v1.5.3 — perspectives de la flotte cinématique

## Objectif et périmètre

Ce lot étend les changements de vue de la cinématique d’arrivée aux six coques non classiques déjà exercées par la qualification spatiale. Le profil V14 de chaque coque reste la référence de son identité et de ses points de largage/atterrissage existants.

| Coque | Vues supplémentaires | Méthodes |
|---|---:|---|
| Wolf | 8 | Pod et vaisseau |
| Scout AVP:R | 8 | Pod et vaisseau |
| Vaisseau mère AVP | 6 | Pod |
| Feral | 8 | Pod et vaisseau |
| Fugitive | 8 | Pod et vaisseau |
| Upgrade | 8 | Pod et vaisseau |
| **Total du lot** | **46** | |

Les huit perspectives classiques et leurs deux effets moteurs préexistants restent distincts. Le vaisseau mère n’a pas de paire ventrale dans ce lot : son parcours consommateur est l’insertion en pod. Les autres coques du catalogue conservent leurs profils existants.

Les fichiers de production attendus sont un PNG source et un WebP sans perte par vue. Le manifeste du lot donne les chemins et empreintes de chaque paire. Les vues ont été générées individuellement depuis les deux références V14 de leur propre coque ; les prompts et tentatives sont conservés dans les manifestes de génération. Les sélections rejetées y restent identifiées.

## Images et fidélité

Les maîtres existants sont des références générées du projet. Ils ne constituent pas, à eux seuls, un modèle 3D canonique. Les vues nouvelles conservent les silhouettes et éléments distinctifs inspectés, mais reconstruisent des faces cachées et réinterprètent certains panneaux, reflets et petits points lumineux. Les angles de 12°/25° sont des intentions de caméra ; ils ne sont pas des mesures d’un objet 3D rigide.

Les revues séparent l’inspection artistique des sources, l’acceptation du raccord technique et la qualification native. Aucune approbation artistique humaine ou fidélité canonique absolue 1:1 n’est attribuée automatiquement. Le statut `inspected-source-art` porte sur les repères inspectés ; il ne remplace pas une validation humaine.

Les PNG restent dans leur canevas natif 1536×1024, sans redimensionnement, recadrage, ajout de marge, recoloration ou normalisation d’alpha. L’export WebP est sans perte et chaque paire est comparée après décodage : dimensions, alpha et RGBA complets doivent être identiques. Les faibles résidus d’alpha des originaux restent documentés. Les RGB masqués sous alpha nul ne sont pas assimilés à un fond opaque.

## Raccord des perspectives

La table `planetArrivalShipMotionCalibrations.ts` référence uniquement des familles complètes et inspectées. Chaque vue conserve ses propres dimensions, nez, arrière et pivot. Les quatre repères historiques du profil sont transportés ensemble par une similitude de l’axe visuel mesuré. Le point de release dérivé n’est pas une nouvelle soute découverte dans les images.

Les canevas des profils V14 ont des proportions différentes de ceux des variantes. Le rendu annule d’abord l’étirement implicite du canevas CSS, puis applique une rotation et une échelle uniformes. Cette compensation porte sur les deux axes du pixel source, pas seulement sur les extrémités de la coque. Les contours, éclairages, réfractions et liserés utilisent la même registration.

Pour le liseré SVG, `preserveAspectRatio="none"` est appliqué uniquement lorsqu’une vue non posée a besoin de cette compensation. Le contrôle natif mesure la matrice réelle de l’image SVG et vérifie ses deux axes ainsi que son alignement avec les ancres peintes. Wolf, Feral, Fugitive et Upgrade doivent présenter un vrai fondu cloqué entre canevas différents ; une photographie de pose tenue ne suffit pas à valider ce raccord.

Les périodes de largage actif, de contact, de sortie et le vaisseau garé conservent le profil historique. Le calendrier de la cinématique, les sauvegardes, la formation et les coûts d’insertion ne sont pas redéfinis par ce lot. Les modes à mouvement réduit et les méthodes non prises en charge gardent aussi le profil sélectionné.

Les perspectives sont des ressources facultatives. Si un seul fichier d’une famille échoue au chargement, toute cette famille revient au profil de la même coque ; le rendu n’emprunte pas une vue d’un autre vaisseau.

## Moteurs

Aucun nouvel effet moteur séparé n’est autorisé pour ces six coques. Leurs marqueurs de registration restent invisibles et non approuvés comme buses d’émission. Les lumières et petits jets déjà peints dans les références, notamment ceux de Fugitive, restent intégrés aux pixels du sprite. Ils ne sont pas comptés comme de nouveaux systèmes VFX.

## Vérification

Les tests de source vérifient le périmètre exact de six familles et 46 vues, les dimensions réelles des WebP, l’identité des coques, le maintien des profils aux moments protégés, le repli d’une famille incomplète et l’isotropie de la transformation.

La recette Motion conserve les scénarios classiques et ajoute une lecture native de chaque famille sur ordinateur et mobile. Chaque perspective doit être décodée, effectivement peinte et photographiée pendant sa pose tenue. Le rapport sépare les 46 sources observées par viewport des transitions intermédiaires réellement échantillonnées. Une liste attendue ou un simple préchargement ne vaut pas preuve d’affichage.

La recette Spatial conserve son horloge native, ses fenêtres temporelles, les captures X11, les nonces et les comparaisons strictes de pixels. Son contrôle des coques supplémentaires exige le carrier sélectionné et ses couches décodées exactes. Le milieu de la séquence peut légitimement afficher le profil ; la couverture exhaustive des perspectives relève de Motion.

Les résultats CI doivent appartenir au commit exact soumis. Les manifestes et revues de ce dossier décrivent les sources et leur acceptation pour intégration ; les résultats natifs finaux et leurs limites sont consignés dans la PR associée. Une réussite de compilation ne vaut pas qualification artistique, campagne complète ou déploiement.

## Provenance

- `manifest.json` : inventaire des 46 paires, dimensions et empreintes.
- `art/references-manifest.json` : références V14 exactes et provenance.
- `art/*generation*.json` : prompts, références, tentatives, sélections et rejets.
- `art/*calibration.json` et `art/*review.md` : observations et repères proposés.
- `art/*export-review.json` : comparaison des PNG source et WebP décodés.
- `art/root-integration-approval.json` : périmètre précis de l’acceptation technique.
- `art/framework-validation.json` et `art/svg-registration-*.json` : vérifications de source et revue du raccord SVG avant qualification native.
- `art/fleet-binary-audit.json` et `art/fleet-binary-audit.md` : audit indépendant des 92 fichiers et de l’égalité RGBA intégrale.

Les PNG sources sont dans `art/sources/<ship-id>/<view>.png`. Les images utilisées par le jeu sont dans `public/game/planet-arrival/ship-motion-fleet-v1/<ship-id>/<view>.webp`.

