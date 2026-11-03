# Carnet R3 — quatre décisions de revue et téléchargements finaux

Le carnet affiche les quatre décisions de l’onglet Reprise : CHA112-02, ROU112-06, ROU112-05 et CHA112-05. Il précise que ces décisions ne proviennent pas du carnet, que les deux revues géométriques autorisent la dépose native de la charge optionnelle sans qualifier un parcours intégral avec charge maintenue, et que les huit critères Restant demeurent ouverts. Les règles et critères atomiques sont conservés.

Le [rapport logiciel R3](carnet-software-report.json) passe dans Chromium 154.0.8037.57 et Node 24.19.0 avec et sans JavaScript. La liste affichée et ses statuts correspondent exactement au journal Reprise ; ses quatre critères correspondent exactement aux règles et acceptations originales. Les six protocoles et neuf objectifs restent lisibles sans JavaScript. Les 45 observations novices sont vierges par défaut, les attestations restent manuelles et aucun critère humain ou matériel n’est automatiquement fermé.

Les téléchargements XLSX/PDF sont exécutés au clic, avec puis sans JavaScript, et comparés octet par octet aux documents livrés. Ils n’ajoutent aucun paramètre ni referrer. La page ne fait aucune requête automatique supplémentaire et n’utilise aucun stockage navigateur. Consentement, révocation, relecture avant export, invalidation après modification et distinction Microsoft Excel / compatibilité restent vérifiés.

- XLSX : 740 369 octets, SHA-256 `39f9470537721b13766bf4436d0f43623e06d1bee8c860ec570a4ab1f4f867ec`.
- PDF : 1 499 808 octets, SHA-256 `32f84c72fc965deb817b640b4cb8b17e837542a2b1dde6ed2a74c053b1461442`.
- Carnet HTML : SHA-256 `65bd83cc3981e35f3ef38b00ae7caab8d0cb57840654d46897928a384a99b0fd`.

La garde des sources confirme que les sept entrées du contrôle sont restées identiques pendant le run. Le [manifeste](manifest.json) conserve leurs empreintes, celles des nouveaux livrables et celles des cinq fichiers R2 : ces derniers sont inchangés. Les captures initiales et R2 restent intactes.

Captures revues : [mobile](carnet-390.png), [bureau](carnet-1280.png), bloc Documents [mobile](carnet-documents-390.png) et [bureau](carnet-documents-1280.png), [page sans JavaScript](carnet-sans-js-1280.png). Les textes et téléchargements sont lisibles aux deux largeurs, sans débordement horizontal.

Commande exécutée, code 0 : `node scripts/qa-qualification-kit-v112.mjs`. Cette recette contrôle uniquement le carnet local et les téléchargements finaux ; elle ne constitue aucun nouveau gameplay, essai humain, qualification d’appareil ou essai Microsoft Excel.
