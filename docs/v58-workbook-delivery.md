# V58 — équipement, apparence et cohérence du lore

Source : classeur utilisateur V54, inchangé, SHA256 `32f2ee8e4fd801e7ca677a54862f2bd0123a2e78d12c015f64b50ab28184c380`. Ce lot poursuit ses priorités sans déclarer ses 205 dossiers achevés.

## Changements

- **Falconer** : le repère cyan est remplacé par deux PNG OpenAI transparents, un par orientation. Le corps mécanique, les optiques rouges, les ailes rigides et les ouvertures suivent les photographies officielles NECA. Le même appareil sert à reconnaître puis revenir ; aucun canon ajouté, aucun dégât. Les deux images sont préchargées ; l'échec d'une vue suspend le combat et propose un nouvel essai. Ce sont deux poses tenues, pas un cycle animé complet ni une géométrie de prop certifiée 1:1.
- **Feral** : la technique active lance trois carreaux physiques vers une acquisition fixée au lancement, sans poursuite automatique continue, plasma ni immobilisation magique. Les variantes explicitement sans masque tirent droit. Les gardes, les sauts d'esquive, la sortie d'arène et le nettoyage entre manches utilisent les vraies entités de combat. Les anciens replays V8 conservent leur piège historique et leur checksum ; les nouveaux enregistrements utilisent V9.
- **Greyback** : l'épreuve de clan alternative impose les anneaux d'impact dorés et décrit une issue sans mort, même en défaite ou égalité. Elle ne modifie pas le réglage de violence du joueur. Aucun nouveau système de mortalité, désarmement, finisher ni remise d'objet n'est revendiqué.

## Références et limites

Le [Falconer officiel Hot Toys](https://www.hottoys.jp/item/view/100001625) confirme l'appareil de reconnaissance et la lame unique du poignet droit. Les vues [NECA de Falconer](https://store.necaonline.com/blogs/news/closer-look-predators-series-7-camo-cloaked-falconer-predator-action-figure) guident le dessin du capteur ; les mécanismes d'articulation d'une figurine ne sont pas traités comme des capacités supplémentaires du film.

Les [notes de production officielles de Prey](https://lumiere-a.akamaihd.net/v1/documents/prey_final_production_notes_bios_59_82be4e25.pdf), page 4, distinguent les carreaux à visée laser des autres dispositifs. Le classeur `05_MOVES_PROPOSES!P10` demande les trois carreaux vers un point acquis ; sa cellule S10 traite la mine séparément. Le [catalogue NECA de Feral](https://store.necaonline.com/products/prey-7-action-figure-ultimate-feral-predator) confirme aussi le lanceur, les lances et le bouclier. Les timings, dégâts et règles de garde sont une adaptation The Pit.

**Limite visuelle Feral :** les projectiles sont encore des traits métalliques orientés sur leur vitesse, sans halo de plasma. Le lanceur animé et le dessin détaillé du carreau ne sont pas livrés. Le clip de charge lourde et la transition lance/rangement de City Hunter restent à reprendre ; renommer un coup ne corrigerait pas les dessins manquants. Les photographies de références restent dans le dossier ignoré `work-local`, jamais dans les ressources publiées.

Les PNG finaux sont `public/game/sprites/v58/pit/falconer/drone-flight-right.png` et `drone-flight-left.png`. Les prompts exacts, le mode OpenAI intégré et les sources sont conservés dans `v58-image-generation.json`. Chaque fichier garde ses octets générés et son alpha natif ; aucune retouche par script. Les dimensions, limites alpha, pivots et SHA256 sont dans `app/game/data/pitFalconerDroneArtV58.json`.

Le récit de Greyback reste explicitement une branche proposée pour le jeu, pas une scène ajoutée à Predator 2. Voir `v58-nonlethal-clan-trial.md` pour les cellules du classeur.

## Qualification

La première recette a découvert un vrai défaut d'impact : l'interface ne regardait que le dernier événement du tick, généralement un gain de Traque placé après le coup. Les anneaux de contact pouvaient donc être absents. `getPitImpactFeedback` sélectionne désormais le dernier coup ou blocage indépendamment des gains ; trois tests rejouent de vrais tirs, parades et ticks de ressources seuls. Les premières recettes échouées sont conservées, elles ne sont pas comptées comme réussites.

La première suite globale passe 1 849 / 1 849 tests. Après le correctif d'impact, le candidat figé passe **1 852 / 1 852 tests**, sans échec ni test ignoré (`work-local/v58/tests-full-final.log`). ESLint confirme zéro erreur et les trois avertissements préexistants des catalogues de clan et de compagnons. Vinext et Next.js compilent ; le contrôle TypeScript de la publication réussit. Une revue différentielle compare aussi 14 400 états sérialisés au moteur V57 publié : le stepper historique V8 est identique, seule la version de schéma est normalisée pour la comparaison.

Les noms d'événements des replays Feral anciens restent marqués comme historiques. Le nouveau lance-carreaux n'est pas annoncé à la place d'un ancien piège enregistré. La compilation, les recettes navigateur et la publication sont des preuves distinctes ; leur état final sera consigné ci-dessous.

Le candidat Vinext final passe huit duels Feral (costume masqué principal et trois variantes démasquées, chacun des deux côtés) ainsi que quatre duels narratifs vérifiant les deux préférences de violence et une vraie défaite Greyback. Les tests emploient les commandes visibles et un observateur passif, sans injecter santé, phase ni résultat de combat. Les sauvegardes et réglages restent inchangés. Le candidat Next final passe également quatre duels Falconer, avec mouvement réduit, pause et panne HTTP503 contrôlée puis reprise du même dispositif. Les deux PNG servis sont identiques aux SHA validés.

Les huit duels Feral et les quatre cas narratifs passent aussi sur Next final, sans erreur JavaScript, console ni chargement inattendu. La version V58 est vérifiée dans l'interface. Les captures de vol, retour, tirs des deux côtés, préférences de violence et conclusion Greyback sont inspectées. Rapports : `work-local/v58/qa/feral-next-final`, `nonlethal-next-final`, `falconer-next-publish-candidate` et `served-assets-next-final.json`. Il s'agit de recettes ciblées de ce lot, pas d'une certification de tous les systèmes du jeu ni d'essais sur console ou matériel mobile réel.

## Publication

Candidat local validé ; envoi Git et contrôle de la publication publique en cours. Aucun déploiement V58 public n'est encore déclaré par cette version du document.

Les campagnes en huit étapes, les 18 familles d'actions pour tous les combattants, les séquences narratives dédiées, les dispositifs et les événements de scène non cités restent ouverts. Homeworld, le prologue et le mausolée DLC ne sont pas déclarés achevés par ce lot. Aucun nouvel exécutable Windows n'est produit ici.
