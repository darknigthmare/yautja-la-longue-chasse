# The Pit — livraison V61

Ce lot anime sept décors déjà jouables du classeur : Gotham139, Pine Barrens140, Dead End142, Riverdale144, ruines Primal Hunt146, Mega-City155 et Sinestro156. Chacun reçoit trois feuilles PNG indépendantes de six poses natives, placées dans les plans de profondeur du décor. Les gestes ambiants suivent un tirage déterministe sans répétition immédiate ; pause et réduction des mouvements sont respectées.

Cinq animations supplémentaires répondent au combat : garde de Pine Barrens et patrouille de Dead End après le duel complet, salut du trône Kenner165 après une manche gagnée, cloche du Japon173 après les introductions et le compte à rebours, jugement de l’ancien185 après la manche. Les gestes remplacent leur acteur ambiant quand cela est nécessaire, sans doubler les corps.

Le décor Extinction169 reçoit un Hydra fondé sur les références du jeu. Son acteur arrière est exclu lorsque Hydra est lui-même sélectionné. Les deux autres feuilles de ce décor sont reprises à l’identique de V60 et comptées comme des réutilisations.

**Total runtime : 29 PNG, 174 dessins natifs, 55 366 552 octets.** Ce sont 27 feuilles nouvellement intégrées, dont la cloche préparée auparavant mais inutilisée, et deux réutilisations explicites. Les images ont été produites avec l’outil intégré OpenAI, puis copiées sans retouche de pixels. Prompts exacts, références, limites, empreintes et rectangles sont conservés dans `docs/v61-generation/`. Les PNG utilisés se trouvent dans `public/game/sprites/v61/`.

Les figurants de Riverdale traversent une ouverture masquée au bon plan et restent cachés au repos : aucune pose de course figée. Les pivots des roues, branches, enseignes et mécanismes ont été ajustés aux véritables points d’appui. Un défaut trouvé pendant la QA a aussi été corrigé : le message de victoire, purement informatif, ne bloque plus le bouton MENU.

## Preuves et limites

Les étapes restent distinctes : audit des PNG, rendu isolé et inspection des captures, parcours réels roster → stage → duel, builds, publication puis contrôles du site public. Le bilan final local est dans `docs/v61-final-qa.json`. La preuve de publication est conservée séparément lorsqu’elle est achevée. Les captures de travail et rapports détaillés restent sous `work-local/v61/qa/`.

Le classeur original V54 est inchangé. Le suivi séparé `THE_PIT_STAGES_V61_SUIVI.xlsx` distingue animations intégrées, adaptations et exigences encore ouvertes. **Ce lot ne clôt pas les 174 dossiers / 522 événements.** La fidélité 1:1 n’est pas déclarée lorsque les références ne la démontrent pas.

Restent notamment les quatre variantes narratives Gunnison, Golgotha, station Classic et forêt Badlands, les émetteurs de scénario162/178–180, certaines identités de partenaires et figurants, la faune exacte E147 et les visiteurs E108. La végétation et les mécanismes originaux fournis en alternative ne ferment pas ces demandes. Un seul Judge apparaît à Mega-City ; la patrouille plurielle et le trajet complet du transport restent à faire. L’Ingénieur 162 préparé demeure inactif. Le test d’exclusion Hydra ne certifie pas une plaquette complète de mouvements pour son combattant.

Voir `docs/v61-stage-open-work.md` et le suivi XLSX pour les références et conditions restantes, sans assimilation d’une API préparée à une scène jouable.
