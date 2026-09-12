# Reprise des discussions — V30

Ce lot poursuit les manques identifiés après V29. Il s’appuie sur les textes complets des quatre partages déjà récupérés, sans republier les conversations brutes ni considérer leurs pièces jointes sandbox comme lues.

## Demandes traitées

| Source | Ajout V30 | Limite conservée |
| --- | --- | --- |
| [Créer un hub Homeworld Predator](https://chatgpt.com/share/6a9f6ce6-2548-83eb-a8ee-152b84e89fe5) : Désert de Verre, plaques vitrifiées, fouisseur sensible aux vibrations, rochers et leurres ; enquête sur les proies détournées | Deuxième expédition physique accessible après le rapport durable des Marches : lecture du terrain, deux traversées, site abandonné, balise, secret, passage de retour et rapport persistant. | Enquête locale adaptée au fil narratif ; ce n’est pas l’acte II complet. Huit régions et les cinq actes complets restent à produire. |
| [Audit état du jeu](https://chatgpt.com/share/6a9f6d0f-4f4c-83eb-b254-067d9d8bbfaf) : combat et entraînement, dont la déchoppe encore indiquée absente dans V29 | Saisie et déchoppe déterministes dans THE PIT ; exercice avec trois réussites, au clavier ou avec les commandes manette/tactiles existantes. | Les corps PNG restent des poses fixes provisoires. Ce lot n’ajoute pas de bibliothèque dessinée de prises ni de victimes synchronisées. |
| Même audit, export léger et sauvegarde intégrale | Deux formats disponibles ; l’archive intégrale ajoute toutes les familles de données persistantes existantes et vérifie le vrai décodeur du checkpoint avant remplacement. | Pas de cloud, de profils multiples ou de sauvegarde automatique de la position instantanée dans la cité. Une expédition sans rapport n’est pas un checkpoint persistant. |

Les sons de production, la poursuite physique des Enforcers, les autres régions, les cinq illustrations de combattants absentes et les animations complètes demeurent ouverts. Le détail général reste dans [le rapprochement des 29 domaines](chatgpt-audit-status-2026-09-08.md), à lire avec les livraisons V29 et V30 qui remplacent ses constats datés.

## Désert de Verre

Le terrain de 3 600 × 1 120 pixels distingue la roche stable des plaques transmettant les vibrations. Un déplacement prudent limite le bruit ; courir ou retomber sur le verre attire le fouisseur, qui annonce sa remontée. Les corniches constituent un itinéraire supérieur ; le leurre offre une autre traversée et doit réellement détourner une attaque pour valider cette méthode.

Le relais donne un point de retour local. Le site de transit et la balise apportent des éléments sur une route non déclarée. Préserver ou désactiver cette balise est un choix de dossier ; la première décision validée ne se réécrit pas gratuitement à la revisite. Le secret peut être découvert ensuite et la meilleure durée du rapport est conservée. Aucune pièce de convoi ni composant observé n’est ajouté comme trophée personnel.

Les décors sont assemblés en couches à partir d’images existantes, dont les plateformes de roche/verre et la créature fouisseuse de la banque du jeu. Ce réemploi ne constitue pas la production d’un nouvel Apex canonique. Le panorama et les proportions sont contrôlés séparément du moteur.

La cité reste montée mais suspendue pendant la sortie. Le rapport n’est acquis qu’après validation et confirmation d’écriture ; un refus garde la navette et la preuve disponibles pour un nouvel essai. La migration V7 conserve les Marches et initialise seulement le Désert absent. Revisiter les Marches ne supprime pas le rapport du Désert.

## THE PIT

La commande Projection sert aussi à défaire une saisie. Il faut un nouvel appui pendant une fenêtre de huit ticks (environ 133 ms à 60 Hz). Maintenir le bouton avant la saisie ne réussit pas automatiquement. L’exercice, le gel et l’avance d’un tick utilisent le même moteur que les duels.

Le moteur courant passe à la version 5. Le format de replay reste V3 ; les replays du moteur 4 utilisent le comportement historique sans nouvelle fenêtre de déchoppe et gardent leur ancien calcul d’empreinte. Les anciennes entrées ne sont donc pas réinterprétées silencieusement avec les nouvelles règles.

Le laboratoire mobile et les commandes tactiles occupent des lignes distinctes. Les images propres aux neuf combattants disponibles et l’orientation de la carte adverse de V29 sont conservées.

## Archives intégrales

L’export léger reste disponible, notamment pour sauver la campagne en mémoire quand le stockage refuse de confirmer une écriture. L’export intégral exige une campagne durable correspondant à la session et lit uniquement les clés connues :

- campagne : options et commandes, inventaire, apparence, codex, trophées, exploration, Homeworld et Justice ;
- chasse suspendue : configuration, état de reprise et checkpoint ;
- vaisseau : flotte, équipement mémorisé, présentoirs, atelier, entraînement et infirmerie ;
- THE PIT : progression, paramètres et parcours ;
- dernier replay THE PIT.

Aucune énumération de données étrangères, clé secrète, télémétrie, image, cache ou conversation n’est copiée. Les annexes liées à un autre propriétaire ne deviennent pas des gains du profil exporté. Les anciennes données de vaisseau V1/V2 reconnues sont normalisées sans écriture pendant l’export ; un format V3 corrompu est refusé avant normalisation.

L’import se fait au titre, après une prévisualisation du contenu et une confirmation du remplacement. Les fichiers invalides, futurs, trop volumineux ou aux propriétaires incompatibles n’écrivent rien. Le checkpoint est contrôlé par le décodeur réellement utilisé en chasse. Les valeurs locales capturées lors de la prévisualisation doivent encore correspondre au moment du clic.

L’import utilise le verrou navigateur, un journal borné avec les valeurs avant/après, puis écrit la campagne en dernier. Le marqueur durable « committed » est distinct des octets de campagne : réimporter la même campagne avec d’autres annexes ne suffit pas à conclure que l’opération est terminée. Une interruption avant ce marqueur entraîne une restauration conditionnelle ; une opération confirmée est finalisée. Des octets divergents d’une autre session sont conservés et provoquent un blocage explicite.

Tous les writers ordinaires coopèrent avec ce journal. Un autre onglet V30 ayant reçu l’événement de transfert doit recharger ses données avant de réécrire. Une lecture incertaine après la suppression du journal est réconciliée ; à défaut, le jeu reste dans l’écran de récupération. Les anciens clients ne connaissant pas cette garde et le stockage navigateur multiclés n’offrent pas une transaction globale comparable à une base de données : fermer les autres fenêtres du jeu reste demandé avant import.

L’écran de récupération propose un nouvel essai et l’export local du journal de secours. Celui-ci contient des données de jeu privées avant/après transfert ; il n’est jamais téléversé automatiquement. Les contrôles de confirmation, Échap et la navigation de récupération respectent l’état occupé.

## Qualification

Les preuves de tests, de parcours navigateur, de version PC et de publication sont ajoutées ici après leur exécution. La présence du code ou de ce document ne vaut pas validation du portable ni du site public.

Les tests ne certifient pas une manette physique, la cadence matérielle, les performances de longue session, les droits de commercialisation, une campagne complète ou des animations dessinées terminées.
