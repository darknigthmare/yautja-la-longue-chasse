# Yautja : La Longue Chasse — continuité du 31 août 2026

Branche de travail : `agent/yautja-continuity-20260831`, base `4f1902f`. Copie isolée dans le dossier de cette session. Le dépôt de juillet et sa branche existante ne sont pas modifiés. Le premier lot a été préparé sans publication, puis complété à la demande « Continue et publie ». Les contrôles de prépublication sont consignés ci-dessous; leur réussite ne constitue pas à elle seule une preuve de déploiement.

Le cahier des charges provient du [partage fourni](https://chatgpt.com/share/6a953a3a-3580-83eb-b024-13aaa284e2e2), conservé dans `shared-brief-2026-08-31.md`. Les pièces jointes sandbox du partage n'ont pas été récupérées : le texte accessible suffit à retrouver les trois axes, mais ne prouve pas le contenu des archives jointes.

## Modifications intégrées

- **Entrée dans le vaisseau** : Jouer ouvre le pont physique. Apparition au sas, huit installations, deux niveaux, deux échelles, sauts, caméra horizontale sur petits écrans. Le personnage utilise le rig modulaire, son apparence et son équipement sauvegardés, au lieu du dessin MiniYautja.
- **Installations** : carte, armurerie, galerie/atelier, archives, forge, soins, entraînement existant et sas appellent les systèmes déjà présents. Les panneaux gardent le pont monté et visible sur grand écran, la position est conservée à la fermeture. Accès rapide, ancienne console et réglages restent disponibles.
- **Commandes** : pont gelé pendant les panneaux/réglages, entrées maintenues vidées, reprise de manette au neutre, focus contenu dans les dialogues. Carte également suspendue sous réglages. Le mode intégré du ShipHub retourne au pont avec la commande de retour. La barre du panneau devient inactive pendant une épreuve d'entraînement.
- **Départ** : sélectionner une destination permet de revenir au pont puis de confirmer équipement/départ au sas. Départ rapide conservé pour éviter un trajet obligatoire à chaque utilisation.
- **Sauvegarde de chasse** : Rejouer passe par le même initialiseur que le départ normal, avec nouvel identifiant de session et séquence de sauvegarde remise à zéro. Protection contre le double traitement d'un résultat. Une destination verrouillée ne peut pas démarrer. L'échec du stockage principal ne crée pas de sauvegarde de chasse orpheline.
- **Équipement** : aperçu de personnalisation corrigé pour montrer les armes réellement équipées, et non le couple plasma/lames codé en dur.
- **Trophées et scans** : scans limités aux ennemis vivants/actifs. Les huit trophées de campagne réutilisent leur image exacte V15 lors du prélèvement et du portage; masques et insignes n'émettent plus le gore d'un prélèvement anatomique. La galerie du pont est alimentée par les trophées possédés, pas par l'archive de franchise.
- **Art** : une paroi modulaire a été réellement générée avec l'outil intégré OpenAI Images, en référence à l'armurerie existante. Master 1536×1024, WebP 577450 octets, répété à 480×320 unités avec couvre-joints. Prompt exact, références, traitement et hashes enregistrés dans `art-source/v20/ship-interior/corridor-wall.provenance.json`. Modèle exact non retourné par l'outil, donc non inventé. Pas de génération dans le client.

## Validation du premier lot

- Installation : `npm ci --no-audit --no-fund`, 509 packages installés depuis le lockfile, sans changement de dépendance.
- `npm run lint` : réussi.
- `npm run typecheck` : réussi.
- `npm run build` : réussi. Vinext affiche sa limite connue de classement statique des routes (`? Unknown`); ce n'est pas un échec de compilation.
- `node --test --test-concurrency=1 tests/*.test.mjs` : **337 tests réussis, 0 échec, 0 ignoré**. Journal : `../outputs/qa-2026-08-31/qa-tests-2026-08-31.log`.
- 20 nouveaux tests comportementaux : moteur/entrées du pont (8), vrais gestionnaires de lancement/replay/récompense (4), fonctions de scan/prélèvement/dessin du Canvas (7), vrai cache statique Windows et frontière de métadonnées (1). Les anciens tests textuels concernés ont été adaptés et le test de sauvegarde accepte les fins de ligne Windows.
- Audit V15 : réussi, huit images réutilisées et contrat de consommation cohérent.
- Images : source inspectée par aperçu, sortie OpenAI inspectée, dimensions/hash/format/ratio vérifiés. Les raccords en jeu ne sont pas certifiés par le seul prompt.
- **Compatibilité de production Windows corrigée** : Vinext 0.0.50 crée des clés statiques avec `path.relative` et des antislashs, puis cherche des URL à slashs : pages 200 mais images/JS 404. `npm start` passe désormais par `scripts/start-production.mjs`, qui applique sur Windows uniquement le petit adaptateur `windows-static-cache.mjs`. Aucune modification de `node_modules`; Linux suit la CLI d'origine. Le correctif est lié à la version verrouillée de Vinext et devra être réévalué à sa mise à jour.
- **HTTP final réussi** : `/`, `/rig-lab`, le module de paroi, le trophée Vey et un fichier JavaScript retournent 200 avec leur type correct. `/.vite/manifest.json` reste 404. Preuve : `../outputs/qa-2026-08-31/qa-http-2026-08-31.json`. Serveur temporaire arrêté. Commande locale pour relancer : `npm start -- --hostname 127.0.0.1 --port 4179`.
- **Navigateur interactif non vérifié** : les outils Browser et view_image échouent au démarrage avec `apply deny-read ACLs`. Un aperçu de fichier a pu être affiché en lecture seule, mais aucune partie complète ou capture du jeu n'est revendiquée. Les tests de fonctions ne remplacent pas ce contrôle.

## Parcours à contrôler visuellement

1. Profil vierge et ancienne sauvegarde → Jouer → sas, personnage et équipement corrects.
2. Marcher/grimper jusqu'à l'armurerie → modifier l'arme → fermer → même position et bon équipement; répéter avec clavier remappé et manette.
3. Carte → destination → retour au pont → sas → départ; vérifier aussi annulation, départ rapide et réglages ouverts pendant navigation à la manette.
4. Récolte d'un insigne/masque puis d'un objet anatomique → extraction → débrief → retour → galerie → rechargement.
5. Rejouer → suspendre → recharger → reprendre sans réutiliser une ancienne sauvegarde ni doubler une récompense.
6. Entraînement ouvert : barre parent inactive; abandon/fin rend les commandes au pont. Les épreuves existantes sont au clavier/tactile, pas un stand de tir complet avec les vraies armes.
7. Contrôler 3 travées de parois, raccords, pieds du rig, occlusion, contraste, mobile et temps de frame/mémoire.

## Ce que ce lot ne termine pas

Le détail des huit missions est dans `campaign-continuity-audit-2026-08-31.md`. Les cinq dernières missions gardent une structure d'objectifs répétitive; plusieurs adaptations décrites des boss restent narratives. Leur perception/leurres, les relais Mycora, les vibrations Sandmaw, les bonds du Léviathan et les capteurs dans le vide demandent encore du gameplay dédié.

Les portes ouvrantes, salles en enfilade et kits bitmap complets de sol/portes/installations/biomes restent à produire; `ship-modular-art-contract.md` définit leurs contraintes sans les déclarer livrés. Ce lot contient un seul nouveau module bitmap et une géométrie de pont réutilisée/améliorée.

Pas de promesse de 60 FPS, de huit parties terminées, de version PC autonome ou de jeu entièrement achevé. La publication utilise le projet Vercel existant `yautja-la-longue-chasse`; GitHub, Vercel et le contrôle du site public sont des étapes distinctes.

## Suite demandée : continue et publie

- **Gardien d’Acheron** : les trois tirs énergétiques effectivement déclenchés et observés dans une fenêtre de mémoire de huit secondes provoquent un avertissement de 1,6 seconde, puis un champ de 4,5 secondes. Les transitions de phase utilisent le même avertissement. Couvert, camouflage et distance permettent de le déjouer. Le champ ne se renouvelle pas à chaque tick; les armes cinétiques restent utilisables. Cercle et compte à rebours rendent la contre-mesure visible. Cela ne remplace pas encore la perception générale des boss ou leur réaction aux leurres.
- **Reprise** : état d’adaptation sérialisé et cloné sans alias; ancien champ absent accepté. Une sauvegarde avec boss déjà mort ne conserve plus un verrou énergétique hérité, que la chasse soit reprise ou retentée.
- **Vaisseau** : entrées du ShipHub suspendues explicitement sous les réglages; historique manette conservé entre rendus; retour au neutre après pause/perte de focus. Pause du pont conforme à la touche remappée, maintien d’Échap filtré, clic sur le décor rendant le focus au pont. Les exercices restent clavier/tactile.
- **Dépendance de production** : Nano ID 3.3.16 → 3.3.18, seul changement de paquet dans le lockfile, via `npm update nanoid`. Correctif de l’[avis GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8). Aucune montée de version Next/React/Vite.
- **Envoi Vercel** : `.vercelignore` exclut aussi `dist`, les autres sorties locales, les journaux QA, métadonnées locales et `.env*`. L’inspection CLI passe d’environ 531 à 264 Mo. Le master et la provenance restent dans Git, seule la paroi WebP est livrée au site. L’inspection des entrées confirme la présence de cette image et l’absence des sources privées.

### Validation finale avant publication

- `npm run lint`, `npm run typecheck` : **réussis sur l’état final**.
- `npm audit --omit=dev --audit-level=high` : **0 vulnérabilité signalée en production**.
- `npm run build` : **réussi**, build Vinext reconstruit après le dernier correctif.
- `npx next build` : **réussi**, build correspondant à `vercel.json`, types et trois routes compilés.
- `node --test --test-concurrency=1 tests/*.test.mjs` : **356/356 réussis, aucun échec ni skip**, après le dernier correctif. 39 nouveaux tests comportementaux au total par rapport à la base. Journal : `../outputs/qa-2026-08-31/release-tests.log`.
- **HTTP Next local : 23 contrôles réussis**, dont les deux pages, les 14 scripts initiaux de la page, trois images comparées par SHA-256 aux fichiers locaux, et quatre chemins privés/internes en 404. Ce contrôle ne simule aucune interaction. Journal : `../outputs/qa-2026-08-31/release-local-next-http.json`.
- Audits **trophées V15, vaisseaux et kit du chasseur réussis**.
- **Audit complet des décors V19 non satisfait** : 452 paires master/runtime présentes sur 800 prévues. Jungle et glace ont chacune 100 paires; volcan42, marais51, désert42, océan39, fongique38, ruines40. L’auditeur valide en profondeur les deux biomes complets puis signale 12 écarts de quantité pour les six autres; ne pas interpréter ce résultat comme la validation de 452 images. La projection runtime existante filtre les paires absentes. Rapport : `../outputs/qa-2026-08-31/biome-decor-audit.json`.
- **Bundle Next** : 25 chunks inspectés, marqueurs du nouveau Gardien et de la paroi présents; aucun chemin local de génération ou de provenance V20 détecté. 44 références d’assets extraites des changements vérifiées.
- **Relecture indépendante** : revue des overlays, de la suspension des commandes, des ressources publiques et de la mécanique du Gardien; défaut de migration corrigé puis 12/12 tests Gardien rejoués indépendamment.
- **Navigateur interactif toujours indisponible** : la nouvelle tentative échoue au démarrage sur l’erreur Windows `apply deny-read ACLs`. Aucun parcours complet, rendu du combat, test réel de manette ni mesure de FPS n’est certifié.

Les journaux de build et d’envoi sont des fichiers locaux ignorés. L’état effectif de publication doit être confirmé par un déploiement Vercel `READY`, son commit et les contrôles HTTP de l’alias public, pas déduit de cette préparation.

### Correction du paquet lors de la publication

La première construction distante a compilé Next mais échoué au contrôle TypeScript : `vite.config.ts` importait `.openai/hosting.json`, volontairement absent de l’envoi. Le dépôt local disposait de ce fichier, donc le build local ne reproduisait pas cette différence de paquet. Le déploiement Vercel utilise uniquement Next : `.vercelignore` exclut désormais également `vite.config.ts` et son plugin local `build/`. Les fichiers Sites restent intacts dans Git. Aucune désactivation de TypeScript, aucun secret réintroduit, aucun changement du jeu pour ce correctif. La nouvelle construction distante reste le contrôle décisif de ce paquet.
