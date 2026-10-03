# V77 — faune et galerie, relectures locales distinctes

## Revue historique du candidat 2

La recette réelle `verify-homeworld-fauna-v77.mjs` passe sur le jeu compilé au port 4196 : accès aux archives à pied, cinq illustrations, anciennes variantes, cinq planches/scènes entières, véritable erreur PNG puis reprise sur la même URL, quatre régions, pause et préférence de mouvement réduit. Les sauvegardes de prérequis sont des fixtures isolées déclarées ; le trajet complet de campagne n'est pas revendiqué.

**12 captures sur 12 ont été ouvertes avec view_image** dans `work-local/v77/qa/fauna-final-local-focus2`. Les quatre vues régionales montrent la créature au-dessus d'une véritable masse rocheuse peinte, séparée de son image ; elle ne repose plus sur un disque sans relief dans le vide. Le front de la corniche rejoint visuellement la chaussée existante. Les défenses restaurées, pieds et ailes sont conservés sans redessiner la source. Les deux insectes ont un déplacement décoratif borné ; ce n'est pas un battement d'aile dessiné. Les captures de pause montrent le panneau et le flou prévu, pas une observation anatomique supplémentaire.

La galerie conserve les versions antérieures dans son choix. Les planches de montures et la scène de caverne sont chargées entièrement, après décodage explicite. L'essai de requête refusée affiche l'erreur et le bouton de reprise ; aucun autre animal n'occupe la case. La reprise retrouve la vraie illustration sur sa même URL. Les premières trois cartes puis les deux suivantes sont lisibles, avec leur statut de pose fixe et la limite de fidélité annoncée.

Les réserves artistiques restent explicites : un même module de corniche sert aux quatre observations ; la grande chaussée et les panoramas sont les anciens décors régionaux, pas une nouvelle refonte complète de biome. La monture reste une référence de statuette non jouable. Les marginaux pixels source touchant son bord ne sont pas reconstruits. Les références privées originales absentes du partage ne permettent pas de certifier une reproduction canonique 1:1.

Le premier échec de focus après retour aux archives est conservé : le runner reprenait le contrôle avant le callback RAF qui focalise le titre du GameClient. Attendre ce callback réel rend le parcours PASS sans remplacer la simulation, imposer un focus forcé ou altérer l'application. Cette revue historique ne valide pas à elle seule les candidats suivants ni la production publique.

## Candidat final 4 — 4198

La recette entièrement rejouée sur `http://127.0.0.1:4198` est **PASS** : cinq contrôles, douze nouvelles captures, aucune erreur de page ni réponse HTTP en échec enregistrée. Rapport : `work-local/v77/qa/fauna-final-candidate4-local/report.json`, SHA256 `a690de342c9058ac479525218c051fbff969c5572439b45fdc2de1c88a082995`.

Les **12 nouvelles images ont toutes été ouvertes avec view_image**. Le reçu séparé `visual-fauna.fragment.json` dans ce même dossier lie chaque image à son SHA, à l'URL et à `v77-candidate4-local` ; il a été enregistré le `2026-10-03T05:15:51.975Z`. Le rapport brut n'est pas réécrit pour fabriquer un champ de relecture.

Les appuis et les deux défenses restaurées sont lisibles sur les vues non pausées. L'erreur PNG contrôlée reste explicite et le réessai restaure la même image. Les réserves du candidat 2 persistent : module rocheux commun aux quatre biomes, anciens panoramas et grandes bandes de chaussée, poses anatomiques fixes, monture non jouable et fidélité canonique 1:1 non certifiée. Le flou des quatre panneaux de pause est intentionnel ; ils n'apportent pas une inspection anatomique supplémentaire. Cette nouvelle preuve est locale ; aucune validation publique n'est déduite de son PASS.
