# V107 — dix-huit poses alternatives Enforcers

Les dix-huit PNG sont de nouvelles poses statiques des identités `*--enforcers-comics-10`, déjà livrées par la PR15. Ils ne créent aucune identité supplémentaire et ne remplacent ni les PNG V6.14, ni les dix-huit jeunes enfants V6.15. Leur production avait commencé depuis le master V6.13 avant la découverte du lot parallèle ; tous les fichiers sont conservés dans des chemins distincts.

Le registre `app/game/data/enforcerAlternativesV107.json` ajoute le pack « Enforcers · poses alternatives V107 » à la bibliothèque et au codex. Sa priorité46 préserve les973 choix automatiques épinglés dans le suivi V6.13. La frontière humaine et les restrictions de choix automatique restent testées. Aucun placement de campagne, kit, nouvelle apparence de combat ou animation n'est déduit d'une pose.

Chaque image native1024×1536 RGBA a un reçu dans `docs/suivi-production/v107-enforcer-poses/receipts`, avec le prompt effectivement soumis, l'identifiant du résultat, son SHA256 et sa taille. Les fichiers sont copiés sans modification des pixels. Le service ne fournit pas d'heure exacte de génération ; ce champ reste nul. Les références de costume seulement planifiées ne sont pas présentées comme des entrées réellement soumises.

Deux premiers essais ont été refusés : appui digitigrade insuffisamment lisible pour Assassin, cinquième bras pour la lignée Quatre-Bras. Les originaux refusés et leurs empreintes sont conservés sous `art-source/v107/enforcer-poses` ; ils ne figurent pas dans le catalogue. Les reprises ont été ouvertes et inspectées : talons relevés/métatarses pour Assassin ; quatre bras, quatre mains et deux jambes pour Quatre-Bras. Les détails cachés par le masque ou les protections ne sont pas certifiés1:1.

Les dix-huit silhouettes visibles restent entièrement dans leur cadre. La marge vide souhaitée n'est pas atteinte sur tous les côtés de chaque image ; le manifeste conserve les mesures effectives, sans transformer cet objectif en réussite. Il s'agit de variations originales du projet, sans certification canonique générale.

Vérifications : `node --test tests/enforcer-alternatives-v107.test.mjs` contrôle les973 choix, le codex, les reçus, les SHA, le décodage natif, l'alpha et les essais refusés. `node scripts/qa-enforcer-alternatives-v107.mjs` vérifie les octets HTTP et le décodage navigateur sur l'origine de la compilation commune ; ses planches de contact sont une fixture d'inspection, pas la preuve d'un parcours dans la galerie de production.

Les21 reçus finaux V6.13 et les36 traces PNG V6.10 historiquement manquants ne sont pas récupérés par cette production. Une comparaison SHA de253 fichiers du répertoire natif de la session n'a trouvé aucune correspondance avec ces fichiers recherchés.
