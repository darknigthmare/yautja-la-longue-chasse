# THE PIT V92 — premières recettes individuelles des chasseurs importés

Le moteur11 admet deux profils d’équipement pour les nouveaux duels : Ahab et Samurai de **Predator: Hunting Grounds**, masqués ou démasqués dans les quatre apparences exactes déjà fournies. Les199 autres recettes du moteur restent inchangées. Le registre historique des180 chasseurs importés n’est pas réécrit ; pour les nouveaux duels,178 d’entre eux gardent donc leur profil partagé.

Ce lot change les vrais volumes de contact, niveaux de garde, timings, dégâts et vitesses. Il ne renomme pas simplement les attaques. Il n’ajoute ni identité ni personnage. Il ne certifie aucun kit1:1 et ne remplit pas le reste des animations manquantes.

## Recettes consommées

| Profil et action | Préparation/contact/retour, ticks60Hz | Allonge | Comportement |
| --- | --- | --- | --- |
| Ahab — manche | 7/3/13 | 78 | Contact haut court,52 dégâts de base |
| Ahab — estoc | 11/3/20 | 132 | Contact moyen,84 dégâts, préparation/retour plus longs |
| Ahab — balayage bas | 18/4/29 | 116 | Garde basse requise,110 dégâts et mise au sol |
| Ahab — estoc engagé | 16/4/28 | 140 | Volume attaché à la lance,104 dégâts, un seul impact ; aucun projectile |
| Samurai PHG — taille courte | 5/2/10 | 80 | Contact haut,48 dégâts |
| Samurai PHG — taille transversale | 9/3/17 | 104 | Contact moyen,78 dégâts |
| Samurai PHG — taille descendante | 16/3/28 | 94 | Contact haut,118 dégâts et mise au sol |
| Samurai PHG — riposte | 6/8/26 | 82 | Contre physique,88 dégâts ; requiert un vrai hitbox adverse de contact dans sa fenêtre |

La vitesse au sol est3,45 pour Ahab et4,15 pour Samurai PHG. Les valeurs sont des choix de balance de THE PIT. La riposte ne touche pas une cible inactive ou hors de portée ; l’estoc d’Ahab peut toucher une cible inactive. Les contacts d’équipement disparaissent à l’interruption du propriétaire et après leur fenêtre ; ils ne deviennent pas des armes autonomes. Les whiffs gardent leur retour complet, et les ressources communes restent inchangées.

`getPitCombatFighterDefinition(fighter)` résout la recette détenue par l’état. Les calculs de durée, phases, hitboxes, effets, dégâts, lecture d’entraînement, adaptateurs d’animation et annonces l’utilisent. La sélection présente les quatre actions et leurs chiffres, la référence d’équipement et les limites. L’IA peut contester l’espace à l’allonge de sa lance. Le feedback dessiné des techniques est un repère de contact, pas une arme synthétique ou une onde magique.

Le laboratoire de production passe l’apparence exacte à `createPitLabFrame` et `getPitLabFrameTicks`. Ses poses et leur durée suivent donc la même recette courante que le combat : par exemple, deux dessins de préparation de même poids reçoivent 6 puis 5 ticks pour l’estoc moyen d’Ahab. Les anciennes API appelées sans apparence gardent la recette historique et ses 4 puis 4 ticks ; aucun ancien inspecteur ne change silencieusement de recette.

## Autorité et limites visuelles

La [fiche NECA Ultimate Ahab](https://store.necaonline.com/blogs/news/shipping-this-week-ultimate-ahab-ultimate-dream-sequence-jason-and-chucky-thanos-groot-head-knockers-1) établit la lance, le gantelet et l’Engineer Gun de la présentation sous licence. Ce lot se limite à la lance et n’en déduit aucun tir d’Engineer Gun, pouvoir ou choreography source. Les deux illustrations Ahab existantes ont été inspectées ; elles portent bien cette lance.

Le [développeur IllFonic sur PlayStation](https://blog.fr.playstation.com/2020/06/30/le-predator-samourai-rejoint-predator-hunting-grounds/) associe Samurai PHG au Predator Katana. Les deux illustrations fournies portent un katana. Ce personnage reste distinct d’Oni ; aucune technique de ce dernier n’est transférée.

Les sources établissent l’équipement, **pas les valeurs ci-dessus, noms de coups, trajectoires, contre ou frame data**. Les quatre costumes fournis ne sont pas certifiés1:1. L’admission des clips natifs reste un chantier séparé ; les actions non couvertes conservent le repli visuel signalé. Une feuille de deux dessins n’est pas un cycle complet.

Variantes : `ahab-avec-casque-0c8ceb1c95`, `ahab-sans-casque-91544a7fb2`, `samurai-avec-casque-d75f93b15e`, `samurai-sans-casque-fe1ba25104`. Les variantes d’un autre propriétaire, les incarnations Oni et les nouveaux costumes inconnus ne reçoivent pas ces profils par rapprochement du nom.

## Conservation des parties et replays

Le champ facultatif `movesetId` ne paraît que dans les nouveaux états des quatre costumes admis. Un snapshot sans marqueur garde sa recette ancienne, même pendant une action active, au tour suivant et après reset d’entraînement. Une revanche explicite constitue un nouveau duel et reçoit le profil courant. Les marqueurs d’un propriétaire/costume étranger ou d’un snapshot antérieur à moteur11 sont rejetés.

L’encodage de replay reste3. Le moteur10 reste accepté avec son stepper et son checksum historique. `createPitReplayCombatState` est partagé par la validation et la relecture visible ; les archives antérieures ne peuvent pas recevoir les nouvelles recettes via le constructeur actuel. Les captures moteurs4 à9 n’ont pas été modifiées.

Deux nouvelles preuves sont calculées depuis les blobs **inchangés du commit V91 `1bee8ac`**, fournis en lecture seule : un replay Ahab/Samurai moteur10, checksum`c4308786`, et un checkpoint Ahab à frame9, déjà actif avec l’ancienne préparation8. Leur résultat complet est comparé à la nouvelle reprise ; seul le numéro du conteneur d’état avance. Les SHA des sources sont inscrits dans chaque fixture. Elles ne sont pas calculées à partir du nouveau stepper de compatibilité.

## Validation bornée

Les tests `pit-authored-movesets-v92.test.mjs` et `pit-authored-movesets-ui-v92.test.mjs` couvrent les recettes réellement consommées, contacts à distance, gardes, contre, whiffs, interruptions, marqueurs, états actifs, tours, reset, replays et leurs anciennes preuves, adaptateur de phases, UI React et IA. SSR n’est pas un test visuel ou une validation de PNG. Aucune QA navigateur ni compilation globale n’est revendiquée par ce lot.

À la clôture du lot, les **19 nouveaux tests passent sans échec ni saut**, ainsi que les **42 tests inchangés** ciblant laboratoire, notices de fidélité, entraînement, stockage des replays et animations natives V91. Le lint de tous les fichiers possédés passe sans avertissement. Les journaux sont `work-local/v92/pit/authored-final.log`, `unchanged-consumers-final.log` et `lint-final.log` ; ces contrôles restent distincts des vérifications générales effectuées par l’agent principal.

Les tests historiques restent intacts. Dans une première régression ciblée de89 tests,84 passent et5 échouent : quatre assertions de version du moteur courant attendent encore10 ; un test construit à partir du vieux `PIT_FIGHTERS` une action sur un nouvel état Ahab/Samurai, donc une phase incompatible correctement refusée. Ces échecs ne sont pas dissimulés en modifiant leurs assertions ou en admettant une phase invalide. Le journal borné se trouve dans `work-local/v92/pit/regression.log`, hors production.

Les mouvements encore manquants de178 profils partagés, les chroniques, finishers et familles d’animation complètes restent ouverts. L’[audit V91](pit-fidelity-v91.md) conserve sa valeur historique et son inventaire ; l’interface identifie explicitement cette date pour ne pas confondre ce baseline avec les deux recettes actuelles.
