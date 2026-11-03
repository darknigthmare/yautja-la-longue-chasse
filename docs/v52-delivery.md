# V52 — Patrouille jeunesse, cérémonies et parcours THE PIT

## Chapitre jeunesse

Après la reconnaissance du désert, le joueur choisit de poursuivre avec son maître. La patrouille comporte deux haltes physiques, un passage de basalte, une rencontre territoriale non létale, une évaluation et le retour. Trois charges annoncées doivent être évitées. Trois chocs provoquent une défaite puis une reprise de la rencontre, sans supprimer les haltes déjà acquises. Les cinq preuves sont sauvegardées séparément ; aucun rang, trophée, vaisseau ou équipement adulte n’est accordé.

La sortie peut être reprise pendant une charge avec son état exact. Les anciennes sauvegardes sans patrouille restent lisibles. Le brouteur utilise huit dessins OpenAI dans les deux orientations, dont deux poses de charge par côté. Les dialogues et cette rencontre sont une adaptation originale de la demande locale, pas une quête canonique attestée. Voir `v52-youth-delivery.md` et `art/v52/youth-grazer-provenance.json`.

## THE PIT

City Hunter avec casque et Scar avec casque reçoivent chacun une entrée, une victoire et une défaite, dans les deux orientations natives. Six PNG originaux fournissent douze clips et vingt-six dessins distincts utilisés. Les trente-six références de frames réutilisent certaines poses ; elles ne sont pas trente-six nouveaux dessins. Les premières colonnes contaminées sont exclues sans modifier les pixels sources ni relever le seuil de transparence.

La première pose de l’intro exacte est tenue pendant l’attente ; sa dernière pose est tenue après son entrée et pendant le compte à rebours. Ce raccord reste une pose tenue, sans avancer ni réinitialiser le curseur de combat. Les intros absentes, non validées, en boucle ou d’une autre apparence gardent le repli existant.

Les mains et l’équipement sont relus, les armes de poignet rétractées pendant ces cérémonies. Les costumes exacts restent isolés : leurs mouvements de combat manquants ne sont pas empruntés aux anciennes variantes. Une demande supplémentaire de pose neutre Scar a été refusée par le service ; aucun fichier fictif ni recours à une API payante n’a été ajouté. Les poses valides déjà obtenues sont réutilisées. Prompts : `v52-openai-prompts.json`.

Quatre liaisons optionnelles rejoignent le parcours Réserves existant : Convoi → Dernier Quai, Chantier → cale du Vaisseau Perdu, Archive Interdite → chambre des Échos, Écluse des Marais → cœur de Mangrove. Elles réutilisent leurs kits indépendants ; aucune nouvelle arène ou géographie canonique n’est revendiquée. Le sélecteur précharge les deux lieux, une panne de destination bloque le lancement, et une vraie projection en bord de scène transfère les combattants. La bannière utilise désormais le nom du secteur choisi. Détail : `pit-stage-journeys-v52.md`.

## État de production

Le registre compte 333 clips, 116 pages logiques, 98 PNG physiques et 669 dessins distincts. Vingt apparences sont partiellement animées, couvrant quinze identités. Parmi les 410 variantes fournies, neuf possèdent des clips dédiés et 401 restent statiques. Ce comptage ne qualifie aucun moveset comme complet. Audit détaillé : `art/v52/animation-coverage-audit.json`.

La petite cage du PIT de jeunesse, les rites suivants, les actes Homeworld, les véhicules pilotables et la majorité des animations restent ouverts. Il reste 75 départs sans parcours dans le groupe d’arènes 1–80 ; les 81–100 restent des duels purs. L’audit strict des décors V19 disponibles confirme 464 paires valides sur un plan de 800 ; les 336 manquantes restent ouvertes. Les besoins de props d’arènes et les 19 lots de jeux manquants du bilan V51 ne sont pas clôturés par cette livraison. Aucune nouvelle conversation privée non récupérée n’est supposée connue.

## Validation et distribution

Les builds web et renderer Windows, TypeScript, le lint (un avertissement historique) et les 1 641 tests passent. Les 46 contrôles navigateur distincts passent : 38 sur le build final, plus 8 contrôles tactiles du chapitre jeunesse dont le runtime n’a pas changé entre les builds. Les quatre bannières de destination corrigées et les poses tenues sont vérifiées à l’écran. Les sept PNG servis sont identiques aux sources (dimensions et SHA-256). Les mêmes 46 contrôles passent aussi sur la production publique V52, ainsi que les hashes des sept images. Le détail et les limites figurent dans `v52-validation.json`.

L’édition Windows passe à 1.0.52 / V52 avec un répertoire de construction séparé `work/v52-pc`. Le package ne sera déclaré disponible qu’après construction depuis un commit propre, vérification de l’ASAR, lancement hors ligne, sauvegardes/reprise à froid et validation de l’archive. Les résultats définitifs, le SHA Git, la production Vercel et les hashes servis seront enregistrés dans `outputs/qa-commercial-audit/v52/publication-verified.json` après exécution. Les tests automatisés ne certifient ni cadence sur matériel physique, ni manette physique, ni jeu commercial achevé.
