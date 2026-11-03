# V66 — Les Premières Pistes

## Raccord vérifié

La campagne jouable existante s’arrête après la nurserie, l’accueil chef/mentor, le dojo, la première lame, le biomask, le camp, le repos, la reconnaissance désertique, la patrouille et la petite Fosse (`cage-complete`, vingt preuves jeunesse). Les autres chasses et rites de la chronique n’étaient pas des chapitres jouables.

V66 ajoute un départ **volontaire et physique depuis le mentor du dojo**, après ce checkpoint. Les anciennes parties restent à leur étape et ne partent pas seules. L’écran de jeu est distinct et conserve son bilan jusqu’au retour explicite dans la cité.

## Ce qui se joue

- Briefing près du mentor, déplacement latéral dans un terrain de 2 860 unités avec trois obstacles solides à franchir par saut.
- Trois indices ordonnés, examinés à l’arrêt par maintien. Une ancienne branche fournit une lecture contradictoire et ne valide aucun indice. C’est une comparaison d’indices sur le parcours, pas deux régions à embranchements complets.
- Approche d’un brouteur original, alternance du regard, couvert évalué entre l’acteur et l’animal, bruit à courte portée et vigilance. Observer demande d’être au bon endroit, immobile, orienté vers l’animal, hors de sa vue et sans bruit.
- Un repérage interrompt l’observation. Il faut se replier physiquement au repère puis demander un nouvel essai ; les trois indices restent acquis, aucune observation gratuite n’est accordée.
- Retour physique au mentor, compte rendu séparé puis preuve `first-tracks`. Le chapitre ne donne aucun trophée, XP, équipement adulte, honneur, rite, rang ou vaisseau. La Piste sans guide et les rites suivants restent à produire.

## Sources et statut du récit

Sources locales réellement relues :

- `work/v36/new-world-specs/youth-thread-page-1.json`, conversation « Mission jeunesse Yautja », demande utilisateur `7efc0ab0-c5af-4bea-a1ba-c62bc14676e2` : formation, premier sommeil, sortie du désert, Fosse secondaire ; premier vaisseau seulement Blooded.
- `work/v36/progression-art-specs/progression-thread.json`, demande utilisateur `ae788e54-7c96-46e2-9246-87a05622838a` : progression par histoire et épreuves, retenir ce qui est cohérent dans ce jeu.
- La réponse de conception de ce dernier fil propose « Les Premières Pistes » : suivre une proie locale, franchir le terrain et rapporter une preuve au mentor. Son nom et sa structure sont de la conception du projet, **pas une mission canonique de la franchise**. `clanChronicle.ts` possédait déjà ce jalon distinct des rites.

Le texte du mentor, la disposition du terrain, les seuils de vigilance et le comportement d’observation sont une adaptation originale. Aucune nouvelle conversation privée n’a été récupérée et aucun rite officiel supplémentaire n’est affirmé. La reconnaissance Unblooded acquise après la nurserie n’est ni retirée ni réattribuée.

## Images et présentation

Les PNG natifs V48/V49/V52/V53 existants sont réutilisés sans modifier leurs octets : désert, indices séparés, corps du novice, mentor, brouteur et insigne cosmétique. Le décor lointain suit une parallaxe simple, le terrain et les accessoires suivent la caméra physique. Les orientations natives gauche/droite remplacent tout miroir artificiel.

Il ne s’agit ni de nouveaux décors générés, ni d’une nouvelle planche d’animation. Le brouteur change entre ses deux dessins de veille ; le pas feutré utilise une pose basse existante. Les silhouettes lointaines du tableau restent peintes, pas un groupe de chasseurs simulés. Ce chapitre court ne remplace pas une campagne commerciale complète et aucune durée cible de trente minutes n’est revendiquée.

## Contrat de sauvegarde

`SaveGame.soloV66?` est facultatif pour les anciens fichiers. Un état explicite invalide est refusé ; une version future reste protégée. Le checkpoint pur est versionné séparément. Sept reçus `solo.first-tracks.v66` sont ordonnés et datés : `departure`, `fresh-tracks`, `crossing-tracks`, `last-tracks`, `observed`, `returned`, `mentor-report`.

Chaque jalon suspend la simulation jusqu’à confirmation de l’écriture principale. Une écriture ordinaire ne peut introduire de nouveau reçu ; une transaction ne peut en introduire plus d’un ni modifier une date déjà acquise. La dernière transaction enregistre ensemble le compte rendu et `chronicle.first-tracks.completed`. Les sauvegardes manuelles réutilisent le lieu `youth-training` existant, avec reprise Solo prioritaire et retour Homeworld après achèvement.

La validation est une protection locale de cohérence et de concurrence, pas un mécanisme anti-triche serveur. Les callbacks utilisent le propriétaire de campagne et la transaction existante du jeu.

## Vérification

Seize tests dédiés passent : parcours réellement simulé depuis la chaîne jeunesse, géométrie, pause/page cachée/images absentes, restauration toutes les 31 frames, détection et repli, refus des étapes sautées, imports stricts, sept refus de quota/perte silencieuse puis réessai, exception après écriture, concurrence même/autre propriétaire et huit sauvegardes manuelles avec activation.

Cinquante tests combinant les suites jeunesse et Solo passent. La revue indépendante a trouvé et fait corriger des coercitions indésirables de `status`, `facing` et `notice` ; leurs formes tableau/chaîne/booléen/objet sont maintenant testées et refusées. Le lint des nouveaux modules, scripts et tests passe sans avertissement.

Recette navigateur : `scripts/verify-first-tracks-solo-v66.mjs`, URL et dossier réglables par `V66_QA_URL` / `V66_SOLO_QA_OUTPUT`. Elle importe un emplacement construit par les vraies fonctions de campagne à partir d’une chaîne jeunesse réellement simulée, marche au dojo, démarre depuis le mentor, joue le terrain au clavier, provoque un refus de stockage, reprend après rechargement et vérifie le retour durable. Le rapport navigateur final est distinct des tests ci-dessus ; ne pas déduire une publication de ces seuls contrôles.

La recette sur le serveur Next **compilé V66** (`127.0.0.1:4184`) passe ses quatre contrôles, sans erreur JavaScript/HTTP ni événement HMR. Les sept captures finales ont été inspectées : cadrage portrait corrigé à 393 × 852, disparition de la répétition verticale du panorama, menus lisibles, pieds au sol et retour dans la cité après son fondu d’entrée. Le vrai geste tactile du navigateur déplace l’acteur ; ce contrôle ne remplace pas un essai sur téléphone physique ou manette matérielle. Preuve, mesures, limites et empreintes : `docs/v66-solo-compiled-qa.json`.
