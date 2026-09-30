# V58 — capteur natif de Falconer

## Périmètre

Le dispositif de reconnaissance de Falconer utilise maintenant deux dessins PNG natifs, un par orientation, à la place de l'ellipse/croix procédurale. Les références visuelles et prompts de génération sont conservés dans le dossier de livraison V58. L'accessoire mécanique du Falconer est documenté par [NECA](https://store.necaonline.com/blogs/news/closer-look-predators-series-7-camo-cloaked-falconer-predator-action-figure).

Ce lot livre **deux poses de vol tenues**, pas un cycle complet d'animation, ni un oiseau organique aux ailes battantes. La pose du côté approprié est utilisée au retour. Le déplacement, le rappel, le marquage et l'identifiant proviennent uniquement du moteur de combat existant. Aucune arme, attaque ou source de dégâts n'a été ajoutée au capteur. La génération d'après références reste une adaptation visuelle à vérifier, pas une certification de fidélité 1:1.

## Import et rendu

`scripts/prepare-falconer-art-v58.mjs` copie les PNG OpenAI sans modifier leurs pixels. Sharp ne sert qu'à mesurer les dimensions et les bornes alpha. Le SHA256 de chaque destination est contrôlé contre les octets d'origine.

| Vue | Dimensions | Rectangle visible alpha > 16 | Pivot corps | SHA256 |
| --- | --- | --- | --- | --- |
| Droite | 1774 × 887 | 40, 99, 1694, 711 | 900, 360 | `0b17a8be5ce4b1b4f363696072fb189382c12864ade044920165b2086d97e1ad` |
| Gauche | 1774 × 887 | 20, 100, 1734, 714 | 880, 360 | `c09c1ae1646ecc223b43275ed68d2955c14c8e7597d17c5b4a213272ce53d107` |

Le rendu emploie une envergure de 72 unités de scène, une échelle constante par côté et le centre du corps comme pivot. Il n'ajoute ni miroir Canvas, rotation, oscillation, pulsation lumineuse, modification de teinte ou horloge indépendante. La pause et le mouvement réduit n'introduisent donc pas de déplacement décoratif parasite. La boîte de diagnostic du laboratoire est inchangée.

Le chargement vérifie les deux pages, leurs dimensions et la présence de transparence avec une marge sur les bords. Si une page échoue, le combat et sa présentation restent suspendus. Un bouton explicite réessaie le chargement ; il n'existe pas de substitution géométrique silencieuse ni de capteur invisible pendant le combat.

## Qualification

Les sept tests dédiés couvrent les octets natifs, les bornes alpha, les pivots, les deux directions, les poses tenues, l'absence de mutation du combat, les archives de dispositifs historiques, le chargement annulé/en erreur/expiré, le décodage des PNG réels et le rejet de dimensions incorrectes. Les trois tests de raccord d'interface passent également.

La recette navigateur `scripts/verify-falconer-art-v58.mjs` observe passivement les appels `drawImage` de quatre duels réels (deux positions de joueur, avec et sans mouvement réduit). Elle vérifie le rappel du même identifiant, la pause, les deux sources natives sans miroir, les points de vie et les sauvegardes inchangés. Un contexte séparé simule une panne HTTP503 sur une page, vérifie le verrouillage du combat puis le rétablissement via le bouton de reprise. Son exécution et la revue de captures doivent être consignées après passage sur le candidat V58.

Premier passage Vinext local sur le candidat intermédiaire `http://127.0.0.1:4177` : cinq groupes réussis, quatre duels plus panne/reprise ; zéro erreur JavaScript/console et zéro erreur HTTP inattendue. La panne contrôlée503 bloque le combat à la frame0, puis le bouton rétablit les deux vues et le duel. Les dix captures de `work-local/v58/qa/falconer-local` ont été inspectées : capteur métallique lisible, taille et ancrage stables au départ, au retour et avec mouvement réduit. Ce passage ne vaut pas contrôle du build définitif ni publication.

Le second passage sur le build Next `http://127.0.0.1:4178` confirme ces cinq groupes et dix nouvelles captures inspectées (`work-local/v58/qa/falconer-next-final`). Les deux pages natives sont réellement dessinées dans chacun des quatre duels ; même identifiant au rappel, aucune transformation miroir, pause et sauvegardes inchangées, panne/reprise validée. Zéro erreur JavaScript/console et HTTP inattendue. Ce build inclut la compatibilité moteur historique ; une correction ultérieure du seul texte d'annonce de Feral ne concerne pas ce parcours Falconer. La publication publique reste une étape distincte.

Le candidat de publication définitif, après correction des annonces historiques et des impacts masqués par les gains de Traque, repasse les quatre duels et la panne/reprise : `work-local/v58/qa/falconer-next-publish-candidate/report.json`. Les dix captures restent disponibles. La qualification globale définitive comporte 1 852 tests réussis ; aucun rendu procédural du drone n'a été réintroduit.
