# OPS-B05 — recette navigateur native du 9 novembre 2026

**52/52 contrôles réussis**, du 9 novembre 2026 à 04:40:34.795 UTC à 04:44:38.186 UTC. Le navigateur a exécuté le véritable `GameClient` de la construction Next de production, servie sur `http://127.0.0.1:3120`. Aucune fixture React isolée ni callback de jeu injecté.

Source Git de départ : `19317af4f6cf05532a8ba56dbfe8f56fc4b225d9`, branche `codex/bible-coherence-20261109`, avec les modifications non committées de B05 déclarées dans les identités du rapport. Build Next : `PUL1NfHFyDlOk1yK5kC_k`. Le résultat qualifie l’arbre de code décrit par ses empreintes ; il ne revendique pas une exécution d’un commit ultérieur.

Commande réellement exécutée depuis la racine, sous Node 22.23.4 :

```sh
CLAN_DIALOGUE_QA_URL=http://127.0.0.1:3120 \
CLAN_DIALOGUE_QA_OUTPUT=production/crew-dialogue-20261109/qa/native/attempt-1 \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
/workspace/.cloud-tools/node22/node_modules/node/bin/node \
  scripts/qa-clan-ship-crew-dialogue-20261109.mjs
```

Chromium 154.0.8037.57, mode headless, mouvement réduit. Exécution hors du sandbox approuvée après diagnostic du crash Chromium `setsockopt: Operation not permitted` dans le sandbox. Le test minimal puis la recette complète ont fonctionné dans ce contexte. Aucun paquet ni configuration de sandbox modifié.

## Ce qui a été parcouru

- Les cinq contextes × six PNJ : preuve manquante, preuve récente, accord, retour d’opération, cercle confirmé. Chaque conversation passe par le contrôle natif du PNJ dans la salle réellement rejointe à pied.
- Six résidents installés par les réducteurs de réaménagement, rencontrés à leur quartier réel sur 320 px, avec un avatar existant unique et aucun ancien acteur dupliqué. Dans ce profil, Veille des Astres se trouve aux soins, Griffe de Fer aux trophées et Suture Noire à l’armurerie ; les trois autres conservent leur salle habituelle.
- Dossiers distants, réserve, suspension et transfert sur une autre coque : aucune parole attribuée à un interlocuteur absent. Une opération spatiale encore active n’invente pas de retour d’opération.
- Dialogue tactile à 390 × 844 et 320 × 844, cible d’écoute d’au moins 44 px, défilement et absence de débordement horizontal. Focus clavier retenu dans le panneau, Échap ferme, focus rendu au pont, nouveau D déplace réellement le chasseur.
- Écoute A et retour B avec l’émulateur explicite `navigator.getGamepads` déjà utilisé par la recette historique. Il ne s’agit pas de matériel physique.
- Perte et retour réels du focus d’onglet (`true→false→true`) après désactivation de l’émulation de focus Playwright via CDP : dialogue masqué durant la suspension, puis disponible au retour. Aucun remplacement de `document.hasFocus` et aucun faux événement de blur.
- Cinquante séquences de consultation avec sauvegarde complète capturée avant/après et octets identiques. Le recrutement explicite séparé exerce le writer normal : révision 27→28, marques et reçus inchangés, nouvel accord enregistré dans la réserve.

Les déplacements produisent 3867 échantillons contrôlés sur le sol praticable des sept salles. Les routes observées ne sautent pas de salle.

## Preuves et empreintes

[report.json](report.json) porte les résultats et l’inspection postérieure des captures. [report.browser-run.json](report.browser-run.json) conserve exactement la sortie initiale de la recette avant l’ajout des seules métadonnées d’inspection. Les résultats runtime et les identités restent identiques.

[fixture-disclosure.json](fixture-disclosure.json) et les huit `initial-*.json` décrivent et hachent les profils initiaux, validés par la véritable frontière d’import. Les `read-only-save-*.json` conservent les 50 paires complètes. `native-recruitment-before-after.json` décrit l’action native d’accord séparée.

Les 207 réponses JavaScript, soit 23 chemins distincts, correspondent octet pour octet aux fichiers `.next` actuels. Les 84 ressources `/game/` demandées n’ont produit aucune ressource manquante. Toutes les observations sont conservées sans filtre : `errors`, `console`, `httpErrors`, `requestFailures`, `missingAssets` sont chacune `[]`.

| Empreinte | Avant et après |
|---|---|
| Sources app/desktop, paquets et recette | `ad5f4c4566b931fe5b994cf9e18dc7a2ca968663422fb2bb7faa2e267dd88176` |
| JS, manifestes et BUILD_ID de `.next` | `850604bf47b641e5fe33b3ed0369721ff9e29a689816317def040228869d247d` |
| Recette exécutée | `e8a8e6e35d7e1c100c27af85e3cf8ffe3dece08b5df275dc7b75645bf69b09c6` |
| Rapport final avec inspection | `5aa1e396155ffca01977d4c97767fc13730815fc1231e16e9f0e030ccb23984b` |

Les neuf PNG d’origine ont chacun été réellement ouverts avec `view_image`. [screenshot-inspection.json](screenshot-inspection.json) conserve leurs empreintes et les observations précises. Répliques, contexte et écoute sont lisibles aux tailles capturées ; aucun recouvrement bloquant constaté. [final-receipt.json](final-receipt.json) lie le rapport final, la sortie brute et l’inspection.

## Limites explicites

Les huit profils sont des sauvegardes initiales synthétiques déclarées : accueil, mandat, contrats intérieurs, résultats jungle/glace, recrutements historiques et, selon le profil, victoire d’escorte/cercle. Cette recette ne joue aucune de ces chasses ni la victoire spatiale déjà préparée ; elle vérifie les conversations et les commandes décrites ci-dessus. Aucune mutation manuelle de campagne, acteur ou horloge n’intervient après l’initialisation ; les changements observés proviennent uniquement des actions natives.

Les six membres de clan ont `fieldReady:false`. Le cas « allié de clan déployé sur le terrain » n’existe donc pas dans le runtime courant ; il n’a pas été inventé. Les cas réserve, suspendu, transféré et engagement spatial actif sont exercés.

Aucune manette physique, fidélité canonique des dessins, revue artistique humaine, mixage audio, performance générale ou session de chasse complète n’est qualifiée par cette recette. L’écoute peut être répétée après réouverture : l’état d’écoute est local au panneau et n’ajoute aucun compteur de sauvegarde.
