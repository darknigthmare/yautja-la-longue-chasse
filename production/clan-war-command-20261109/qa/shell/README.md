# Conseil de guerre — composition et navigation

Le [reçu de la tentative finale](attempt-6/final-receipt.json) atteste **25
contrôles navigateur**, dix PNG originaux ouverts et 56 régressions existantes
exécutées directement avec Node 22. Les 19 contrôles Operations et 13 contrôles
de retour manette ont leurs propres reçus dans les dossiers voisins ; ils ne
sont pas des nouveaux tests unitaires à additionner à une suite globale.

La coque est celle des vrais composants : carte prioritaire, trois échelles
principales, quatre domaines du conseil et quatorze outils conservés. Les
planètes, options de carte, renseignements, ordres, renforts, soins, journaux et
anciennes doctrines disposent d'entrées distinctes. Les dialogues natifs
confinent le focus et ferment leur couche avant le retour à l'écran précédent.

Les interactions incluent un vrai territoire SVG au clavier, le retour de focus
sur ce territoire, le changement de monde, les deux projections, une pause du
propriétaire de la fixture, les écrans de 390 et 320 pixels, puis le canyon
réellement préparé et avancé d'une seconde. Les composants utilisent les images
publiques originales. Les règles, archives et résultats ne sont pas simulés par
le pilote. Le profil et les commandes de suspension proviennent de la fixture
existante `tests/browser/clan-war-v94.fixture.tsx`, explicitement distincte du
GameClient complet.

`compactCommand` est une propriété de présentation d'Atlas/Gauntlet, inactive
par défaut pour leurs autres consommateurs. Les coordonnées SVG, la matière
dans le `foreignObject`, le graphe territorial et les sessions restent ceux du
jeu. Les couches ouvertes sont de l'état React temporaire ; elles ne sont pas
ajoutées aux sauvegardes. Le nouveau protocole V115 isolé, son adoption, ses
intentions et ses protections restent inchangés.

Les PNG [avant](../before-native/attempt-2/) ont été capturés dans le véritable
ancien build Next `lSBcQd-2LuUCPafGoIZvC`, après le trajet physique du vaisseau au
conseil. Ils montrent notamment un atlas commençant à 2 082 pixels sous le haut
du viewport. La fixture finale observe son globe entre les pixels 357 et 777
sur desktop. **Les hôtes diffèrent** : ce sont des observations de composition,
sans pourcentage strict de gain, comparaison pixel à pixel ou mesure de
performance commune. Une recette Next séparée,
`scripts/qa-clan-war-command-next-20261109.mjs`, est préparée pour le build
intégré ; son exécution doit être attestée dans son propre dossier.

La recette CI maintenue `qa-clan-war-browser-v94.mjs` suit désormais
**Archives → Canyon** par de vrais clics. Son délai de six secondes, ses
assertions de stockage et son exigence de focus headed n'ont pas été relâchés.
Le [rejeu local headless](v94-headless-1/receipt.json) obtient huit réussites et
un échec explicite exigeant Chrome headed. Xvfb est absent de cet executor ;
ce résultat n'est pas déclaré vert. Le parcours headed reste à vérifier dans
la CI prévue pour lui.

Les tentatives antérieures restent datées : la première a révélé le globe
encore trop bas ; la troisième s'est arrêtée sur un sélecteur de test ambigu
entre viewport et canevas ; les autres ont guidé le placement mobile et la
correction d'un chevauchement de stocks. Aucun de leurs rapports bruts n'est
requalifié comme résultat final.

Aucune nouvelle image, fidélité artistique « AAA », certification canonique,
manette physique, campagne intégrale ou fermeture globale des P0/P1 n'est
déduite de ces contrôles.
