# QA V79 sur Next compilé — 3 octobre 2026

Nouvelle recette sur `http://localhost:4202`, serveur Next production fourni par root après compilation webpack. Les anciennes preuves du composant4199 et de Next dev4201 restent séparées. Les 31 nouvelles images des trois lots ci-dessous ont réellement été ouvertes avec `view_image` ; elles montrent les octets servis sur4202, sans HMR ni outil Next dev. Ce rapport ne vaut pas publication Vercel ni vérification du futur alias public.

| Rapport brut, sous `work-local/v79/qa/` | Résultat réel |
| --- | --- |
| `chronicles-gameclient-next-production-local/report.json` | 7 contrôles /19 captures : nouvelle partie par UI, slot1, contexte de nurserie et bouton prêt, pont natif images décodées, roster, vraie chronique Greyback, intro des deux combattants/countdown3/2/1, pause, deux pertes de manches contre le CPU, résultat enregistré une seule fois, sortie explicite vers le récit, rechargement complet, entrée et lecture Theta mobile. |
| `reference-hunters-next-production-local/report.json` | 5 captures : les deux nouvelles identités choisies dans le roster, portraits décodés, case unique compacte, stage natif, vraie intro et début de combat. Quatre assets pose/icône servisHTTP200 avec SHA identiques au manifeste. Sauvegardes inchangées. |
| `homeworld-native-props-next-production-local/report.json` | 7 captures : étal, forge, archive, soutènement, table, citerne et chariot du port, acteur adjacent, source alpha/dimensions uniformes, sept actifsHTTP200/SHA exacts, aucun chargement DOM manquant. Pavage des anciens raccords et absence du toast du pont. |

Le reçu `work-local/v79/qa/v79-next-production-local-visual-review.json` fixe les empreintes des trois rapports et de leurs31captures, leurs sources historiques quand présentes et la date réelle de fin de relecture/vérification. Aucun ancien rapport ni screenshot n'a été modifié. Les sources GameClient/chronique et Homeworld sont identiques avant/après leurs runs respectifs.

## Toast et raccords

La QA montre d'abord le vrai message `Sas de chasse à portée. E/X pour utiliser.` dans le pont, puis clique le bouton public de passage vers le monde natal. Au premier montage du Homeworld, aucun toast Sas ne reste. Les contrôles ont lieu respectivement678,549,703,540,673,687 et745ms après le clic : tous avant l'ancien délai d'expiration de2600ms. Il ne s'agit donc pas d'une attente de disparition automatique.

Les nouveaux PNG03archive et06citerne montrent du pavage natif à la place des aplats beiges historiques. Les autres secteurs sont également relus. Aucune nouvelle illustration d'escalier/palier ni modification de la largeur/collision n'est revendiquée. La façade translucide devant l'archive reste visible et masque partiellement le pied de l'étagère ; cette réserve artistique demeure.

Les positions sont les mêmes sept checkpoints d'observation validés et déclarés dans le rapport de développement : coordonnées préparées avant ouverture de sept contextes isolés, jamais déplacées dans l'état du jeu en cours. Elles prouvent ces vues, pas une marche depuis le spawn, une mission gagnée ou une accessibilité acquise en jouant. Six modules retenus ne sont pas montés.

## Lecture visuelle du jeu compilé

L'ouverture présente le jeune et le cadre du clan avec une consigne lisible. Le bouton narratif est prêt sur cette nouvelle capture03. Cela vérifie l'entrée réelle dans le prologue, sans revendiquer sa fin. Le pont desktop04 est cette fois peint : murs, plateformes, échelle, console, chasseur et appuis sont visibles, contrairement à l'ancien PNGdev pris trop tôt.

La chronique Greyback garde le portrait entier, le décor et le texte lisibles. Les captures08/09/10 montrent les entrées et le compte à rebours ; les12/13 montrent les résultats authentiques, avec Greyback agenouillé et Boar debout sur le plan du sol. Les14/15 montrent le récit de défaite et sa reprise. Theta mobile18/19 tient dans la largeur de390px, avec ses boutons et son corps entier. Le récit peut dépasser une hauteur d'écran et défile ; aucun combat n'est monté derrière ces pages.

Les deux chasseurs ajoutés se regardent dans le roster/duel ; leurs pieds s'appuient sur la plateforme. Ce sont des poses fixes de référence, pas de nouvelles planches animées complètes ni de certification canon1:1. Les chroniques ont quatre parcours de trois rencontres : cette recette joue seulement la première épreuve Greyback et lit les pages Theta. Elle ne prétend pas terminer les douze rencontres, ni fabriquer des victoires ou des récompenses de campagne.

La capture de sélection de stages du second lot est prise lorsque le stage choisi est prêt ; les miniatures non sélectionnées sont encore en chargement différé. Elle ne certifie pas les187miniatures. Les annulations réseau `net::ERR_ABORTED` enregistrées dans le lot GameClient correspondent aux préchargements du Pit normal abandonnés lorsqu'on ouvre une chronique ; elles restent dans le rapport brut. Zéro erreur JavaScript/console et aucun HTTP>=400 sont constatés, mais aucune assertion « zéro requête annulée » n'est faite.

## Suite de publication

Les trois contextes de recette sont fermés ; Chrome QA CDP58677 reste disponible. La QA mission parallèle peut l'utiliser sans interrompre le duel, désormais terminé. Aucun fichier app/CSS ni sauvegarde utilisateur n'a été modifié par cette passe.

Après identification du SHA publié et Vercel READY, rejouer ces recettes avec une sortie HTTPS distincte et relire les nouvelles captures. Le rapport local, les builds et la disponibilité publique restent des faits séparés. Les répétitions de façades, texture du sol et zones encore peu habillées empêchent de qualifier la ville entière de finition commerciale ou de copie canon1:1.
