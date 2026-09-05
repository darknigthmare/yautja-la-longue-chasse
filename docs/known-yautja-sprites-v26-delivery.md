# Livraison partielle des sprites Yautja V26

Demande : tous les Yautja connus et leurs animations complètes, dans un seul lot de travail. Le lot complet n'est pas atteint.

Treize appels réels à la génération OpenAI intégrée ont été effectués, sans API ni clé. Huit planches ont été conservées pour huit personnages : Jungle Hunter, City Hunter, Wolf, Celtic, Scar, Falconer, Feral et Berserker. Elles représentent cinquante cellules, pas cinquante animations. Le premier Berserker est également conservé comme essai rejeté avant correction.

Les sources PNG, prompts exacts, références et revues de chaque cellule sont sous art-source/v26/known-yautja. Les fichiers automatiques de génération étaient vides ; les octets renvoyés ont été sauvegardés, assemblés, décodés et contrôlés par SHA-256. Aucun ancien portrait n'a été remplacé.

## Ce qui a été corrigé ou refusé

- Damier de fausse transparence et rangée manquante : essais refusés.
- Jungle : guide de marche supplémentaire ; alternance des jambes encore incorrecte.
- City : reprise de la continuité de lance et des prises ; débordement et longueur apparente restent ouverts.
- Berserker : cellule d'armement redessinée pour réaligner lame et gantelet ; cadrage à reprendre.
- Celtic : une percussion devient un coup de poing, donc séquence refusée.
- Scar : manipulation et côtés du gantelet incorrects, séquence refusée.
- Falconer : résille et équipement non conformes, séquence refusée.
- Wolf et Feral : séquences de défense lisibles, mais ancrages, contours et fidélité détaillée ne sont pas encore validés.
- Une frange magenta demeure après le rendu par couleur clé. Elle interdit une validation artistique automatique.

## Vérification réelle

Le contrôle de lot constate huit PNG sélectionnés totalisant 15 534 012 octets, plus un ancien Berserker rejeté. Les cinquante cellules ont été affichées dans Chrome ; lecture, pause, avance et affichage mobile sans débordement de page ont été vérifiés. Aucune erreur JavaScript observée dans le lecteur.

Treize tests du lecteur, le typecheck et le lint ciblé passent. La suite de régression existante, exécutée avec les nouveaux tests, passe également : 865/865. Aucun nouveau build complet ni déploiement du jeu n'a été effectué pour ces essais. L'inventaire exhaustif est reproductible. Ces réussites techniques ne rendent pas les sprites commercialement prêts.

Aucun clip n'est déclaré validated ; aucun personnage n'est complete. Les sprites rejetés ne sont pas chargés dans le jeu publié. Le PIT et la chasse ne changent pas de rendu dans cette livraison.

## Travail restant

Compléter toutes les actions, postures, directions et variantes de chaque individu, conformément à hunter-sprite-animation-contract-v26.md. Le roster entier reste suivi dans roster.json : 214 fiches individuelles correspondent à 215 designs catalogue, auxquels s'ajoutent variantes, archétypes et entrées à identifier. Les 264 lignes de suivi ne signifient pas264 individus canoniques distincts.

La multiplication des planches en une seule génération n'a pas assuré la cohérence anatomique, la géométrie ni le cycle complet. Le volume de forfait n'est pas la preuve de validation d'un asset. La prochaine production doit repartir de la correction des cellules signalées, puis étendre seulement les séquences conformes.

Le lecteur autonome et le ZIP des sources sont dans outputs/known-yautja-v26. Les sources sont conservées pour poursuivre sans refaire les recherches ni perdre les corrections déjà tentées.
