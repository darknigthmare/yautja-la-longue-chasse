# Protocole de preuve Homeworld V111

Les outils V111 sont distincts des outils et certificats V110 publiés. Le gel conserve toutes les sources applicatives actuelles, la configuration héritée, les 398 entrées publiques historiques inchangées, les dépendances transitives réelles de la recette et les outils de publication V111. Tout nouvel asset doit figurer avec sa taille, son SHA256 et sa provenance dans `docs/v111-runtime-public-inputs.json` ; aucun asset historique ne peut être remplacé par cette déclaration.

La recette complète `scripts/qa-homeworld-continuation-v111.mjs` contient quatre parcours :

- **Continuation** : un B vide est joué jusqu’au rapport par des interactions et déplacements clavier réels, puis la nouvelle approche A, ses accords, son bord manquant, son écart, sa reprise et son fragment sont joués. Le B original reste comparé octet pour octet, y compris après Continuer. Dans le dialogue visible, les quatre nouveaux PNG natifs de conversation sont décodés ; deux poses peintes distinctes sont capturées et leur horloge réelle est contrôlée avec perte de focus déclarée et préférence de mouvement réduit. Cette preuve porte sur cet archiviste, cette orientation et ce geste de conversation, sans manipulation d’objet ni clôture du catalogue artistique.
- **Recovery** : le modèle de cargaison prépare réellement les 603 pas de la charge devant une porte ; seul l’ancien checkpoint intérieur erroné est déclaré comme fixture. L’interface joue ensuite consultation, refus de capacité d’enregistrement, nouvelle confirmation, restauration explicite et Continuer. Cette restauration n’est pas une sortie simulée à travers la charge et n’accorde aucune marche.
- **MobileGuide** : un B préparé par le vrai modèle est déclaré comme fixture. La nouvelle approche et le Worker sont joués ; l’arrivée compacte, les options repliées, leur ouverture et fermeture au clavier et les contrôles de 44 pixels sont contrôlés à 390 pixels de large.
- **LegacyA** : le parcours A initial est rejoué depuis un checkpoint vide, sans nouveau reçu de continuation.

La recette utilise uniquement un serveur local. Chaque réponse HTML utilisée conserve son statut, le BUILD_ID recherché et son SHA256. Les erreurs JavaScript, chaque `console.error`, les erreurs de construction/événements Worker et les requêtes échouées restent enregistrés sans filtrage. L’observation Worker ajoute seulement une écoute passive ; elle ne remplace aucun résultat.

Le résultat brut contient les sources avant/après et les PNG originaux de chaque capture avec leurs empreintes. La publication refuse les essais exploratoires, les parcours partiels, les identités contradictoires, les sources modifiées, les erreurs et les captures non ouvertes. Les fichiers sont tous vérifiés avant la création du rapport courant ; le JSON complet est conservé en gzip sans perte.

Les outils ne lancent pas le serveur et ne fabriquent ni build ni validation. Le responsable réalise d’abord un build de production depuis les sources gelées, exécute les quatre parcours, ouvre toutes les images, puis publie avec l’identité exacte :

```sh
node scripts/snapshot-runtime-v111.mjs --write docs/v111-runtime-freeze.json
node scripts/publish-validation-homeworld-v111.mjs \
  --input outputs/qa-v111-production/result.json \
  --opened outputs/qa-v111-production/opened.json \
  --runtimeCommit COMMIT_GELE \
  --buildId BUILD_ID_REEL
```

Les tests `tests/homeworld-evidence-v111.test.mjs` vérifient les refus de certificats incomplets ou réétiquetés, d’HTML contradictoires, de sources modifiées/absentes, de remplacement du gel V110 et de remplacement d’art historique ou de perte de provenance. Ils ne certifient pas des pixels de jeu ni un parcours utilisateur ; seuls les journaux d’exécution et captures réels peuvent le faire.
