# Clan Ship — campagne, table holo et opérations

**Extension du 5 novembre 2026.** Ce document reprend le Clan Ship physique existant et précise la suite demandée : déblocage en campagne, fonctions de ses pièces, table holographique de guerre propre au vaisseau, contrats de clan, opérations spatiales et recrues visibles. Il complète [interior-spec.md](interior-spec.md), sans recréer l'amarrage ni les services déjà livrés.

**Branche de travail :** `feat/clan-ship-operations-20261105`. **Base distante :** `9653e2e287e522ebf8867209a594033f8c1fb89b`. **Checkpoint local initial de même arbre :** `f623fefeb4987d725c369da646af0e5b9753f47f` ; cet identifiant local ne désigne pas la source publiée sur GitHub. Les références de lore et leurs limites sont regroupées dans [references.md](references.md#extension-des-opérations-du-clan-ship--5-novembre-2026).

## 1. Portée et état de réalisation

Le Clan Ship reste le vaisseau collectif `avp-clan-mothership`, auquel la coque personnelle du joueur s'amarre. Le château orbital du Wolf System et son mandat royal conservent leur identité et leur progression. La nouvelle campagne donne au joueur un **mandat opérationnel du clan**, jamais la propriété automatique du vaisseau collectif.

Les statuts de ce document ont un sens de production précis :

| Statut | Sens |
|---|---|
| `baseline` | Fonction déjà présente dans la base inspectée ; sa preuve antérieure reste dans le suivi du lot correspondant. |
| `proposed` | Exigence de cette spécification, sans constat d'intégration ni réussite revendiquée. |
| `implemented-pending` | Code d'intégration observé, mais qualification comportementale ou visuelle de cette extension encore attendue. |
| `verified` | Réservé à une preuve réelle identifiant source, scénario, résultat et limites. Aucune ligne nouvelle n'obtient ce statut par la seule présence de ce document. |

| Ensemble | État à la rédaction | Ce que cet état permet d'affirmer |
|---|---|---|
| Amarrage, sept pièces, déplacement, six services, retour personnel | `baseline` | Les modules et la recette historique existent ; les nouveaux raccordements doivent préserver leur comportement. |
| Accueil, mandat, douze contrats, six recrutements | `implemented-pending` | Catalogue et transitions observés dans `clanShipOperations.ts` ; raccordement et recette en cours. |
| Modèle tactique des opérations spatiales | `implemented-pending` | Actions, effets et relecture de l'historique observés dans `clanShipSpaceEncounter.ts` ; aucune réussite de test n'est déduite de cette lecture. |
| Grande projection de guerre, terminal et équipage au poste | `implemented-pending` | Table agrandie, projection SVG, quatre rubriques et personnages raccordés dans les composants ; parcours et captures de cette extension à qualifier. |
| Fidélité artistique des nouveaux usages et PNJ | `proposed` | Revue humaine à mener sur les références précises et le rendu réel. |

Les preuves historiques du lot du 4 novembre ne qualifient pas les contrats, l'équipage ou le combat spatial ajoutés ici. `design-data.json`, le classeur existant et leurs compteurs conservent leurs états. Le nouveau [classeur d'opérations](clan-ship-operations-20261105.xlsx) porte son propre inventaire de code, ses critères de recette et les suites prévues. Ses sources sont [operations-production.json](operations-production.json) et [operations-catalogue.json](operations-catalogue.json).

## 2. Cohérence avec les œuvres

### 2.1 Appuis conservés

Le synopsis officiel d'AVP établit une chasse initiatique ; la reconnaissance par l'Ancien soutient une progression reposant sur les actes et la valeur démontrée. Les références de production décrivent les vaisseaux et un plan de projection holographique. Elles soutiennent le principe visuel, sans fournir le plan d'une table de guerre collective. Le grand volume de notre table, ses menus, ses contrats et le mandat du joueur sont des adaptations de gameplay. Sources : `REF-OPS-01`, `REF-OPS-02`, `REF-OPS-05`, `REF-OPS-09`, `REF-OPS-10`.

Les comics du corpus Machiko fournissent des exemples de vie à bord, d'intégration à un clan et de conflit entre clans. La poursuite spatiale décrite par RSP appartient à The Predator (2018). Ces références licenciées élargissent les possibilités de conception sans fixer l'armement, le plan ou les performances du Clan Ship AVP. Sources : `REF-OPS-04`, `REF-OPS-06` à `REF-OPS-08`.

### 2.2 Adaptations explicitement originales

Les douze contrats ci-dessous, les six recrues, leurs surnoms français, les seuils de score, les jauges spatiales et les étapes de progression sont créés pour le jeu. Ils ne sont pas présentés comme des personnages, chiffres, rites nommés ou protocoles officiels. Le mandat décrit les usages de **ce clan dans notre campagne** ; il n'impose pas à tous les Yautja une doctrine uniforme.

La fidélité « 1:1 » reste un objectif de référence visuelle, pièce par pièce et objet par objet. Pour la déclarer : documenter le support, le plan ou la page, la partie observée, puis la partie extrapolée. Une image générée, un sprite chargé ou un test vert ne suffit pas. La table existante peut être réemployée avec une projection agrandie ; ce réemploi ne crée pas une nouvelle référence canonique.

## 3. Progression de campagne

### 3.1 Accès au vaisseau

Le rang Blooded réellement acquis reste la condition d'accès prévue par la campagne actuelle. Les contrôles déjà présents dans `GameClient.tsx` et la chronique font autorité. La nouvelle extension ne confère aucun rite, rang ou accès par simple ouverture d'un écran.

Les anciennes campagnes adultes sans prologue conservent leur chemin compatible. Elles peuvent découvrir l'accueil et le mandat du Clan Ship sans perte de services ou de progression antérieure. Une sauvegarde étrangère, une version future ou un état incohérent n'est pas transformé silencieusement en nouvelle visite.

### 3.2 Phases et événements

| Phase stable | Condition d'entrée | Action réelle attendue | Sortie |
|---|---|---|---|
| `blooded-required` | Campagne avec rite encore insuffisant | Poursuivre les rites existants ; afficher la raison du verrou | Accès lorsqu'il est réellement autorisé par la chronique |
| `welcome` | Accès acquis, accueil non terminé | Accomplir `welcome-aboard` dans l'ordre, aux postes des trois pièces | Accueil terminé et conservé |
| `mandate` | Accueil terminé, mandat non accordé | Se présenter au conseil à bord et demander le mandat | Mandat opérationnel accordé une seule fois |
| `operations` | Mandat accordé | Accepter un contrat, produire sa preuve, revenir et recruter | Six recrues, au moins un contrat terrain et un contrat spatial réussis |
| `circle-confirmed` | Conditions précédentes remplies puis action au conseil | Faire confirmer le cercle opérationnel | Reconnaissance du groupe ; aucun nouveau rang ni titre de propriété |

L'accueil comprend précisément `berth-register` au **hangar**, `medical-baseline` aux **soins**, puis `archive-orientation` aux **archives**. Chaque étape exige un passage et une interaction dans la bonne salle. Un bouton de résumé distant ne valide pas les trois lieux. Les pièces intermédiaires restent parcourables selon l'anneau physique existant.

Le mandat n'est pas une nouvelle barrière devant l'équipement, les trophées, les soins, l'entraînement, le codex ou le conseil déjà accessibles. Il autorise les nouveaux contrats de l'extension. Il ne remplace pas le mandat royal de Wolf et ne consomme pas ce dernier.

### 3.3 Rythme de découverte

Le premier retour à bord établit les lieux et leur utilité ; le conseil donne ensuite une responsabilité limitée. Les premiers contrats intérieurs conduisent le joueur d'un poste à l'autre et présentent des candidats. Les chasses terrain apportent des preuves nouvelles et des compétences complémentaires. Les opérations spatiales exploitent l'équipe ainsi réunie. La confirmation finale récompense la cohérence de l'ensemble, sans faire du joueur le chef absolu de tous les clans.

Les durées ne sont pas fixées arbitrairement dans la progression. L'accueil et les contrôles intérieurs doivent rester brefs ; les chasses conservent leur durée et leurs conditions réelles ; les engagements spatiaux constituent des opérations tactiques bornées.

## 4. Usage des sept pièces

| Pièce / ID | Fonction actuelle conservée | Fonction d'opération | Présence recrutée prévue |
|---|---|---|---|
| Hangar / `hangar` | Coque personnelle et retour au pont | Enregistrement, vérification des scellés, préparation d'extraction | Garde du Seuil |
| Armurerie / `armurerie` | Équipement et préparation | Audit de matériel, identification des pièces, retour à l'armurier | Griffe de Fer |
| Entraînement / `entrainement` | Entraînement existant | Circuit de préparation et entretien avec le vétéran | Balafre de Cendre |
| Conseil / `conseil` | Conseil du clan | Mandat, grande table holo, contrats, engagement spatial, confirmation | Veille des Astres |
| Archives / `archives` | Codex et mémoire | Orientation, consultation des relevés et validation de pistes | Trace Froide |
| Trophées / `trophees` | Atelier des trophées | Observation et mémoire de chasse dans les parcours intérieurs | Passage d'équipage futur ; aucune septième recrue annoncée |
| Soins / `soins` | Récupération existante | Bilan, procédure de triage et état de préparation | Suture Noire |

La géométrie, les portes, la caméra, la portée d'usage et les commandes restent celles d'`interior-spec.md`. Les nouvelles interactions s'appuient sur la position réelle du chasseur. Le passage par un PNJ ou une console doit conserver une zone d'approche et une sortie praticables ; l'image d'un acteur ne devient pas à elle seule une grande collision rectangulaire.

## 5. Table holographique exclusive

### 5.1 Accès et identité

La table des opérations est une installation de la salle du conseil du **Clan Ship**, accessible à portée pendant l'état `aboard`. L'ouvrir suspend le déplacement de la visite puis rend le contrôle à la fermeture. Le pont personnel, le Homeworld et le château de Wolf ne possèdent pas une copie qui accorde les mêmes actions à distance.

L'apparence doit faire lire une table collective : projection volumétrique au-dessus de l'installation, carte à grande échelle, points de mission distincts et place visuelle pour plusieurs membres. Sa taille projetée reste séparée de l'empreinte au sol et du point d'usage. Aucun agrandissement ne doit bloquer les portes ni masquer les commandes sur 320 px.

### 5.2 Informations et décisions

L'interface présente le mandat courant, le contrat actif, les prérequis manquants, les étapes et preuves déjà obtenues, les candidats disponibles et les recrues présentes. Les missions terrain affichent la mission de chasse existante et les mesures attendues. Les missions spatiales affichent l'objectif et les conséquences des actions tactiques.

La table permet d'accepter un contrat, de consulter sa progression, de lancer un engagement lorsque ses conditions sont remplies et de revenir au conseil. Elle conserve l'accès au conseil stratégique antérieur. Une mission refusée explique la cause exacte : mandat absent, autre contrat actif, mauvais lieu ou preuve manquante. Le texte ne suggère pas qu'un décor ou un contrat disponible a déjà été accompli.

Un seul contrat est actif à la fois. La progression est reprenable ; sélectionner une autre ligne de la table ne supprime pas silencieusement l'affectation en cours. La consultation et la fermeture n'accordent pas de résultat ou de récompense.

## 6. Les douze contrats

Tous les IDs sont stables. Les intitulés narratifs ci-dessous peuvent être ajustés sans changer les identifiants de sauvegarde. Une route intérieure signifie des **interactions ordonnées dans les pièces**, pas l'apparition d'un ennemi ni un combat intérieur déjà implémenté.

| ID | Titre du catalogue / catégorie | Preuve et déroulement | Effet de progression |
|---|---|---|---|
| `welcome-aboard` | Une place à bord / campagne intérieure | `berth-register` hangar → `medical-baseline` soins → `archive-orientation` archives | Rend possible l'audience de mandat au conseil |
| `ship-seal-check` | Le seuil demeure fermé / intérieur | Hangar → soins → archives → hangar ; contrôler la chaîne de confinement | Preuve de Garde du Seuil |
| `ship-armory-audit` | Les armes répondent de leur porteur / intérieur | Armurerie → archives → armurerie ; comparer matériel et relevés | Preuve de Griffe de Fer |
| `ship-triage-route` | Le chemin du retour / intérieur | Soins → hangar → soins ; vérifier une procédure de retour | Preuve de Suture Noire |
| `ship-training-circuit` | La trace et le geste / intérieur | Entraînement → trophées → entraînement ; préparer et commenter le circuit | Preuve de Balafre de Cendre |
| `field-jungle-survey` | Les traces d’Oseris-IV / terrain | Chasse `jungle-vey` réussie ; score ≥ 50, au moins 1 scan réel | Preuve de Trace Froide |
| `field-ice-route` | La route sous la glace / terrain | Chasse `ice-cryostalker` réussie ; score ≥ 50, au moins 1 scan réel | Preuve de Veille des Astres |
| `field-bad-blood` | Le dossier des cendres / terrain | Chasse `volcano-bad-blood` réussie ; score ≥ 60 ; aucun scan supplémentaire imposé | Contrat spécial de clan ; aucun statut universel de caste inventé |
| `field-ruins-memory` | Ce que gardent les ruines / terrain | Chasse `ruins-ancient-guardian` réussie ; score ≥ 60, au moins 2 scans réels | Contrat secondaire de mémoire et de relevé |
| `space-screening` | Ouvrir un passage sûr / espace | Engagement de type `escort` ; résultat réellement gagné dans le système tactique | Première preuve spatiale possible |
| `space-interception` | L'interception mesurée / espace | Engagement de type `interception` ; objectif adverse résolu par les actions du joueur | Contrat spatial de protection des opérations |
| `space-recovery` | Ramener le signal / espace | Engagement de type `recovery` ; récupération menée à son terme | Contrat spatial d'extraction et de récupération |

Après le mandat, les quatre contrats intérieurs, les chasses jungle/glace et la première escorte sont accessibles selon les autres conditions réelles de la campagne. `field-bad-blood` attend `field-jungle-survey` ; `field-ruins-memory` attend `field-ice-route` ; l'interception et la récupération attendent `space-screening`. Aucun spécialiste n'est obligatoire pour la première escorte. Les contrats de clan ne doivent pas contourner le déblocage de la chasse correspondante.

### 6.1 Preuves de terrain

Les contrats terrain utilisent la chasse existante : mission, tentative, complétion, score et scans enregistrés. Le relevé de départ permet de distinguer un résultat obtenu pendant le contrat d'un ancien résultat de campagne. Une chasse perdue, abandonnée, sur une autre mission ou insuffisante ne valide pas le contrat. Relire ou réimporter le même résultat ne doit pas multiplier une complétion.

Ces contrats ne prétendent pas ajouter un nouveau camp ennemi, une nouvelle créature, une extraction en temps réel ou un nouveau niveau de chasse. Leur première réalisation est une affectation de clan reliée à une vraie session existante. Une extension de leurs objectifs dans le monde nécessite un lot supplémentaire et sa propre recette.

### 6.2 Départs, retours et récompenses

Le départ terrain emprunte les flux réels de préparation, de voyage et d'arrivée. Il respecte l'état d'amarrage, l'identité de la coque et de la campagne, ainsi que le même identifiant de chasse prévu par le système d'arrivée. La sélection d'un contrat ne téléporte pas silencieusement la coque amarrée sur une planète.

Les services conservent leurs coûts et effets métier. L'extension utilise les **marques de clan déjà présentes** dans le profil, sans monnaie nouvelle, rang offert, équipement gratuit ni soins infinis. Le modèle retourne une récompense ; le propriétaire de sauvegarde doit enregistrer le reçu de contrat et le nouveau solde dans la même mise à jour. Une erreur de persistance ne donne pas de récompense visible.

| Contrat | Marques de clan |
|---|---:|
| `welcome-aboard` | 0 |
| `ship-seal-check` | 15 |
| `ship-armory-audit` | 20 |
| `ship-triage-route` | 20 |
| `ship-training-circuit` | 20 |
| `field-jungle-survey` | 40 |
| `field-ice-route` | 50 |
| `field-bad-blood` | 65 |
| `field-ruins-memory` | 90 |
| `space-screening` | 45 |
| `space-interception` | 65 |
| `space-recovery` | 55 |

L'accueil, l'attribution du mandat, le recrutement et la confirmation du cercle ne donnent pas de marques supplémentaires. Les valeurs ci-dessus sont des choix d'équilibrage observés dans le catalogue, pas des chiffres du lore. Le même reçu ne peut pas être payé deux fois. Les autres bénéfices sont l'éligibilité d'un candidat, sa présence à bord et ses effets sur les engagements suivants.

## 7. Recrutement et présence physique

### 7.1 Six identités originales

| ID | Nom original / rôle | Preuve requise | Poste final | Identité de service |
|---|---|---|---|---|
| `ash-scar` | Balafre de Cendre / vétéran | `ship-training-circuit` | `entrainement` | Commente la préparation et les preuves de chasse ; ne décerne pas automatiquement un nouveau rang. |
| `star-watch` | Veille des Astres / navigatrice | `field-ice-route` | `conseil` | Apporte la compétence de navigation prévue pour les opérations spatiales. |
| `iron-claw` | Griffe de Fer / armurier | `ship-armory-audit` | `armurerie` | Associe le matériel du bord à sa préparation ; conserve les règles de l'arsenal existant. |
| `cold-trace` | Trace Froide / pisteur | `field-jungle-survey` | `archives` | Relie les scans et relevés au travail du clan. |
| `black-suture` | Suture Noire / responsable des soins | `ship-triage-route` | `soins` | Accompagne la récupération entre missions selon les limites du système médical. |
| `threshold-guard` | Garde du Seuil / veilleur du bord | `ship-seal-check` | `hangar` | Relie le retour d'expédition aux contrôles du vaisseau. |

### 7.2 Cycle de recrutement

Une preuve achevée rend le candidat éligible ; elle ne le recrute pas automatiquement. Le joueur revient au poste prévu, rencontre le personnage et choisit explicitement de l'intégrer. L'action exige la bonne campagne, le bon lieu et les conditions de progression. La persistance doit réussir avant l'affichage définitif comme membre recruté.

Le tableau de recrutement distingue clairement « preuve manquante », « prêt à rejoindre » et « recruté ». Après intégration, le membre apparaît à son poste, avec son nom, son rôle et une interaction. Il ne reste pas une simple entrée invisible dans une liste. La reprise de campagne conserve cet état et évite de faire apparaître deux exemplaires du même membre.

Les ressources visuelles du jeu peuvent être réemployées pour représenter ces rôles, avec identité stable et position adaptée. Ce réemploi est distinct d'une nouvelle animation, d'une IA autonome ou d'une validation artistique. Les routines de vie, conversations à plusieurs et déplacements interpièces appartiennent au backlog tant qu'ils ne sont pas réalisés et exercés.

### 7.3 Confirmation du cercle

La phase `circle-confirmed` exige les six recrutements, au moins un contrat terrain réussi et au moins un contrat spatial réussi, puis une action explicite au conseil. Elle reconnaît une équipe opérationnelle prête ; elle n'attribue ni Blooded, ni Elder, ni royauté, ni possession du Clan Ship. Rejouer l'action ne doit pas attribuer plusieurs fois sa progression.

## 8. Opérations spatiales

Les trois opérations constituent une couche tactique commandée depuis le conseil. Elles ne sont pas annoncées comme un simulateur de vol libre 3D, une guerre de flotte persistante ou une reproduction de la bataille de 2018. Le joueur doit lire une situation, choisir une action, en constater les conséquences et atteindre un objectif propre au type d'engagement.

| Type | Intention de jeu | Condition de lisibilité |
|---|---|---|
| `escort` | Protéger une expédition pendant sa progression | Montrer la progression de l'objectif et la menace pesant sur lui ; gagner ne dépend pas seulement d'un nombre de tirs. |
| `interception` | Empêcher un appareil hostile de compromettre une route | Distinguer l'avancement de l'interception, l'état adverse et le coût des actions. |
| `recovery` | Récupérer un élément ou un groupe sous menace | Montrer la progression de récupération et les conditions qui permettent de continuer. |

### 8.1 Rythme et situation tactique

Le module `clanShipSpaceEncounter.ts` définit un maximum de **16 tours**. Chaque ordre accepté consomme un tour ; fermer la table ne fait pas avancer le combat. L'énergie commence à 5 et est plafonnée à 8. L'intégrité de la formation, celle du contact, sa propulsion et l'intégrité de l'élément protégé commencent à 100. Ce sont des jauges de jeu normalisées, pas une taille de flotte ou des spécifications physiques.

La portée possède trois niveaux : distante, tactique et rapprochée. Deux niveaux d'analyse identifient d'abord le contact puis préparent l'abordage. L'ennemi annonce successivement une acquisition de cible, une salve ou un contournement ; l'action choisie règle ensuite les pertes et l'avancement. L'intention visible permet une décision réfléchie, sans réaction imposée par une minuterie.

### 8.2 Ordres disponibles

| ID / ordre | Énergie | Effet observé dans le modèle |
|---|---:|---|
| `scan` / Analyser le contact | −1 | Augmente le niveau d'analyse ; le pisteur permet d'atteindre les deux niveaux en un ordre. |
| `manoeuvre` / Manœuvrer | −1 | Change la portée et réduit les pertes du tour ; participe aux segments d'escorte après identification. À portée rapprochée, revient en couverture tactique. |
| `recharge` / Répartir l'énergie | +4, jusqu'au plafond | Reconstitue la réserve avec une exposition accrue à la réaction ennemie. |
| `brace` / Former un écran | +2, jusqu'au plafond | Réduit les pertes de la formation et de l'objectif ; protège un segment d'escorte après identification et rapprochement. |
| `disrupt` / Neutraliser les moteurs | −3 | Contact analysé et à portée : retire 40 de propulsion et 4 d'intégrité ; l'armurier ajoute 10 aux dommages de propulsion. |
| `fire` / Tir concentré | −3 | Contact analysé et à portée : retire 32 + 4 par niveau d'analyse à l'intégrité ; l'armurier ajoute 10. |
| `board` / Envoyer l'abordage | −2, ou −1 avec gardien | Hors escorte : exige deux niveaux d'analyse, portée rapprochée et propulsion ≤ 20 ou intégrité adverse ≤ 35. |
| `extract` / Extraire l'équipe | −2 | Termine l'escorte après trois segments, ou la récupération après l'abordage. |
| `withdraw` / Rompre le contact | 0 | Termine sans victoire ni récompense. |

Une commande indisponible doit afficher la raison : énergie, portée, analyse, objectif ou état terminal. Un ordre refusé ne consomme pas un tour. L'interface ne doit pas laisser croire qu'un clic indisponible a engagé l'équipe.

L'**écran défensif** désigne ici une formation et une manœuvre de couverture. Il ne permet pas de déduire une bulle de bouclier énergétique autour du vaisseau AVP. Une future illustration d'armement ou de protection devra être rattachée à l'appareil et à sa référence précise.

### 8.3 Résultats

- **Escorte :** identifier, atteindre la portée utile, protéger trois segments par manœuvre ou écran, puis extraire. Détruire le contact ne remplace pas cette extraction.
- **Interception :** réduire l'intégrité adverse à zéro ou mener un abordage valide. Une propulsion à zéro immobilise le contact ; elle n'attribue pas seule la victoire.
- **Récupération :** mener l'abordage valide, puis extraire la capsule. Le scénario représente ces décisions tactiques ; aucun intérieur de vaisseau ennemi jouable n'est annoncé.
- **Défaite :** formation ou élément protégé à zéro, ou fenêtre de 16 tours refermée sans objectif conclu. Une victoire obtenue au dernier tour est résolue avant une nouvelle réaction ennemie.
- **Retraite :** ordre volontaire, état `withdrawn`, aucune récompense.

Une défaite ou une retraite ne détruit pas définitivement le Clan Ship, la coque personnelle ou les autres campagnes. Le retour au conseil permet de comprendre le résultat ; une nouvelle tentative suit les règles du propriétaire de contrat.

### 8.4 Contributions de l'équipage

Les rôles recrutés sont figés au début de l'engagement. Un changement ultérieur de pièce ou une ouverture de menu ne modifie pas rétroactivement cette équipe.

| Recrue / rôle stable | Contribution tactique |
|---|---|
| Balafre de Cendre / `veteran` | Réduit les pertes de la formation de 2 points par tour. |
| Veille des Astres / `navigator` | La première manœuvre atteint directement la portée rapprochée. |
| Griffe de Fer / `armorer` | Ajoute 10 points aux dommages des tirs et de la neutralisation de propulsion. |
| Trace Froide / `tracker` | Un ordre d'analyse obtient les deux niveaux. |
| Suture Noire / `medic` | Réduit les pertes de la formation de 2 points par tour. |
| Garde du Seuil / `warden` | Réduit le coût d'abordage à 1 et les pertes de l'élément protégé de 2 par attaque. |

Ces effets sont des abstractions originales de préparation, coordination et assistance. Une perte de jauge ne supprime pas un PNJ de l'équipage et n'ajoute pas une simulation de blessures individuelles.

Un résultat spatial ne complète un contrat que si l'engagement correspond au contrat actif et s'est conclu par une victoire valide. Ouvrir la scène, fermer une fenêtre ou appeler un bouton de rapport ne suffit pas. Les états de combat doivent rester indépendants de la sauvegarde d'une chasse planétaire ; leur reprise et leur remise à zéro sont des règles explicites à vérifier.

Le DTO conserve au plus seize ordres, le scénario et les rôles présents au départ. Le validateur rejoue cet historique pour vérifier les valeurs dérivées et refuse les états incohérents ou de version future. Cette vérification protège la cohérence d'une sauvegarde locale ; elle n'est pas une autorité serveur multijoueur. `expectedTurn` et la révision du dossier empêchent qu'une même commande périmée soit appliquée deux fois.

## 9. Contrats d'état et de sauvegarde

Les nouvelles données appartiennent à la campagne identifiée par `createdAt` / `ownerCreatedAt`. Elles ajoutent l'accueil, le mandat, le contrat actif et sa progression, les contrats terminés, les recrues et la confirmation finale. Le format exact appartient au module d'opérations et à son validateur ; ce document ne crée pas un second schéma concurrent.

Exigences à vérifier :

1. Ancienne sauvegarde sans opérations : initialiser uniquement la nouvelle progression, conserver flotte, salles, services, rangs et preuves antérieures.
2. Sauvegarde valide : restaurer le contrat actif, ses étapes, ses références de terrain et les recrutements du même propriétaire.
3. Propriétaire différent, version future ou données invalides : conserver un diagnostic exploitable ; aucune normalisation destructive silencieuse.
4. Échec d'écriture : conserver l'état antérieur visible, refuser l'attribution et permettre une nouvelle tentative.
5. Import/export et checkpoint : conserver la cohérence avec la flotte, l'amarrage et la campagne ; ne pas transférer un équipage entre campagnes.
6. Répétition d'une action : accueil, mandat, recrutement, rapport et confirmation restent idempotents.
7. Retour au menu ou recharge : reprendre depuis une position sûre de la pièce, conformément à l'intérieur existant ; ne pas ajouter implicitement une persistance de position fine.

## 10. Recette attendue

Ces lignes sont des critères à exercer, pas des résultats. Le rapport final doit distinguer tests de domaine, persistance, interactions navigateur, inspection des captures et revue artistique humaine.

| Critères du suivi | Parcours observable | Preuve à obtenir |
|---|---|---|
| `OPS-Q01` | Unblooded, Blooded et ancienne campagne adulte | Verrou cohérent, accès réel et compatibilité sans rang offert |
| `OPS-Q02` | Accueil dans l'ordre puis recharge à mi-parcours | Interaction de proximité, étape conservée, mauvaise salle refusée |
| `OPS-Q03` | Accueil achevé puis audience du conseil | Mandat unique ; services antérieurs encore utilisables |
| `OPS-Q04` | Table ouverte au conseil, fermée puis rouverte | Projection et commandes lisibles ; position et contrôle rendus |
| `OPS-Q06` | Un contrat intérieur complet | Bon ordre, vraie présence dans les pièces, résultat persistant |
| `OPS-Q07 / OPS-Q08` | Terrain réussi, insuffisant, ancien ou différent | Seule la nouvelle preuve correspondant au contrat est acceptée |
| `OPS-Q09 / OPS-Q10` | Preuve obtenue puis recrutement au poste | Candidat éligible, action explicite et PNJ visible après recharge |
| `OPS-Q11 / OPS-Q14 / OPS-Q18` | Escort, interception, récupération, défaite et retraite | Actions ayant des effets réels ; seule la bonne victoire complète le contrat |
| `OPS-Q15` | Six recrues et preuves terrain/espace, puis conseil | Confirmation unique sans modification de rang ou de propriété |
| `OPS-Q16 / OPS-Q17 / OPS-Q19` | Deux campagnes, import et écriture refusée | Isolation, diagnostic et absence de récompense fantôme |
| `OPS-Q13 / OPS-Q20` | Intérieur, table et PNJ à 320 px, clavier et tactile | Accès, focus, défilement, fermeture et absence de recouvrement bloquant |
| `OPS-Q12` | Retour personnel, désamarrage, départ et arrivée | Identité de coque conservée et flux existants non contournés |

Ne pas relancer une vaste recette historique uniquement pour mettre ce document à jour. Les changements runtime nécessitent les vérifications ciblées et les portes du dépôt qui s'appliquent effectivement à leur portée. Les commandes, la source et leurs résultats réels seront enregistrés par le chantier d'intégration.

## 11. Backlog de développement approfondi

| Priorité | Extension proposée | Ce qui doit exister avant de la déclarer jouable |
|---|---|---|
| Suite 1 | Missions intérieures avec situation dynamique : avarie, quarantaine, cargaison suspecte | État spatial de l'incident, indices et outils interactifs, résolution réelle, retour sûr et sauvegarde ; les routes de poste de ce lot ne suffisent pas. |
| Suite 1 | Réactions et dialogues individuels après chaque contrat | Lignes contextualisées, conditions stables, suivi des répétitions et présence du bon interlocuteur. |
| Suite 1 | Revue visuelle du conseil et de l'équipage | Références annotées, silhouettes distinctes à l'échelle, approche praticable et approbation humaine séparée. |
| Suite 2 | Objectifs terrain propres aux opérations de clan | Entités et interactions nouvelles dans la chasse, télémétrie dédiée, conséquences et recette du niveau. |
| Suite 2 | Vie de bord : déplacements, échanges, rassemblement avant mission | Navigation et routines réellement simulées, horaires compatibles avec la présence utile et absence de blocage des portes. |
| Suite 2 | Opérations spatiales plus longues : modules endommagés, abordage, événements de flotte | Modèle de dommages, retours entre scènes, résolution et sauvegarde ; chaque appareil reste identifié par sa référence et ses capacités. |
| Suite 3 | Campagne de guerre entre clans avec conséquences territoriales | Connexion au système stratégique existant, diplomatie et enjeux d'honneur définis pour cette continuité, boucles de reprise et absence de doublon avec le conseil précédent. |

La suite doit enrichir les décisions et les actions vécues à bord. Une nouvelle catégorie de menu, un texte de mission ou un décor isolé ne constitue pas à lui seul une nouvelle mécanique terminée.

## 12. Missions intérieures à développer après les parcours de poste

Ces scénarios sont **conçus, non implémentés**. Ils prolongent les salles et les personnages du lot courant. Ils ne reproduisent aucune scène identifiée d'AVP ou des comics. Les prérequis indiquent une progression souhaitée ; ils ne sont pas encore des conditions actives dans le catalogue de sauvegarde.

### 12.1 Le scellé qui ment

**Déclenchement prévu :** après `ship-seal-check`, proposition de Garde du Seuil au hangar. Un témoin de fermeture contredit le registre d'un lot revenu d'expédition. La mission ne déclare pas automatiquement une invasion xénomorphe.

**Actions attendues :** relever le témoin, lire l'identité du lot aux archives, choisir l'isolateur correspondant, vérifier l'absence de pression résiduelle au poste médical et faire contrôler la fermeture au hangar. Les indices et les deux états de l'isolateur doivent exister dans la scène. Une validation au hasard ne remplace pas la collecte des indices.

**Échec et reprise :** un mauvais isolateur maintient le lot sous restriction et déclenche un retour explicite au diagnostic. La porte d'accès du joueur reste praticable. Une sauvegarde conserve indices obtenus, isolateur choisi et état de contrôle ; la fermeture finale ne peut être payée qu'une fois.

**Conséquence envisagée :** une réplique de confiance et une variante ultérieure d'extraction. Le montant, la récompense et le déblocage restent à équilibrer. Aucun gain n'est écrit aujourd'hui.

### 12.2 Une lumière dans le relais

**Déclenchement prévu :** après `ship-armory-audit`, Griffe de Fer signale une alimentation instable du terminal du conseil. Le problème affecte une projection locale, sans rendre tous les services historiques inaccessibles.

**Actions attendues :** comparer le cycle d'un témoin à celui des archives, isoler la bonne branche, récupérer un composant clairement identifié à l'armurerie, remettre le relais en service et contrôler le signal au conseil. Le puzzle repose sur deux circuits lisibles, sans imposer de réflexe de lecture trop rapide sur mobile.

**Échec et reprise :** une mauvaise permutation réinitialise seulement le test du relais, avec ses éléments déjà collectés conservés. Reprendre depuis une pièce voisine ne remet pas gratuitement le composant à neuf et ne consomme pas deux fois la même pièce.

**Conséquence envisagée :** diagnostic enrichi à la table pour une mission d'interception. L'effet reste une proposition tant que ses règles ne sont pas reliées au moteur spatial.

### 12.3 La trace du véritable porteur

**Déclenchement prévu :** après `field-ruins-memory`, Trace Froide demande de confronter une marque de trophée et un rapport de chasse. L'enjeu concerne une attribution précise au sein de ce clan.

**Actions attendues :** examiner le support de trophée, consulter deux relevés compatibles ou contradictoires, entendre Balafre de Cendre puis choisir une conclusion motivée. Le texte doit permettre au joueur de déduire la provenance ; les choix ne sont pas une simple réponse cachée sans indice.

**Échec et reprise :** une conclusion non étayée renvoie vers le relevé manquant. Le jeu ne retire aucun trophée historique du joueur sans règle et confirmation spécifiques. La décision finale conserve ses preuves et ses interlocuteurs.

**Conséquence envisagée :** chronique et réaction de deux membres. Aucun rang, personnage canonique nouveau ou règle universelle de justice yautja n'est déduit de cette mission.

### 12.4 Le retour que l'on prépare

**Déclenchement prévu :** après `space-recovery`, Suture Noire et Garde du Seuil préparent l'arrivée d'une équipe. Le scénario ne transforme pas rétroactivement les pertes abstraites de l'engagement en blessures individuelles déjà simulées.

**Actions attendues :** préparer une voie libre, choisir un poste de transfert, accompagner une équipe visible vers les soins puis présenter le relevé au conseil. Le trajet doit réagir aux portes et aux zones d'usage. Les personnages suivent réellement le déplacement au lieu de disparaître puis réapparaître après un clic.

**Échec et reprise :** un arrêt conserve la position sûre du groupe et une prochaine destination claire. Aucune mortalité hors écran n'est déclenchée pendant la fermeture de l'application. Une panne d'écriture ne valide pas le transfert.

**Conséquence envisagée :** dialogue de retour et nouvelle tâche du poste médical. Le transfert à lui seul n'accorde pas de soin illimité au joueur.

### 12.5 Objectifs supplémentaires dans les chasses

Les quatre contrats actuels réutilisent mission, extraction, score et scans. Leur extension doit ajouter des objets ou acteurs observables, puis une preuve de l'interaction concernée :

| Contrat existant | Objectif de niveau à concevoir | Donnée à conserver | Limite de continuité |
|---|---|---|---|
| `field-jungle-survey` | Relever deux traces différentes et poser une balise sur une ligne de passage | IDs des traces, position valide de balise, session de chasse | Aucune nouvelle créature canonique implicite |
| `field-ice-route` | Reconnaître deux passages et signaler celui qui permet le retour | Passages observés, choix de route, extraction réelle | Les conditions doivent exister sur la carte utilisée |
| `field-bad-blood` | Identifier une signature hostile et récupérer son relevé après confrontation | Cible exacte, preuve collectée, résultat de chasse | Ne pas étendre le terme Bad Blood à tous les rivaux de clan |
| `field-ruins-memory` | Associer deux inscriptions à une structure observée puis rapporter le relevé | Objets scannés, association résolue, reçu unique | Texte et symboles originaux signalés comme tels |

Ces objectifs doivent utiliser les points d'insertion du niveau existant et son propriétaire de résultat. Un drapeau modifié dans le hub n'est pas une preuve de terrain.

## 13. Équipage : profondeur narrative et vie de bord

### 13.1 États de dialogue proposés

Le lot courant possède une présentation, une condition de recrutement et une réplique d'accord pour chaque membre. La suite distingue cinq contextes : preuve manquante, preuve récente, accord, retour d'opération et cercle confirmé. Chaque réplique ne doit être émise que par le PNJ correspondant à l'état actuel.

| Membre | Préoccupation personnelle | Réaction de retour proposée | Interaction propre à développer |
|---|---|---|---|
| Balafre de Cendre | Que la préparation serve une décision en situation | Commente le choix de repli ou d'abordage, sans punir mécaniquement tout retrait | Démonstration puis exercice mesuré par le système d'entraînement |
| Veille des Astres | Préserver les routes et distinguer information et certitude | Compare le relevé de glace et l'itinéraire spatial réellement suivi | Lecture de deux projections et choix d'une route argumentée |
| Griffe de Fer | Que chaque équipement confié revienne identifié | Observe les consommations et les dommages enregistrés, sans inventer des pertes | Diagnostic d'un matériel réellement présent à l'arsenal |
| Trace Froide | Conserver une preuve exploitable plutôt qu'un récit flatteur | Relève les scans et les éléments non confirmés du dernier dossier | Comparaison d'indices avec conséquence écrite dans les archives |
| Suture Noire | Préparer le retour aussi soigneusement que le départ | Réagit aux issues de mission, sans affirmer une blessure non simulée | Préparation du poste et accompagnement d'une équipe dans la scène |
| Garde du Seuil | Savoir qui ou quoi traverse les accès du bord | Reprend le contrôle après une récupération ou un retour de chasse | Inspection d'un lot avec témoins et état de confinement visible |

Ces orientations sont originales. Elles ne déclarent pas des fonctions, genres, titres ou doctrines obligatoires pour tous les clans.

### 13.2 Routines proposées

Le poste permanent reste le point de rencontre fiable. Une routine ultérieure peut prévoir un déplacement court vers un voisin, une pause et une réunion au conseil. Elle exige un chemin valide, une priorité de passage aux portes et un retour explicite au poste si le joueur vient demander un service. Le temps hors application n'est pas simulé tant qu'aucun contrat d'horloge n'a été défini.

Les PNJ ne traversent pas le chasseur, une installation ou un autre membre. Une conversation suspend la routine de l'interlocuteur ; sa fin restaure l'objectif précédent ou un retour sûr. Le chargement d'une salle ne doit pas créer un second acteur portant le même ID. Le recrutement ne transforme pas les six spécialistes en unités consommables des anciennes campagnes stratégiques.

### 13.3 Réunion avant mission

Une présentation collective au conseil peut montrer les membres retenus et leur contribution. La sélection éventuelle devra rester explicite : rôles affectés, rôle absent et raison. Le lot actuel utilise tous les rôles recrutés au départ, sans limite de places ni système de fatigue. Aucun écran futur ne doit faire croire qu'une sélection de places est déjà appliquée.

## 14. Production visuelle et sonore

### 14.1 Réemploi effectif de ce lot

Les sept décors et huit props dédiés du Clan Ship sont conservés. La nouvelle table utilise `council-table-v1.webp` dans une implantation élargie ; la projection est un élément SVG distinct. Les six recrues utilisent six dessins individuels existants, choisis de manière déterministe dans leur rôle. Les trois fichiers d'installation partagée alimentent six instances secondaires ; cadres et battants des portes restent ceux du kit intérieur. Aucune de ces réutilisations n'est comptée comme une nouvelle génération.

L'extracteur [export-operations-catalogue.mjs](export-operations-catalogue.mjs) relève les chemins, dimensions disponibles et empreintes des fichiers affichés. La source du chasseur et les autres services hérités conservent leurs inventaires propres ; ce relevé d'opérations ne prétend pas remplacer l'inventaire de tout le jeu.

### 14.2 Exigences pour les prochaines ressources

- Chaque appareil tactique doit correspondre à une identité de coque et une vue de référence. Les symboles actuels restent lisibles jusqu'à validation de leurs remplacements.
- Chaque prop d'incident doit posséder une fonction, des états nommés, un point d'usage et une empreinte distincte de son image. Les états exportés restent dans des fichiers séparés.
- Chaque animation de PNJ conserve silhouette, proportions, tenue et pivot entre les poses. Un dessin immobile ne reçoit jamais un statut d'animation terminée.
- Les glyphes décoratifs sont des créations visuelles du projet tant qu'une référence linguistique précise ne permet pas d'en affirmer le sens.
- Les futurs effets de tir, propulsion et projection doivent être déclenchés par le résultat réel, sans changer la lisibilité du sol ou des objectifs et avec une version adaptée au mouvement réduit.

Le classeur distingue **réemployé et raccordé**, **rendu en code**, **réemploi à étudier** et **à produire**. Il ne transforme pas une liste de besoins en ressources générées.

### 14.3 Audio à produire

Prévoir activation/fermeture de la table, ordre accepté/refusé, alerte de contact, manœuvre/extraction et débrief. Les confirmations suivent l'écriture réussie ; un refus reste audible et lisible sans donner un son de victoire. Fermer la table, perdre le focus ou ouvrir les réglages applique les règles audio existantes. Une écoute du mixage reste distincte d'un test qui observe seulement un appel de lecture.

## 15. Raccordement à la guerre des clans

L'accès au conseil stratégique existant fonctionne comme un service de bord. La nouvelle progression n'écrit pas aujourd'hui de territoire, d'unité ou de rapport dans les quatre modes stratégiques. Toute suite doit conserver leur propre propriétaire d'état, leurs coûts, leurs verrous et leurs règles de preuve.

| Mode existant | Usage proposé de la table du Clan Ship | Donnée nécessaire avant un raccordement réel |
|---|---|---|
| Assaut latéral | Choisir une opération d'appui à un site hostile déjà identifié | Monde, site, session, équipe et reçu d'assaut exacts |
| Infiltration / sabotage | Préparer l'approche d'un relais hostile depuis les relevés du clan | Cible admissible, état du relais, preuve d'extraction et conséquences permises |
| Outer Ops | Envoyer une équipe disponible dans une mission déléguée | Affectation réelle, indisponibilité, durée et rapport émis par le moteur existant |
| RTS de guerre totale | Présenter théâtre, objectifs et ordre du conseil | Source du scénario, terrain, participants, résultat et politique de retour |

Le premier raccordement utile serait une **préparation d'ordre** : la table indique l'objectif et ouvre le mode existant avec une cible valide. L'étape suivante peut consommer un reçu validé et présenter le débrief à bord. Aucun résultat ne doit être payé deux fois, ni un exercice autonome converti silencieusement en conquête de campagne.

Les engagements spatiaux plus longs demandent d'abord une identité des appareils de la formation. Pour un abordage parcourable : conserver la phase spatiale, entrer dans une vraie scène avec objectifs et issue, puis rendre son résultat au même engagement. Une défaite intérieure ne doit pas inventer une destruction permanente des coques historiques. Ces contrats de reprise et de conséquence précèdent toute simulation de flotte persistante.

## 16. Mise à jour du suivi

Le suivi utilise une source de conception modifiable et un catalogue extrait du code, sans réécrire le classeur historique du 4 novembre.

1. Exécuter `node production/clan-ship-20261104/export-operations-catalogue.mjs` depuis le dépôt. Cela relit les définitions et identifie les fichiers réellement présents.
2. Mettre à jour `operations-production.json` avec les résultats obtenus, leur source exacte et leurs pièces de preuve. Les champs de revue humaine restent ouverts tant qu'aucun avis correspondant n'existe.
3. Exécuter `build-operations-workbook.mjs` avec le runtime primaire d'Artifact Tool, depuis un dossier temporaire configuré pour ce runtime. L'export se fait d'abord dans `outputs/<identifiant>/`, puis la copie destinée à Git est placée dans ce dossier de production.
4. Recalculer, inspecter les erreurs de formule, tester une entrée de statut modifiable et vérifier les rendus des huit feuilles. L'export valide sa propre cohérence ; il ne valide pas le gameplay.

Une ligne passe de « À vérifier » à « Vérifié » uniquement lorsque sa preuve couvre le critère écrit. Une ligne visuelle conserve « Revue artistique attendue » tant que la revue humaine n'est pas validée, même si sa recette technique passe. Les références exactes du commit publié et de la PR sont renseignées après publication, sans les déduire de la branche locale.


## 17. Preuves locales de cette extension

La source vérifiée est enregistrée fichier par fichier dans [qa-operations/local-verification.json](qa-operations/local-verification.json), avec les empreintes des journaux. Le catalogue de contenu possède sa propre empreinte couvrant ses vingt-deux fichiers d’entrée ; ces périmètres sont explicites. Les preuves locales conservent leur empreinte historique `c8a06e7f…`. La révision de libellé « Les traces d’Oseris-IV » change uniquement le nom du contrat `field-jungle-survey` et l’empreinte de `clanShipOperations.ts` dans le nouveau catalogue ; aucun ancien journal n’est réattribué à ces nouveaux octets. Aucun de ces identifiants n’est présenté comme le futur commit publié.

| Vérification réellement obtenue | Résultat local | Limite conservée |
|---|---|---|
| Suite Clan Ship, campagne, archives, reprise, callbacks et `/dev` | 296 tests réussis, 0 échec, 0 ignoré — [journal](qa-operations/local-tests.log) | Les fixtures et simulations de stockage ne remplacent pas le parcours navigateur. |
| Lint strict des fichiers touchés | Réussi, sans avertissement — [journal](qa-operations/local-lint.log) | Le journal vide correspond à la réussite déclarée et liée à ses sources dans le manifeste. |
| Build production | Compilation, TypeScript, export Next et garde CSS réussis — [journal](qa-operations/local-production-build.log) | Les deux étapes réservées à la racine exacte de build Vercel ont été ignorées par leurs gardes normales ; aucun déploiement n’est prouvé. |
| Inventaire runtime courant | 2 158 entrées, 1 092 273 564 octets de sources, document de 401 252 octets | Inventaire global du runtime, distinct des 28 fichiers d’image réemployés par ce sous-ensemble. |
| Classeur d’opérations | 8 feuilles ; recalcul, formules, entrées de suivi et aperçus de toutes les feuilles inspectés | Revue du classeur, sans validation humaine de l’art du jeu. |

La recette navigateur de l’extension se trouve dans `scripts/qa-clan-ship-operations.mjs`. Ses vingt-sept contrôles prévus restent **à exécuter** tant qu’une preuve réelle n’est pas attachée. La source déclare ses amorces de test, notamment les preuves terrain synthétiques utilisées pour préparer six recrues ; elles ne doivent pas être décrites comme six chasses jouées. Les validations CI, la publication et la comparaison artistique 1:1 restent séparées. Le suivi Excel qualifie uniquement les critères entièrement couverts à ce stade et conserve les autres ouverts.
