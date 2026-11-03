# Préparation de la recette HTTPS V79 — 3 octobre 2026

Cette préparation ne lance aucune navigation publique. Le SHA V79 et la confirmation Vercel READY restent attendus de l'agent qui publie. Les trois recettes locales Next4202 sont PASS et les31captures ont été ouvertes ; aucun blocage visuel supplémentaire concret n'a été trouvé sur leur périmètre. Elles ne prouvent pas le futur alias HTTPS.

Les runners sont sous `work-local/v79/qa/`. Ils imposent V79 dans le vrai GameClient, un nouveau dossier de sortie, de nouveaux contextes incognito sur Chrome QA CDP58677 et aucune lecture/écriture de sauvegarde d'un contexte utilisateur existant. Les états de pont et les sept checkpoints restent des fixtures initiales déclarées, pas une campagne terminée ni des déplacements injectés pendant le jeu.

En HTTPS, ils refusent un SHA absent, un READY absent/futur, une autre origine, un aperçu de composant et des sources locales différentes du commit annoncé. Les empreintes brutes Windows sont conservées ; le rapprochement avec les blobs Git normalise uniquement CRLF vers LF et le dit explicitement. L'association du commit au déploiement est la preuve de publication fournie par l'agent root, pas une déduction du libellé V79.

Chaque erreur JS/console, HTTP>=400 ou panne réseau autre que l'annulation exacte `net::ERR_ABORTED` bloque. Les annulations restent enregistrées. La recette chasseurs attend désormais aussi le décodage des miniatures visibles de la page choisie ; elle ne certifie pas les187stages.

Après SHA/READY, remplir les valeurs annoncées puis lancer les trois commandes séquentiellement, quand le Chrome QA n'est plus utilisé par l'autre agent :

```powershell
$env:V79_QA_BASE = 'https://yautja-la-longue-chasse.vercel.app'
$env:V79_FRAMEWORK_KIND = 'real-public-production-GameClient'
$env:V79_CANDIDATE_ID = 'v79-source-public'
$env:V79_EXPECTED_SOURCE_SHA = 'SHA_EXACT_FOURNI_PAR_ROOT'
$env:V79_PUBLIC_READY_AT = 'DATE_UTC_READY_OBSERVEE_PAR_ROOT'
$env:V79_PUBLIC_DEPLOYMENT_ID = 'DEPLOIEMENT_CONFIRME_PAR_ROOT'
$env:V79_QA_OUTPUT = 'work-local/v79/qa/chronicles-gameclient-v79-public'
node work-local/v79/qa/verify-chronicles-gameclient-v79.mjs
$env:V79_QA_OUTPUT = 'work-local/v79/qa/reference-hunters-v79-public'
node work-local/v79/qa/verify-reference-hunters-gameclient-v79.mjs
$env:V79_QA_OUTPUT = 'work-local/v79/qa/homeworld-native-props-v79-public'
node work-local/v79/qa/verify-homeworld-native-props-v79.mjs
```

Relecture réelle attendue :19images GameClient/prologue/chronique/duel,5images chasseurs,7images Homeworld. Aucun reçu local n'est réutilisé. Après ouverture des31nouvelles images avec `view_image`, fixer `V79_VISUAL_REVIEW_COMPLETED=1` puis lancer `write-v79-public-visual-receipt.mjs`. Il produit une seule fois `work-local/v79/qa/v79-public-visual-review.json`, SHA-bound, avec dates réelles post-READY, empreintes des bruts et captures, V79, sources stables et zéro erreur bloquante. Il refuse d'écraser ce reçu.

Réserves conservées : deux poses fixes, première défaite Greyback réellement jouée seulement, lecture Theta mobile, checkpoints d'observation, façade translucide devant l'archive, façades/sol répétés et cours encore peu habillées. Aucune ville complète canon1:1, fin de campagne, victoire fabriquée, synchronisation de compte ou animation complète n'est déclarée.
