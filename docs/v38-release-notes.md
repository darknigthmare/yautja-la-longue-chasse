# V38 — finitions jouables prioritaires

## Livré

- **Distinctions THE PIT au vaisseau** : la station Mur des trophées consulte les 18 distinctions existantes (12 palettes Arcade, cinq chapitres Circuit, une Bannière de la Descente). Filtre des acquis, conditions et meilleurs parcours réels, couleurs des palettes, retour direct au PIT. Consultation sans écriture ni octroi. Les archives absentes, corrompues, futures ou appartenant à un autre profil sont distinguées ; les changements d’un autre onglet sont observés.
- **Entraînement** : l’Anti-air n’est plus proposé comme réalisable à Tracker et Greyback, qui n’ont pas la frappe nécessaire. La raison est visible et la préparation rejette cette combinaison. Les autres capacités restent inchangées. Reprendre la simulation rend le focus au combat et purge les anciennes entrées, sans conserver une garde ou une touche bloquée.
- **City Hunter** : garde haute gauche dessinée indépendamment avec OpenAI, deux poses natives et transparence conservée. Le premier essai portait les lames sur le mauvais bras ; une correction et une revue croisée avec V32 ont précédé l’intégration. La garde haute dispose désormais de ses deux orientations dessinées.
- **Berserker** : huit dessins V33 existants sont qualifiés pour deux réactions debout aux coups reçus. Les rectangles irréguliers corrigent les coupes produites par la grille présumée ; aucun PNG n’est modifié et aucune nouvelle génération n’est comptée pour Berserker.
- **Homeworld** : les onze accessoires décoratifs sont ancrés sur le centre et le bas de leur silhouette peinte. Les marges transparentes ne font plus flotter le gantry. Images entières, proportions, collisions, disposition, profondeur et occultation sont préservées.

## Limites conservées

La consultation des distinctions ne produit pas les masques, bannières, alcôves physiques ou poses narratives encore absents. Les couleurs d’une palette ne recolorent pas les costumes PNG. Les trois clips supplémentaires ne constituent pas un moveset complet : 208 clips orientés sont validés sur neuf chasseurs, avec zéro moveset complet déclaré. Les 20 arènes jouables restent distinctes de l’objectif de 100.

Le prologue Nurserie et le Berceau ne sont pas promus comme nouveaux niveaux jouables. Leurs dépendances de scènes, sauvegardes et art final restent ouvertes. L’accès privé ChatGPT demeure différé au choix du propriétaire. Aucun téléchargement privé ni nouvelle lecture exhaustive du projet n’est revendiqué.

La version portable PC reste V35. Les essais matériels manette/Steam Deck et la certification d’une commercialisation ne font pas partie de cette validation navigateur.

## Compilation et preuves

Les builds locaux ont rencontré ENOSPC sur C:. Seules les sorties régénérables ont été nettoyées. Vinext a ensuite compilé avec un dossier de sortie pré-nettoyé sur D: et l’option explicite `YAUTJA_KEEP_BUILD_ROOT=1` ; les builds ordinaires conservent le nettoyage par défaut. Aucun contenu source, ZIP utilisateur ou archive PC n’a été supprimé.

La compilation Next locale sur une jonction a rencontré un invariant de contexte de rendu. Ce build n’est pas présenté comme réussi. Les vérifications locales finales utilisent le serveur de production Vinext compilé, la suite complète de 1 275 tests, TypeScript et ESLint (un avertissement antérieur de miniature native). La compilation Next de production et le site public sont contrôlés séparément dans la preuve de livraison.
