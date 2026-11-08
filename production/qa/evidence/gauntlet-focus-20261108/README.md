# Attendre le focus de la recette des gantelets

Le run V136 `42504679518`, job `128804635727`, a exécuté le merge de contrôle
`812174945af0451fbc5fe3ce6afa90761a347b94` : tête `d68bc7e9` dans la base
`254b4b97`. La recette `qa-gauntlet-browser-v137.mjs` a consigné ses neuf
contrôles réussis et zéro erreur de page, puis le processus a échoué pendant
la fermeture du navigateur avec une promesse de focus encore en attente.

[Journal du job](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42504679518/job/128804635727).
L'erreur pointe exactement la ligne 80 : `locator.focus: Target page, context
or browser has been closed`, en attendant le bouton « Ouvrir les capots ».
Ce résultat demeure un échec de processus, même si le manifeste d'interface
avait déjà enregistré neuf contrôles réussis.

Le correctif ajoute uniquement `await` devant cet appel de focus. La touche
Entrée attend désormais que le bouton soit effectivement focalisé ; elle peut
ensuite changer son libellé en ouvrant les capots. La promesse ne reste plus
en vol jusqu'à la fermeture. Un éventuel échec du focus remonte au point
d'action. Les sélecteurs, les neuf contrôles et leurs assertions sont conservés.

La revue indépendante confirme cet ordre. La syntaxe JavaScript et le lint
strict passent. L'inventaire courant passe aussi dans l'arbre local C-37
`2eb59ba0`, sans régénération. Ces contrôles locaux portent sur la recette
commune aux deux PR ; ils ne constituent pas une exécution navigateur du
correctif. La nouvelle CI sur la tête publiée doit encore l'exécuter.

Le [reçu](verification.json) conserve les commandes, les empreintes avant/après,
le [journal original compressé](failure-job.log.gz) et le
[manifeste original du navigateur](failure-browser-manifest.json). Le journal
est compressé sans modification de ses octets. Aucun nouveau test unitaire
n'est ajouté pour cette correction d'ordonnancement d'un mot.
