# QA V85 — intégration et publication

Rapport du 7 octobre 2026, établi à partir des résultats transmis par les agents et la racine. Ce document distingue les contrôles ciblés après correction, la régression globale antérieure et les observations navigateur. Sa création ne lance aucun nouveau test et ne modifie aucun code.

## Résultats ciblés après correction

| Groupe | Résultat transmis | Portée et limite |
| --- | --- | --- |
| Intégration Homeworld V84/V85 | 11/11 PASS | Circulation des trois intérieurs portuaires et du salon clanique, décors/collision V84, routines, marche native, correspondances de portraits et cartes de référence. Modèle et rendu serveur ciblés. |
| Vie et activités des villages | 35/35 PASS | Routines, approches d’activités, portes, destinations et limites préexistantes. |
| Trajets civils historiques | 1/1 PASS | Test existant des 98 trajets, 14 extras, 43 approches de portes et 14 paliers. |
| Navigation du monde V77 | 2/2 PASS | Trajets multi-niveaux, 43 portes et dix retours régionaux avec contrôle des segments pour le corps complet. |
| **Sous-total Homeworld** | **49 tests réussis** | Somme des quatre groupes ci-dessus ; ne vaut pas résultat de la suite globale. |
| Clans | 28/28 PASS | Groupe ciblé transmis par l’agent clans. |
| Navires | 10/10 PASS | Groupe ciblé transmis par l’agent navires. |
| Contrats | 35/35 PASS | Fixtures d’approche actualisées ; assertions d’accès aux donneurs et obligations conservées. |
| Entrées et récupération | 45/45 PASS | Groupes ciblés transmis par la racine, incluant les contrôles de restauration et d’entrées. |
| Wayfinding | 10/10 PASS | Guidance et routes utilisant les sources réellement montées ; assertions de corps, destination et niveaux conservées. |
| Découpage du code | 3/3 PASS | Groupe ciblé de découpage transmis par la racine. |

Les lints ciblés signalés par les agents ont réussi. Ils ne constituent pas un reçu de lint global, de contrôle TypeScript ou de build de production.

La racine a ensuite relancé un groupe commun sur les sources figées, incluant le dernier correctif de support naturel : **154/154 tests réussis, zéro échec ou skip, 53,52 secondes**. Il couvre clans, navires, contrats, entrées/récupération, intégration V84/V85, support naturel, wayfinding, découpage et dix tests de chroniques The Pit. Le journal est `work-local/v85/qa/final-targeted-regression.log`. Ce groupe commun n'est ni additionné aux résultats agents qui se recouvrent, ni présenté comme la suite historique entière.

La fixture The Pit contrôle maintenant les quatre dépendances réelles de restauration, dont le stockage isolé, et exige écriture puis relecture identique du même stockage. Aucun garde de propriétaire, annulation, résultat ou remplacement n'est retiré. Le manifeste V85 corrige aussi un accès possible à `networkFailure.message` lorsque la source optionnelle et l'échec sont absents ; le garde de nullité est explicite.

## Régression globale antérieure

Le grand baseline exécuté **avant les corrections** compte **3019 tests : 2903 PASS et 116 FAIL**. Ce résultat reste un état antérieur. Les succès ciblés ci-dessus ne permettent pas de déduire le résultat d’une nouvelle exécution complète : **la suite globale finale n’est pas déclarée verte** dans ce rapport.

Les 116 échecs ne sont pas tous classés comme obsolètes. Les agents ont distingué des défauts physiques corrigés, des fixtures qui ne représentaient plus le runtime et des attentes de composition anciennes laissées en échec. Les assertions physiques n’ont pas été réduites pour obtenir les résultats ciblés.

## Corrections de modèles et de fixtures

Les corrections Homeworld dégagent les approches publiques des trois intérieurs portuaires sans supprimer de meuble, service ou preuve : 15 zones fonctionnelles, 45 instances de mobilier, 7 cloisons et 10 repères de traversée sont conservés. Les zones de fonction incluent leur approche publique ; elles ne constituent pas des murs supplémentaires. La console V84 conserve sa position 134/190 et son échelle ×1. Le salon clanique conserve l’hôte et la table ; son rack de visite a été déplacé dans l’alcôve de repos pour dégager l’accès.

Le trajet `resident-v69-forges-2` était réellement bloqué par le banc historique `exterior-v76-067`. Son arrêt a été ramené à 2695/2880, avant le banc, en conservant le départ 2695/3032, l’identité, la tenue et la vitesse. Le test original des 98 trajets repasse après cette correction.

Les douze placements extérieurs V84 donnent **dix objets montés et deux refus** dans le modèle actuel. Les refus du râtelier des maîtres et du brasero de mémoire restent explicites : ils ne deviennent ni dessinés ni solides. Une compilation répétée conserve le même résultat sans comparer un objet à sa propre collision déjà montée.

Le contrôle visuel de la racine a révélé une autre régression : les racines des décors naturels, placées volontairement hors sol public, n'avaient plus d'appui dessiné après la réduction du sol naturel à une marge de 22 unités. La scène V77 dessine maintenant des promontoires par formation source, ancrés à un bord public existant, avec texture de cendre répétée en coordonnées monde et faces rocheuses natives. Les 392 placements et 374 origines historiques restent inchangés. Ces appuis sont uniquement visuels et n'entrent jamais dans les terrains praticables ou collisions. Deux tests vérifient leur couverture, leur ancrage et leur absence aux autres étages. La comparaison CUA avant/après autour de 3960/5290 confirme que les végétaux et évents ne flottent plus devant le ciel dans cette vue.

Les fixtures de contrats utilisent désormais le point d’approche intérieur existant au lieu d’un décalage fixe de 45 unités devenu bloqué par l’aménagement. Les contrôles de circulation vérifient que les donneurs restent accessibles depuis le spawn ; leurs positions et règles ne sont pas déplacées par les tests.

Les fixtures d’entrées et de récupération respectent la véritable hydratation différée de l’ascenseur V83 : callbacks RAF simultanés, annulation et propriétaire de sauvegarde. Une sauvegarde remplacée avant le RAF ne déclenche pas la restauration de l’ancien propriétaire ; l’état reste non prêt jusqu’au RAF du bon propriétaire. Les assertions de refus durable, file d’attente, focus, Solo et jeunesse sont conservées.

Les trois boucles extérieures de wayfinding consomment l’Atlas V83 et les routes V77 effectivement montés. Les métadonnées narratives V75 sont conservées, ainsi que les tests V75 d’intérieurs, de règles et de guidance. Pour `personal-ship`, le centre exact du marqueur reste vérifié, mais la route finit sur l’approche publique à +55 unités plutôt que dans le centre solide de l’objet ; l’identité retournée par `nearestHomeworldPointV77` reste vérifiée. Aucun obstacle ou modèle de monde n’est retiré par cette adaptation de fixture.

## Anciennes compositions non rebaselinées

Les attentes suivantes ont été identifiées sans modifier leurs comptes pour masquer un défaut :

- La collection naturelle actuelle compte 392 entrées contre l’ancien attendu 394, avec 374 origines préservées et 18 éléments actuels de quai. Les contrôles des origines et des silhouettes hors plateforme/navette réussissent ; ce constat de compte ne remplace pas un contrôle de circulation.
- L’ancien pupitre `civic-v80:trophy-mausoleum:left:0` ne figure plus parmi les candidats de la composition V81 actuelle. Le catalogue civique actuel en compte 19 contre les 113 de l’ancienne génération V80. Il ne s’agit pas d’un refus tardif V84 ; l’ancienne assertion d’origine reste incompatible avec cette composition.
- Le point 7340/5075 porte actuellement le libellé « Quai du retour des chasses », contre l’ancien attendu « Halte du quai oriental ».

Ces écarts restent documentés et ne rendent pas verte la régression historique complète. Aucun défaut physique sérieux connu ne subsiste dans les seuls intérieurs et trajets couverts par les contrôles ciblés transmis.

## Contrôle navigateur et observations réelles

Le contrôle CUA a été effectué sur une **largeur desktop réelle de 1063 pixels**. La tentative de demander un viewport de 390 pixels n’a pas modifié efficacement la surface observée. **Le mobile n’est donc pas validé** ; les observations desktop ne lui sont pas transposées.

| Observation | Résultat et portée |
| --- | --- |
| Archives consultées | 19 images observées, 0 image cassée dans cette vue. Ce contrôle ne certifie pas toutes les images ou tous les imports du projet. |
| Panneau spoiler | Escape ferme le panneau et rend le focus au déclencheur. |
| Reconnaissance `W3K02` | Résultat observé : RAV 10, fatigue 10, XP 4. |
| Lecteur de navire | 730 scènes rendues dans un composant serveur isolé. Ce contrôle ne prouve pas une arrivée de navire dans la campagne ni le parcours campagne complet. |
| Nouvelle partie et reprise locale | Partie QA créée dans le slot 5 alors que les cinq slots étaient vides. Après rechargement du build Next de production, « Continuer » reprend cette partie et affiche réellement « Un jeune du clan » dans le prologue. Aucun slot public utilisateur n'a été modifié. |
| Checkpoint manuel local | Écriture de la manuelle 1 confirmée. Une seconde activation affiche l'avertissement de remplacement ; Annuler conserve le checkpoint. Sauvegarder et revenir au titre retrouve la partie 5. |
| Persistance entre outils V6 | Après passage et observation à W3-K02, aller au calculateur puis revenir à la reconnaissance conserve tour 3, stock 10/12 RAV, fatigue 10 et XP 4. |
| Vue réelle Homeworld isolée | Extérieur des quais et intérieur de contrôle observés avec Hub, géométrie et PNG réels ; 27 images DOM chargées dans l'intérieur, zéro cassée et aucun débordement horizontal. Fixture en mémoire, callbacks sans sauvegarde utilisateur. CSS modules réel ; globals.css brut sans pipeline Next/Tailwind complet : ce n'est pas une arrivée de campagne ni une preuve du Homeworld public entier. |

Le navigateur présente des erreurs `FILE_ERROR_NO_SPACE` dans son stockage Chromium, également remontées par une extension. Le disque C possède pourtant environ 30,9 Gio libres lors du dernier relevé. Cela reste une limite d'environnement non résolue ; ni console sans erreur, ni persistance exhaustive du profil, ni synchronisation mobile/ordinateur ne sont certifiées. Le rechargement réussi ci-dessus est une observation précise, pas une preuve de tous les cas de stockage.

## Limites des assets et des représentations

Les portraits récents sont des dessins statiques avec provenance et statut de source. Les références de village portent un clan et un métier documentés ; elles ne prétendent pas identifier le visage personnel d’un habitant. Elles ne remplacent ni les corps modulaires, ni les costumes, ni les cellules natives de marche. Une correspondance incertaine ne déclenche pas de substitution aléatoire ou de canonisation.

Les clips sociaux de discussion, maintenance, manutention, salutation ou port de colis demeurent absents. Les haltes et leurs libellés de métier n’affirment pas qu’un geste non dessiné est animé. Les sources provisoires ne deviennent pas des combattants complets, des clips ou des reproductions 1:1 certifiées.

Les tests de modèles et de rendu serveur n’établissent pas la fidélité visuelle canonique, les pixels, toutes les caméras, les performances ou le gameplay public. Le contrôle desktop décrit seulement les observations précisées ci-dessus.

## Publication — à compléter par la racine

Cette section est réservée aux preuves finales de la racine. Aucun build, PUSH ou état Vercel READY n’est déclaré acquis par ce document.

| Étape | Preuve finale |
| --- | --- |
| Typecheck global | `tsc --noEmit`, exit 0 ; journal `work-local/v85/qa/typecheck-final.log`. |
| Lint des fichiers modifiés et nouveaux | Exit 0, comprenant les TS/TSX et fixtures MJS du lot. Ce contrôle n'est pas un lint du dépôt entier ; journal `work-local/v85/qa/lint-final.log`. |
| Build de production | Next 16.3.5 `build --webpack`, TypeScript, pages et traces terminés, exit 0 ; vérification CSS compilé The Pit PASS, y compris après correctif naturel ; journal `work-local/v85/qa/next-production-build-final.log`. Le manifeste audio régénéré est inchangé : 37 slots, 22 fournis. |
| État final de la régression globale | Non relancée intégralement après gel. 154/154 ciblés finaux PASS ; le baseline historique pré-correction reste distinct. |
| Commit de l'intégration V85 | `0cf87a5ff1b339b1fa05949c428f5dbbd034aefd` ; le correctif naturel suit dans le commit portant cette mise à jour du rapport. |
| PUSH GitHub | Intégration V85 confirmée sur main et la branche de travail au SHA ci-dessus. La livraison suivante sera vérifiée séparément. |
| Déploiement Vercel | Preview `dpl_7btXGMeuZiteZSg2u5iSffACWPKg` READY sur `0cf87a5`, production de ce même SHA encore BUILDING lors de la rédaction. Cela n'est pas une preuve de publication du correctif naturel. |
| Contrôle public | À compléter séparément : HTTP/assets, parcours réellement observés et limites restantes. |
| Contrôle mobile | Non validé dans le contrôle CUA décrit ici ; à compléter après une observation mobile réelle. |
