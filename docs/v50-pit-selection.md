# V50 — sélection immersive THE PIT

## Ce qui change

L’écran des personnages et celui des stages occupent 100dvh. Deux portraits encadrent le roster paginé ; le joueur confirme son combattant, son adversaire puis le décor. Les 195 identités restent distinctes des variantes d’apparence : masque et tenue se changent sur une même case. Les ressources bitmap et les orientations natives existantes sont réutilisées ; aucune silhouette CSS n’est ajoutée.

Le choix des six modes reste dans une barre compacte. Les options secondaires, parcours, catalogue, palettes et replay sont accessibles dans un dialogue natif « Options & parcours ». Start ouvre ce dialogue ; B et Échap le ferment sans sortir de THE PIT. Le clavier reste dans le dialogue et le focus retourne au bouton d’ouverture. Les entrées sont réarmées au neutre après fermeture.

Les erreurs bloquantes de sauvegarde ou de chargement restent visibles hors du dialogue, avec leur action de nouvelle tentative. Les contrôles de confirmation et de retour restent dans un pied fixe ; les listes et contenus secondaires défilent à l’intérieur de leurs panneaux. Le texte agrandi ne reçoit pas de plafond de taille.

## Vérification

- TypeScript, lint et 33 tests ciblés avaient passé avant diagnostic navigateur.
- Le diagnostic du premier build a révélé le toast du hub qui obstruait la confirmation ; GameClient a été corrigé par l’intégration principale.
- Le diagnostic a également révélé la sortie du focus Tab vers BODY à la limite du dialogue, un panorama trop réduit en paysage court et un débordement des variantes à 200 % de texte. Ces trois problèmes ont été corrigés dans les sources.
- Les essais diagnostiques et leurs échecs sont conservés sous `outputs/qa-commercial-audit/v50/selection-*diagnostic*` ; ils ne constituent pas la validation finale.
- Validation finale du build intégré : **16/16 PASS**, aucune erreur JavaScript et aucune réponse HTTP en échec. Rapport : `outputs/qa-commercial-audit/v50/final-selection-browser-qa-run2/report.json`. Le premier essai final, conservé séparément, avait mesuré la géométrie pendant la transition globale `screen-in` de 420 ms. La recette vérifie désormais le toast absent et la confirmation dégagée immédiatement, puis attend la fin de cette seule transition avant les mesures exactes.
- Contrôles : plein écran desktop ; pagination/recherche sans changer l’identité ; dialogue modal et retour du focus ; Start/B ; options Arcade/Circuit/Descente ; variantes Ahab ; Échap du profil ; portrait City Hunter natif gauche sans miroir ; ordre personnages → stage et six plans réels ; lancement du combat/pause ; roster/stage portrait ; roster/stage paysage court ; roster/stage texte 200 %.
- Captures finales inspectées : desktop-roster, desktop-stage, landscape-roster, landscape-stage, portrait-text-200, portrait-stage-text-200. Images des tuiles attendues décodées avant capture ; aucune attente de toast n’est ajoutée à la recette suivie. Les commandes options/retour/confirmation restent atteignables dans les trois formats et avec texte doublé. Le panorama court mesure au moins 72 px ; à 200 %, le contenu complet se consulte par défilement interne.
- Build3 de publication : les **mêmes 16 contrôles ont été répétés, 16/16 PASS**, sans erreur JavaScript/HTTP. Rapport : `outputs/qa-commercial-audit/v50/release-selection-browser-qa/report.json`. Captures adversaire après profil, paysage et texte 200 % inspectées ; pas de décalage reproduit. Le diagnostic séparé `profile-scroll-diagnostic.log` mesure root.scrollTop=0, header.y=0 et scrollY=0 avant/après profil et à l’étape adversaire. Ces répétitions ne s’ajoutent pas au nombre de contrôles distincts.
- Les tests historiques relatifs à cette UI ont été adaptés au nouveau contrat, sans retirer les garanties : **19/19 PASS** (`pit-unit-final.log`). Le retour Échap répété/consommé, le retry durable hors dialogue et l’avertissement d’animations incomplètes restent vérifiés.
- Régression parcours V42 après déplacement des options : **4/4 PASS**, aucune erreur JavaScript ou HTTP. Rapport : `outputs/qa-commercial-audit/v50/final-stage-journey-browser-qa/report.json`. Projection au clavier avec passage réel vers la cour, blocage/récupération d’un décor absent, lecture des replays v6 avec parcours et v5 neutre, sauvegardes inchangées.

## Limites

Chrome local et surfaces tactiles émulées ; API manette virtuelle, pas de certification de matériel physique. La campagne de test est produite depuis les constantes du code dans un contexte isolé, jamais depuis une sauvegarde personnelle. Aucun état de combat, position ou horloge n’est injecté. Cette passe ne prétend pas compléter toutes les animations de tous les chasseurs ni toutes les arènes demandées.
