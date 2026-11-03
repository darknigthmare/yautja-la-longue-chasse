# The Pit V80 — chroniques pour les 201 profils

La source monte une intrigue originale jouable pour chacun des 201 profils du roster actuel. Chaque route compte trois tableaux d'introduction, huit rencontres CPU avec avant/défi/après et trois tableaux de fin : **1608 rencontres et 1206 tableaux composés**. Ce sont des branches de THE PIT, pas 201 biographies canoniques nouvellement certifiées.

Le [registre JSON exhaustif](pit-character-chronicles-v80-coverage.json) donne les IDs, rivaux, cadres, provenance et empreintes des huit fichiers possédés. La [matrice lisible](pit-character-chronicles-v80-roster-matrix.md) contient les 201 lignes. La base de travail est `5bfd43275f39ccbb50287841db1fe56e24cc22e7`. Aucun commit ou déploiement n'a été effectué par l'agent chroniques.

## Source CQC réellement utilisée

L'archive utilisateur `CQC_Versus_Legacy_v0.56_BACKLOG_SPLIT/cqc-versus-v056/src` a été lue directement. `chronicles-core-v056.js` fournit les phases intro/pre/fight/post/defeat/outro/finished et la validation d'une route de huit combats. `chronicles-data-v056.js` contient 354 histoires, 2832 rencontres, trois intro et trois outro par histoire. `chronicles-cinema-v056.js` distingue composition stage/portrait et fullScene : une peinture complète ne reçoit pas un second portrait par-dessus.

Les trois empreintes sont consignées dans le manifeste. La structure et la distinction de mise en scène sont transférées ; les personnages, textes, objets militaires, images et canon Metal Gear ne le sont pas. CQC conserve trois reprises et un profil à deux slots alternés ; The Pit garde ses deux reprises historiques et des checkpoints locaux séparés. Cette livraison ne prétend pas reproduire tous les systèmes CQC.

## Narration et fidélité

Les 201 seeds ont été écrits individuellement : titre, adversaire final réel, enjeu matériel, difficulté initiale et décision finale. Une seconde passe complète a remplacé les conflits de classement de fichiers et de preuves canoniques par des pistes, embuscades, gardes, retraits, traversées, pièces dérobées, sabotages et trophées contestés. Jungle Hunter poursuit une trace refroidie, City Hunter doit revenir de la hauteur, Tracker préserve le rappel, Wolf garde un périmètre, Greyback éprouve le retrait, Machiko revient vers la silhouette laissée derrière et Theta cesse une poursuite pour répondre à un appel. Berserker et Bad Blood conservent des décisions agressives dans leurs branches originales.

Les huit axes dramatiques écrivent les chapitres à partir de la prémisse, de l'objet, du profil et de l'adversaire. Ils partagent des situations intermédiaires et plusieurs gardes. **1608 chapitres ne signifie pas 1608 scripts entièrement indépendants écrits à la main.** Le lien avec le rival est propre à l'intrigue ; il ne certifie pas une rivalité publiée ou le meurtrier d'un proche. Chaque route utilise huit adversaires distincts existant réellement dans le roster, avec son rival au huitième duel. Les croisements d'œuvres et d'époques sont explicitement des reconstitutions originales.

Le dossier documentaire sépare quatre résumés déjà référencés à des sources primaires, trois entrées originales/attribuées du pack V56 et 194 attributions de roster dont la biographie individuelle n'est pas nouvellement certifiée. Les classes PHG, gammes Kenner, dessins fournis et variantes ne reçoivent pas de clan, âge, parenté ou pouvoir inventé depuis un costume. Greyback/Golden Angel, Elder AVP, les trois Emissary, les Classic/Captive, Samurai/Oni et les différents Stalker restent séparés selon leurs identités historiques.

Le contrôle anti-métadiscours passe sur les scènes jouées : aucun moteur, logiciel, fichier, certification, SHA, DLC ou classification canonique dans les textes V80. Les réserves restent dans `biographyEvidence`, `continuity`, `limitation`, `familyNote` et le dossier UI. Ce contrôle aide la rédaction ; il ne certifie ni la qualité littéraire des 201 routes ni leur fidélité 1:1.

La dernière relecture corrige les contractions d'un/d'une et les départs de phrases. Les labels de produit et les mentions d'incertitude restent au dossier : Ahab n'est pas appelé « Ultimate » dans les scènes, et les profils connus seulement par un label reçoivent un rôle narratif original sans nouveau nom canonique. Les décisions finales sont préservées mot pour mot, y compris leurs clauses négatives. Les tableaux intermédiaires n'affirment plus qu'un objet recherché est déjà porté : son sort reste l'enjeu jusqu'à la décision individuelle du dernier passage.

## Illustrations et jeu réel

Le registre mesure **1206 compositions textuelles distinctes** avec les couples `{title,text}` (`uniquePanelTextCompositions`). Cette mesure ne prouve pas 1206 concepts picturaux distincts. Les tableaux réutilisent les véritables PNG et, pour les quelques portraits exclusivement en atlas, les banques natives déjà livrées. Le cadrage `contain` conserve le dessin entier sans mirroring. Il n'y a **aucune nouvelle série de 402 peintures** ni six illustrations dédiées nouvellement produites pour chacun des personnages.

Le champ facultatif `panel.fullScene` accepte `src`, dimensions, SHA256, provenance et texte alternatif pour une future peinture native dédiée. Aucun panneau de ce lot n'y affecte un asset fictif. Si ce champ existe, le renderer ne superpose pas le portrait au fullScene. Les objets et incidents décrits sont de la narration : cette livraison ne crée pas de captifs physiques, de destruction de scène, d'objectifs d'escorte ou de nouveaux effets d'armes dans le moteur. Les techniques et animations restent celles déjà disponibles dans les profils réels.

La lecture démonte le contrôleur de versus. Le duel monte uniquement un `PitCanvas` CPU avec `narrativeEncounter`; le résultat est traité par `onNarrativeComplete`, persiste immédiatement puis attend l'action de sortie explicite. KO et présentation terminale restent montés. Aucun callback de rang, récompense, archive Arcade/Circuit ou sauvegarde de campagne n'est transmis au duel narratif. La présentation reste non létale, y compris pour un personnage dont la décision narrative est cruelle.

## Anciennes parties, reprise et galerie

Les quatre routes V79 restent inchangées : mêmes trois rencontres, panneaux, IDs, ordre et reçus. Leur représentation JSON conserve l'empreinte `736ff270cd11aa1eab264e46b70a79636b542b5faa730ad86cb6571da00413d7`. Aucune migration destructrice n'est exécutée.

`PIT_CHARACTER_CHRONICLE_ROUTES_V79` reste la liste historique des quatre routes. `PIT_CHARACTER_CHRONICLE_ROUTES_V80` contient les 201 nouvelles. Le getter et le constructeur privilégient le contenu 2 ; un argument explicite 1 retourne ou crée le vrai contenu historique. Le normalisateur choisit toujours le catalogue d'après `contentVersion` et exige l'ID de route correspondant.

Les clés `the-pit-character-chronicles.v1.{owner}.{fighter}` et `v2.{owner}.{fighter}` sont distinctes. Le bouton d'édition permet de reprendre une ancienne route sans la faire passer artificiellement à huit combats. Recommencer demande confirmation et n'écrit que l'édition choisie. Aucune suppression locale globale ou écriture dans les anciennes sauvegardes n'est faite. Un checkpoint incompatible reste conservé ; un échec d'écriture n'est pas annoncé comme sauvegarde réussie.

Une reprise de combat recommence au panneau pre, avec ses reçus gagnés conservés : pas de victoire ou dépense de reprise ajoutée. Le normalisateur rejoue le journal ordonné, refuse une version future, un propriétaire étranger, une rencontre inversée, un gagnant hors duel, un résultat contradictoire et un compteur forgé. Les nuls restent au même chapitre et la troisième défaite arrête la tentative. Le journal borne les tentatives à 24 reçus sans les effacer silencieusement.

La galerie d'introduction est accessible après découverte du parcours. La fin reste verrouillée jusqu'au journal valide de huit victoires, ou trois pour une édition V79. La relecture de tableaux ne change pas le checkpoint. Il s'agit d'une progression locale, sans synchronisation cloud ni preuve cryptographique de combat côté serveur.

## Habillage et accès

La recherche couvre nom, œuvre et titre. Les filtres indiquent la provenance du dossier. Le navigateur monte au maximum 24 cartes sur ordinateur, six sur mobile, avec PNG lazy et sans lancer les 201 banques de portraits au démarrage. Une pagination native, le bouton d'affichage de la sélection, les focus visibles et `useMenuGamepad` gardent l'accès à tous les profils.

Dès qu'un récit est actif, le catalogue est replié : un bouton « Choisir un autre chasseur » le rouvre. Les scènes et leurs contrôles restent le centre de l'écran. Les quatre éditions anciennes disposent d'un choix explicite. Échap ferme d'abord une confirmation ou une relecture de galerie avant de quitter la chronique. Ces contrats source ne remplacent pas une inspection réelle du clavier, de la manette et des géométries mobile/ordinateur.

## Contrôles effectués et gates restantes

Les trois suites chroniques passent **230/230**, dont un parcours complet au reducer pour chacun des 201 IDs et le rendu React réel de ses six panneaux : 1206 rendus SSR. Les huit victoires sont des reçus **synthétiques de test**, pas des parties gagnées en navigateur. Le rendu SSR ne charge ni ne décode les images et ne démontre aucune animation ou mise en page compilée. L'existence des assets natifs référencés est contrôlée ; la peinture n'est pas certifiée par cette seule vérification.

`npx tsc --noEmit --incremental false --pretty false` et ESLint des quatre modules chroniques TS/TSX terminent exit0 avant la dernière correction de la seule phrase Alpha (« le huitième passage »). Les 230 tests chroniques ont ensuite été relancés sur cette dernière source : 230/230, journal neuf `work-local/v80-chronicles-tests-alpha-final.log`, précédents journaux conservés. Le ledger donne les SHA disque actuels et borne la chronologie de ces contrôles ; les gates finales du candidat complet et les modifications concurrentes Homeworld/fatalités restent à la charge du root.

Le build, la suite complète, les pixels compilés sur 390×844 et 1440×900, le vrai duel et la reprise, puis commit/READY/contrôles HTTPS sont des gates distinctes. Les preuves locales effectivement reçues figurent ci-dessous ; les gates globales du lot3 et de publication restent à établir par le root. Aucun reçu V79 publié n'est recyclé en preuve d'un contenu V80.

## Complément réel borné — premier duel Greyback

Le 3 octobre 2026, la recette neuve `work-local/v80/qa/chronicle-real-duel-final-local-cleanup3/report.json` a joué le premier duel de la route Greyback V80 dans le vrai GameClient Next compilé sur `http://localhost:4204`, avec Chrome QA dédié58680. Le contexte est neuf ; seul `defaultSave` ouvre le vaisseau. Aucun checkpoint de chronique, PV, position, phase, temps ou résultat n'est injecté. Le fixture de campagne n'est semé qu'une fois et n'est pas réécrit au rechargement.

Les trois intro ont été découvertes avant le premier combat contre Warrior. Les deux entrées et le compte3/2/1 bloquent le moteur ; pause/reprise sont réelles. Le joueur a perdu les deux manches par KO. La conclusion a traversé ses phases non létales avant de rendre la sortie disponible. Le reçu unique de défaite est conservé, la sortie est explicite, la campagne et les autres clés de stockage restent identiques, puis le rechargement complet reprend la défaite avec une reprise restante et la fin0/8 toujours verrouillée. **Un premier duel réellement perdu ne démontre pas huit victoires ou201 campagnes terminées.**

Le runner termine exit0 : cinq contrôles,13 captures, zéro erreur JavaScript/console/réseau brute et empreintes des13 sources identiques avant/après. Les13 PNG nouveaux ont tous été ouverts avec `view_image`; le reçu `review.fragment.json` conserve leurs empreintes et les heures réelles de relecture. Verdict **PASS_WITH_LIMITS** : le bouton Menu recouvre une partie droite de « Passer la conclusion » sur la capture10, et les cartes narratives desktop demandent un défilement vertical avec des labels de progression petits. Ces réserves sont signalées au root, sans modification runtime par ce sous-lot.

Les historiques sont conservés : le premier run avait terminé ses contrôles mais gardait Node vivant sur la connexion CDP ; il a été arrêté après fermeture des contextes. Le suivant a échoué avant toute connexion navigateur pendant le remplacement temporaire des exports du contrat QA partagé. Le runcleanup3 termine normalement ; le runner a ensuite retrouvé les imports compatibles du contrat root pour les futures recettes. Ce complément ne certifie ni les variantes mobile/manette, ni la galerie synthétique des fins, ni une publication HTTPS. Ces gates restent distinctes.

## Candidat local2 et lot3 à venir

Les reçus racine du candidat2 ont été lus en lecture seule et leurs SHA de journaux recoupés : régression finale2 **2940/2940**, Next build2 exit0, Vinext build2 exit0, lint exit0 et TypeScript après génération Next exit0. La recette UI racine r3 déclare quatre contrôles et20 nouvelles captures sur ordinateur/mobile, avec galerie des fins sur fixtures de huit reçus synthétiques explicitement déclarés. Ce sous-agent a lu son rapport brut ; il n'a pas ouvert ses20 images et n'en certifie pas la revue visuelle.

Un lot3 est prévu pour corriger le vrai chevauchement Menu/conclusion et les pads de combat terminal, ainsi que les défauts d'accès/habillage de la cité. Les chroniques et leurs IDs/rivaux demeurent gelés. Les reçus du candidat2 sont conservés ; ils ne deviennent pas automatiquement des preuves d'égalité de toutes les sources du candidat3. Nouveau build/QA puis13 nouvelles captures HTTPS après SHA exact et READY restent à venir. Aucune publication V80 n'est annoncée par ce document.

## Recontrôle local3 après correction du HUD

La recette neuve `work-local/v80/qa/chronicle-real-duel-final-next3-local/report.json`, démarrée le3octobre2026 à20:27:40Z et terminée à20:28:37Z sur le nouveau Next compilé4204, passe cinq contrôles avec13captures et zéro erreur brute/hard. Ses13sources avant/après sont identiques. Le vrai premier duel Greyback contre Warrior est de nouveau perdu par les deux KO réels ; un seul reçu de défaite est conservé, avec campagne et autre stockage inchangés, puis reprise après rechargement. Aucun résultat synthétique ni huit victoires ne sont ajoutés.

Les13nouveaux PNG ont tous été réellement ouverts avec `view_image`. Le fragment neuf `review.fragment.json` conclut **PASS_WITH_LIMITS**. Sur la nouvelle capture10, « Passer la conclusion » est entier et lisible : rectangle1198,55–1336px contre MENU1362,25–1428px, intersection0 et écart26,25px ; aucun pad tactile terminal présent dans ce contexte desktop. Le chevauchement du candidat2 reste conservé comme constat historique, mais n’est plus présent dans ces nouveaux pixels. Les tableaux desktop gardent leur scroll vertical et les petits labels de huit duels ; une finition réalisée avec les poses/assets du moteur ne constitue pas une animation anatomique native dessinée ou une fidélité1:1 certifiée.

Rapport brut SHA `a63c246c80ef90933e906569c6a72c01c505ded01e9b829e6f434b25d03b879b` ; reçu de relecture SHA `8e111b88bf558168cc83d9b566ea797f075bce93cd7ad78044d0bbef4bf3365f`. Tous les contextes appartenant à ce runner sont fermés. Aucune source app/test n’a été changée par ce recontrôle ; build global, régression finale du candidat3 et publication/READY/13captures HTTPS restent des preuves distinctes à établir par la racine.

## Gates locales du build 4, avant publication

Deux nouvelles recettes sur le Next compilé `http://127.0.0.1:4204` passent leurs contrôles : `chronicle-real-duel-final-next4-local` (5 contrôles, 13 captures) et `chronicle-ui-final-next4-local` (4 contrôles, 20 captures). Leurs 33 nouveaux PNG ont tous été réellement ouverts avec `view_image` et disposent de deux reçus de relecture distincts **PASS_WITH_LIMITS**. Les anciens pixels et rapports restent inchangés. Les 14 sources du duel et les 10 sources UI sont identiques avant/après ; toutes deux incluent `app/globals.css`, SHA disque `12d12cdfd3f75e7a1196d7b4d5424787e7f770344c5d0c7428de94156948ed75`. Cette liaison ne signifie pas qu’un toast global a été déclenché dans cette recette.

Le premier match Greyback contre Warrior est une vraie défaite CPU : aucun PV, position, phase, horloge ou résultat n’est injecté. Un seul reçu, la sortie explicite, la campagne inchangée et la reprise après rechargement sont vérifiés ; la fin reste verrouillée. MENU et Passer ne se chevauchent pas, le bouton Passer est entièrement visible et aucun pad terminal n’est présent dans ce contexte desktop. Le contexte du duel est fermé.

La recette UI vérifie recherche/pagination, les éditions legacy et V80, les trois intro Greyback et les fins/galeries de Jungle Hunter et Theta. Les fins reposent sur **huit reçus synthétiques par route**, jamais huit victoires navigateur ; la galerie elle-même ne modifie pas le journal. Les réserves visuelles demeurent : longs tableaux avec défilement vertical, petits portraits mobiles et labels des huit duels. Les compositions ne deviennent pas des peintures dédiées ou animations anatomiques dessinées.

Rapport duel SHA `708d1abff6c496243262ebefa9df73c8d386d72ceed81e61e62f45894d70baa7`, revue `9bdb92e1ca784f33034f3eb2e054dd12d9e16c2b711a52af92a098835f0c27b4` ; rapport UI SHA `725397dc720648dfe6bcc312e01600a07e3b6a04513e763e3ba8237a64bb8472`, revue `21daf7adda19c68759ff410707997745442dcf3a24f9897aa05ab2aefa66f456`. Aucun app, test ou helper partagé n’a été modifié par ce recontrôle. La régression globale finale, le commit, le READY production exact et les nouvelles recettes HTTPS restent des gates distinctes à la charge de la racine.
