# ROU112-06 — choisir un repos avant épuisement

Le parcours fonctionnel est réussi dans le vrai GameClient et HuntCanvas depuis l'insertion canonique de jungle-vey. Le guide distingue textuellement la route au sol, l'appui et le support souple ; le chasseur choisit ensuite une vraie plateforme de repos avec une endurance positive et y récupère. **Cette preuve ne remplace pas l'étude de cinq novices FUT112-11 / REM112-01.** Aucune compréhension humaine n'est déclarée.

Source applicative : `e4a6c64a1e77edad8865aa05ca7c2901d62bfa09`. [Rapport brut](report.json), avec admission, états observés, commandes et identités des assets. Le navigateur portable Chromium 154.0.8037.57 emploie les dépendances verrouillées existantes. Serveur sur port éphémère, contexte isolé, profil Sites portable ; navigateur et serveur ont été fermés à la fin.

## Parcours effectivement exécuté

```sh
node scripts/qa-hunt-canopy-choice-browser-v112.mjs \
  --output outputs/qa-hunt-canopy-choice-v112/attempt-r1 --wall-seconds 300
```

L'admission est exactement defaultSave du 2 novembre 2026, sans progression ajoutée. Les vrais boutons Continuer, Navigation, les trois trajets d'autopilote avec Entrer, Préparer la chasse, Départ rapide et Commencer la chasse ouvrent HuntCanvas. L'unique injection expose une copie JSON de l'état ; elle n'écrit aucun champ. Les commandes passent par page.keyboard et les vrais listeners du produit.

1. Insertion observée à (225,508), quatre ennemis actifs, 160 PV et 100 endurance. Le guide développé est visible avec l'art d'origine dans [la capture d'insertion](01-canonical-insertion-guide.png).
2. Le camouflage est activé par la touche native C avec sa réserve finie, puis Droite mène réellement au pied de l'arbre V112, centre x=2360. Haut (flèche) saisit cette prise et fait monter le chasseur. Aucun ennemi ni obstacle n'est déplacé ou supprimé.
3. À t=16.40 s observées, pieds à 249.12, le chasseur est sur la prise native `v112-canopy-jungle-vey-0-0-grip` avec 95.05/100 endurance. Le pilote choisit la branche de repos avant épuisement, relâche Haut puis utilise brièvement Droite pour quitter la prise rigide. [Choix de repos](02-rest-choice-positive-stamina.png).
4. À t=17.50 s, une vraie réception donne grounded=true, pieds y=270 et recouvrement horizontal du repos `v112-canopy-jungle-vey-0-0-rest`, rectangle (2295,270,130,18). L'endurance vaut 97.52. [Contact sur la branche](03-authored-branch-contact.png).
5. En restant sur cette branche, l'endurance passe de 97.52 à 100.00 entre t=17.50 et 18.20 s. [Récupération et guide développé](04-rest-recovery-route-support-flexible-guide.png), puis [scène finale](05-terminal-native-scene.png).

L'endurance minimale échantillonnée vaut 93.35/100. Les quatre ennemis restent vivants et actifs ; aucun ennemi n'est tué. Les dégâts natifs font passer la santé de 160 à 143.68 ; les trois Medicomps restent disponibles. Aucune invulnérabilité, santé, énergie, endurance, position, géométrie ou prise n'est ajoutée par le harnais. L'invulnérabilité temporaire visible après certains coups provient du mécanisme natif de dégâts.

Les temps des commandes sont ceux de la dernière lecture ayant motivé la décision, pas des horodatages exacts de dispatch clavier. La simulation continue pendant les captures ; le rapport conserve cette limite. Les temps des contacts et la récupération sont des états effectivement relus. Le parcours va jusqu'au premier repos ; il ne prétend pas traverser les six plateformes ni saisir la liane suivante.

## Indications réellement affichées

Le HuntFieldGuideV112 natif, activé par défaut, affiche « Choisis une prise et un point de repos […] La route au sol reste possible ». Ses détails développés distinguent :

- « Prendre appui » près d'un arbre, d'une liane, d'une corde ou d'une chaîne ; une décoration seule ne permet pas de grimper.
- « Traverser » sur arbre avec direction+saut et, sur support souple, pompage, longueur et lâcher avec élan.
- « Récupérer » sur un vrai support, éviter de vider l'endurance, puis utiliser plateformes de repos ou route au sol pour se replier.

La capture pleine page de récupération montre dans le même document ce texte, le chasseur posé sur la branche et les prises suivantes dessinées avec les assets référencés par le moteur. La liane voisine existe dans l'état natif, centre x=2540, hauteur 250 ; sa présence n'est pas revendiquée comme une saisie effectuée. Aucun label Canvas « repos » ni flèche de route V112 n'a été ajouté. Le FirstHuntGuide distinct continue de suivre la piste de campagne. Le viewport de test mesure 1280×900 ; la capture04 mesure 1280×1939. Guide développé et scène y figurent dans la capture pleine page, mais ne sont pas simultanément dans le viewport courant.

Le message contextuel pendant toute grimpe parle de la liane et du balancement, y compris sur l'arbre rigide ; le détail développé fournit la distinction arbre/support souple. La branche de message « endurance basse » n'a pas priorité sur ce message de grimpe. Cette observation est conservée sans la transformer en résultat de compréhension novice.

## Vérifications et limites

Les huit critères fonctionnels du rapport sont vrais, aucun pageerror ni asset manquant n'est observé ; 190 ressources servies correspondent à leurs blobs Git. Le code passe node --check et ESLint. Le manifeste de ce dossier conserve les empreintes du script, du rapport et des cinq captures natives.

Cette vérification automatique établit la possibilité fonctionnelle observée et la présence des indications. Elle ne qualifie ni novices, lecture humaine des affordances, téléphone, manette physique, performances, parcours de canopée complet ou campagne complète. Aucun fichier applicatif, ancien rapport, asset ou classeur n'a été modifié.
