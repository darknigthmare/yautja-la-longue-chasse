# Livraison V68 : cohorte, villages et commandes de chasse

La campagne ajoute **La Cohorte des Aspirants**, après la première chasse solitaire V67. Saar et Vek accompagnent le joueur sur une route choisie : relevé collectif, relais à aligner, maîtrise d'une proie vivante, secours d'un compagnon et extraction. Le retour au mentor et la reconnaissance sont deux interactions distinctes. Treize reçus ordonnés permettent la reprise du chapitre ; sa conclusion reconnaît Young Blood, sans attribuer Blooded, une mise à mort, un arsenal adulte ou un vaisseau.

La cité ajoute **56 habitants** répartis dans ses quatorze quartiers et **15 accessoires solides** placés en préservant les chemins vers les portes. Les habitants suivent des routines locales, sont rendus uniquement dans la zone visible et peuvent être rencontrés. Ils utilisent les corps modulaires existants ; cette version ne prétend pas livrer de nouvelles planches complètes de marche.

Les **dix destinations** possèdent désormais un chemin aller-retour d'environ 420 mètres, un village de clan, douze bâtiments visitables et douze habitants. Les plans utilisent quatre implantations, des périmètres irréguliers, des portes mesurées dans les images natives et des accessoires séparés. Les petites salles ont des murs natifs en coupe et trois meubles dont le rendu et les volumes solides partagent les mêmes données. Les anciennes enquêtes des Cendres et du Verre restent des activités indépendantes. La Réserve garde sa condition d'accès ; les routes ne contournent pas les étapes de jeunesse.

Le Tableau des chasses propose **20 contrats**. **Quatre demandes personnelles** se reçoivent auprès de la soigneuse, de l'officier des quais, de la conservatrice et de la maîtresse des parures ; chacune concerne deux territoires. Les objectifs comprennent les relevés ordonnés, l'observation à distance, la protection de balises, les récupérations pendant une accalmie et trois épreuves non létales. Les preuves doivent appartenir à une nouvelle sortie liée au contrat, puis être confirmées auprès du guide. Le paiement exige une remise physique au commanditaire initial.

Les marques de clan sont créditées dans le portefeuille existant, une seule fois, dans la même écriture durable que la remise. Le registre conserve le total gagné même après une dépense. Les refus de quota, confirmations de lecture interrompues, reprises exactes, anciennes sessions et callbacks d'un trajet terminé sont contrôlés sans remplacer les archives d'un autre propriétaire.

## Références et limites

La progression exploite les conversations récupérées et conservées dans le projet, notamment les dossiers de progression des rangs et de jeunesse. Les noms de communautés, la géographie régionale et les commandes sont des adaptations originales compatibles avec l'univers ; ils ne sont pas présentés comme une carte officielle de la franchise. Le terminal OpenAI natif conserve ses pixels et son alpha. L'inspiration *Badlands* ne constitue pas une certification 1:1 de son accessoire ni d'une économie canonique de primes.

La livraison ne termine pas toute la campagne : le rite Blooded, les cinq grands actes politiques du Homeworld, les vingt-cinq sous-zones et les quinze zones Élite avec leurs grandes proies restent distincts et non livrés ici. La durée globale prévue dans les dossiers n'est pas une durée de jeu mesurée pour cette version.

## Vérifications

- Suite de régression : **2 196 tests réussis**, sans échec ni exclusion, puis vérification ciblée des dernières collisions d'intérieur : **25/25**.
- Sauvegarde du retour régional : **7/7**, avec exécution des callbacks réels, refus de quota, confirmation après écriture, session remplacée et ancien trajet.
- Paiement des commandes : callbacks réels du Hub et de GameClient, crédit atomique, reprise exacte et paiement idempotent.
- Parcours local de la cohorte : six contrôles, vingt captures, reprise froide, réglages, commandes tactiles, treize reçus et retour au mentor.
- Parcours visuel local initial : dix villages, portes et dialogues, onze contrôles et quarante-trois captures. Les fixtures commencent explicitement au seuil du village ; elles ne prétendent pas avoir parcouru les corniches.
- Parcours local des commandes : corniche entière dans les deux sens, trois traces, observation, charges évitées, touches, guide, remises, refus de sauvegarde et rechargement. **48 marques** créditées pour deux commandes, sans récompense répétée ni modification du rang.
- Dernières compositions vérifiées après recompilation : jungle et neige, portes, murs natifs, pièces centrées et consultation du service ; trois contrôles et onze captures. Terminal mural déplacé hors du corps de l'artisane et inspecté à son échelle finale. Aucun échec JavaScript ou HTTP.
- Compilations finales Next/webpack et vinext réussies ; TypeScript, lint ciblé et contrôle du CSS compilé de The Pit réussis. Le rendu portable et les transactions finales ont passé seize vérifications supplémentaires.

## Publication vérifiée

Le commit source `b19b6530f32dc976a71b8a6abe3ea7772b2f773b` est publié sur `main`. Le déploiement `dpl_D2hfFmco6wge1hkbkP6BfJ8HRzk1` est **READY**, et l'alias [Yautja : La Longue Chasse](https://yautja-la-longue-chasse.vercel.app) sert cette version. Le document et le terminal PNG répondent HTTP 200 ; le PNG public possède le SHA-256 exact de l'image native conservée.

Quatre recettes indépendantes ont ensuite réussi sur cet alias, dans des contextes isolés : cohorte complète (sept contrôles, vingt-deux captures), cité et dix villages (onze contrôles, quarante-trois captures), menus/archives (douze scénarios, dix-huit captures), et deux commandes des Cendres menées de bout en bout avec paiement unique de 48 marques. Aucun échec JavaScript ou HTTP n'est remonté. Des captures ont été inspectées réellement pour les pieds, portes, meubles, murs, titre Young Blood, reçus et disposition mobile.

Les quatre donneurs personnels ont aussi été parcourus dans le navigateur local, avec acceptation, rechargement et revisite. Leurs objectifs dans deux régions n'ont pas tous été joués jusqu'à la remise dans le navigateur ; ils restent couverts par le modèle et les callbacks réels. Le contrôle des villages démarre avec des fixtures explicites au seuil et ne prétend pas parcourir leurs dix corniches ; la recette des Cendres vérifie physiquement son aller et son retour. Les conditions de formation et de Réserve restent actives.

Les détails et périmètres exacts sont conservés dans `docs/v68-publication.json` et les six rapports qu'il référence. Les architectures V64 sont réutilisées et la densité décorative des villages peut encore progresser. Les paragraphes d'accueil conservent une partie du tutoriel initial ; le titre, le rang et le prochain objectif affichent bien Young Blood après reconnaissance et rechargement.
