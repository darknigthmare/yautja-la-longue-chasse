# Contrat de réalisation — skinning et canopée

## Base et intention

Le point de départ est `8a25c5cf206647c3490ac362452c2eb22584f07e`, qui contient l’aperçu réel d’emport, le verrou d’analyse et l’escorte du retour. La bible révisée de campagne et ses décisions L restent prioritaires. Les valeurs de chasse V112 sont des choix de gameplay du projet, pas de nouvelles affirmations canoniques sur la franchise.

Le skinning désigne ici la préparation et le dépeçage des proies, puis leurs prélèvements anatomiques. Le tree system désigne les supports réels du monde : arbres rigides, lianes, cordes, chaînes, branches de repos, leurs entrées et leurs sorties.

## 1. Travailler sur la proie réelle

Le même contexte doit gouverner le menu, l’admission et la continuation : corps à portée, appui stable, approche sans obstacle, mains disponibles et absence de verrou incompatible. La préparation, le prélèvement, le portage et la suspension restent des actions distinctes. Porter un corps n’autorise pas un nouveau travail à deux mains ; déposer ce corps reste une sortie disponible.

Une perte d’appui, de proximité, de dégagement ou de disponibilité interrompt avant confirmation. La partie reste dans le stock de la proie et aucun coût de geste achevé n’est débité. Les dégâts et les actions volontaires conservent leurs interruptions existantes. L’état affiché et la description accessible expliquent le refus avec le même résultat que la commande native.

Le menu suit une cible à portée : l’opération valide en cours a priorité, puis la sélection encore valable, puis le corps le plus proche. La chute d’une deuxième proie plus près ne doit pas masquer le travail actif ni faire afficher la progression d’un autre corps. Une cible devenue hors portée ne retient pas un dialogue fantôme.

L’interface montre l’action en cours, son avancement et son temps total/restant réels. Elle distingue les parties déjà prises du stock restant. La vraie condition de l’outil et le coût de cinq points sont annoncés avant le geste ; un outil à zéro reste utilisable avec le multiplicateur de durée existant. L’analyse et la suspension ne reçoivent pas ce multiplicateur d’outil.

Les 39 espèces et 56 parties conservent leur catalogue, leurs masses, volumes, prérequis, stocks et intégrités. Aucune peau universelle n’est ajoutée. L’intégrité après analyse et les identités de rencontre ne sont pas retirées au hasard à la reprise. Une capacité devenue insuffisante au dernier tick refuse la prise sans consommer la partie. Les anciens `TrophyClaim` gardent leur contrat de collection et leur absence de poids supplémentaire.

## 2. Lire et utiliser les arbres

Le modèle de navigation part des supports et plateformes du vrai monde, de la portée et des collisions du chasseur. Il nomme le support réellement tenu et les prises proches, avec les refus de visibilité, d’endurance, d’épuisement, de délai de reprise et d’action incompatible. Un support décoratif ne devient jamais une prise.

Le HUD distingue les commandes : direction et saut sur une prise rigide ; pompage, changement de longueur et lâcher sur une prise flexible. Il reprend les affectations de clavier et le Saut de manette remappé. Le prochain support et sa distance constituent un repère : ils ne promettent ni trajectoire calculée ni réussite d’un saut.

Un repos est annoncé lorsqu’un appui réel porte les pieds du joueur, et sa récupération vient de la simulation. Le survol d’une branche ne compte pas comme une réception. L’épuisement garde l’exigence d’une vraie réception avant une nouvelle prise. Les repères Canvas sont bornés à quatre et proviennent du même modèle que le HUD.

La canopée reste optionnelle. Les nouveaux repères et textures ne changent ni géométrie de collision ni identité des supports. Les métriques réelles de déplacement restent prioritaires sur l’habillage. Le HUD doit garder des commandes lisibles à 320/390 px et sur ordinateur, avec formes et texte en plus de la couleur.

## 3. Ressources liées aux événements

Les gestes, effets et sons doivent être consommés par les états réels de travail ou de traversée. Une icône ne compte pas comme une animation corporelle complète. Le cadrage, le pivot et l’échelle du sprite d’origine restent vérifiables ; les calques ou textures supplémentaires n’altèrent pas l’identité de la proie ou du chasseur.

La pause, le blur, l’interruption et le rechargement arrêtent ou reprennent les effets selon la simulation. Aucun son de travail ne boucle après une interruption ou un démontage. Les réglages de volume existants s’appliquent. Chaque nouvelle ressource garde son chemin, son usage et son statut de production ; la génération et les vérifications techniques ne donnent pas le statut artistique humain `validated`.

## 4. Reprise durable de la chasse

La recette doit écrire puis relire le vrai sidecar de chasse dans un nouveau document. Un objet capté seulement en mémoire ne prouve pas cette frontière. Le propriétaire, la version, les identités de rencontre, les parties, la qualité et l’état confirmé doivent survivre sans duplication. Un geste non confirmé ne termine pas pendant l’absence du joueur.

Le pendule restauré doit respecter support, angle, longueur, vitesse et énergie bornés. Une géométrie ou un support devenu invalide libère le même chasseur, sans attache inventée ni impulsion gratuite. Les refus de lecture/écriture et versions futures restent protégés par le contrat de sauvegarde existant.

Une recette de chaîne réalise préparation, prélèvement, dépôt, reprise, extraction, livraison et atelier par les composants/commandes natifs concernés. Ses prérequis préparés, entrées émulées et éventuelles frontières non montées sont déclarés. Ce parcours ne devient pas à lui seul huit campagnes jouées sans aide.

## 5. Vérifications attendues

- Matrice de worksite : admission, aperçu et continuation avec appui/perte d’appui, obstacle, portage et gestes achevés ou interrompus ; stock, qualité et usure contrôlés.
- Modèle de navigation : supports rigides/flexibles, vrais refus, repos sous les pieds, disparition d’un support et quatre repères au maximum.
- Navigateur : vraie boucle de chasse, menu et HUD, clavier/manette émulée remappée, 320/390 px et bureau, captures natives, erreurs et ressources manquantes consignées.
- Durabilité : vrai writer sidecar, nouveau document, rite et pendule, écriture refusée et absence de duplication ; chaîne terrain jusqu’à l’atelier avec stock final.
- Intégration : typage, lint strict, tests pertinents, build choisi explicitement et sources finales identifiées.
- Suivi : reproduction OOXML/HTML, contrôle indépendant des cellules/liens et préservation des 108 originaux, du lot précédent et des huit Restant.

## 6. Limites et continuité

Les huit critères REM112-01 à REM112-08 restent reproduits exactement dans le suivi. Ils demandent respectivement débutants, Android physique, iPhone physique, manette physique, performances du produit sur matériel cible, huit campagnes interactives complètes, Excel natif et repli terrestre complet avec charges/armures déclarées. La nouvelle tranche conserve les distinctions entre code, modèle, navigateur, appareil et jugement humain.

R2-M027 reste un retour de Berceau distinct, avec mentor physique, nettoyage d’armure, audio et détérioration propre des objets à traiter. Les effets de dépeçage de terrain ne réalisent pas ce retour. L’original unique et la provenance des trophées restent ceux de la bible : aucun second registre, rang, recrutement ou bénéfice de collection n’est créé par les nouveaux retours visuels.
