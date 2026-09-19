# V36 — reprise des sources ChatGPT et fondations de la campagne

Cette mise à jour ajoute un **Dossier de campagne**, accessible depuis le menu principal, et les règles de préparation des prochains lots. Elle ne livre pas encore la jeunesse jouable, de nouveaux sprites ou les nouveaux mondes. Le bouton Jouer, les sauvegardes, les récompenses, l’équipement et THE PIT conservent le comportement de la campagne existante.

## Contenu consultable

Le dossier reprend l’ouverture Youngling, les rites, les accès Homeworld et la remise du vaisseau Blooded. Il distingue Adjutant du rang, Elder d’Ancient, et montre les dix réserves proposées ainsi que Xeno Prime/Le Berceau enfoui. Les étapes affichent explicitement « Mission à produire » ou « Non jouable ».

Les **100 fiches humaines armées** corrigées sont reprises du texte accessible de la conversation, avec recherche par identifiant, profil ou arme, insensible aux accents. Aucun portrait de substitution n’a été fabriqué. Les cartes sont focalisables pour le clavier et la navigation manette existante, y compris hors écran. La consultation ne modifie aucune donnée locale.

## Fondations de progression

Le module pur `clanChronicle.ts` sépare les faits de mission, la reconnaissance des rites, le rang et la fonction. Il ne convertit pas l’honneur en rites. Une projection d’une sauvegarde V35 conserve sa reconnaissance historique sans inventer une seule preuve de jeunesse.

Les gardes préparent notamment : KO/carton de la nurserie avant Unblooded ; Quatza-Rij à trois puis pyramide changeante à trois sans énergie avant Blooded ; première reine accessible avant Élite ; nomination Adjutant, quête et installation avant Warp. L’occupant d’un compartiment demande recrutement, affectation et vaisseau réellement disponible, sans présence simultanée en mission et à bord.

Ces fonctions ne sont pas branchées aux récompenses ou à une nouvelle sauvegarde persistante. Les futurs appels d’écriture refusent une version inconnue ou une structure malformée. Les missions nécessaires, les recrutements et le réaménagement physique restent à réaliser.

## Production d’animation Expédition

Le contrat d’import exige corps anatomique entier, équipement séparé, coiffure entière et attaches/occultations par pose. La possession d’un même objet ne peut le représenter dans la main et à la ceinture simultanément. L’animation suit les événements du gameplay ; elle ne déclenche pas une seconde consommation ou guérison.

Un auditeur de fichiers contrôle les empreintes, dimensions réelles et transparence, sans modifier les assets. Son succès ne remplace pas la vérification visuelle des mains, de l’identité, des contacts au sol ou des occultations. Le rendu atomique Expédition historique n’est pas encore remplacé. Les **517 entrées / 50 lots** sont un budget source partiellement récupéré, pas une couverture d’animations.

## Provenance et limites

Neuf conversations récentes ont été rapprochées du dépôt. Trois références visuelles utilisateur ont été récupérées et inspectées ; elles restent privées. Quatre longs messages sont tronqués et les liens des packs générés sont opaques : aucun nouveau ZIP d’images n’est annoncé importé. Les conversations brutes et liens OneNote privés ne sont pas publiés. Voir `chatgpt-reconciliation-v36.md` et `chatgpt-source-manifest-v36.json` pour les décisions et écarts.

Cette livraison concerne le web. **Le ZIP Windows livré reste V35 / 1.0.35** ; aucune nouvelle édition PC n’est annoncée. Les compteurs de gameplay de la V35 restent inchangés : 20 arènes, 14 combattants sélectionnables, 204 clips orientés validés sur neuf chasseurs, aucun moveset complet et aucun véhicule pilotable. Les tests automatisés et le contrôle navigateur ne valent pas certification matérielle ou partie intégrale de campagne.
