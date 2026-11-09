# Navigation Gamepad et dialogues natifs

Le hook de production `useMenuGamepad.ts` reconnaît maintenant les vrais
`dialog[open]:modal`, même sans attribut `role` explicite. Le modal contenant
le focus a priorité sur l'ordre des nœuds DOM. Ses contrôles seuls reçoivent
les directions et la confirmation.

Retour appelle `requestClose()` sur ce modal et respecte son événement natif
`cancel`, y compris un refus de fermeture par le propriétaire React. Une
pression maintenue ne ferme pas le dialogue suivant et ne quitte pas le menu
racine. Les anciens dialogues `role="dialog" aria-modal="true"` conservent
leur callback Retour existant. Les propriétaires `inert`, cachés ou désactivés
restent protégés, même si le navigateur permet au modal natif d'échapper à
l'inertie de son ancêtre.

## Vérification effective

[Reçu final](attempt-1/final-receipt.json) : **13 contrôles navigateur réussis**,
21 régressions existantes Node 22 réussies, lint ciblé sans avertissement et
deux captures originales ouvertes.

La fixture monte le **vrai hook React** et de vrais dialogues natifs. Seul
`navigator.getGamepads` est remplacé par un fournisseur d'entrée synthétique,
déclaré dans la recette. Les horloges RAF, le focus, les annulations natives et
les résultats DOM ne sont pas simulés. Aucun réducteur de jeu, sauvegarde ou
résultat de campagne n'est présent.

Les contrôles couvrent deux modaux ouverts dans l'ordre inverse de leur ordre
DOM ; direction/confirmation dans le bon modal ; Retour, maintien et retour du
focus ; annulation refusée ; parent imbriqué `inert` et racine `inert` ; reprise
exigeant un nouvel appui ; ancien dialogue ARIA et Échap clavier.

Le fallback `cancel` annulable, destiné aux navigateurs sans `requestClose`,
est implémenté mais n'a pas été exercé sur le Chromium observé, qui possède
l'API native. Aucune manette physique ni intégration Next/GameClient complète
n'est certifiée par cette fixture.

Pour rejouer, utiliser Node 22 avec
`scripts/qa-menu-native-dialog-20261109.mjs` et un nouveau dossier vide via
`COMMAND_GAMEPAD_OUTPUT`. Les preuves de la première tentative sont protégées
contre l'écrasement par son fichier de verrouillage.
