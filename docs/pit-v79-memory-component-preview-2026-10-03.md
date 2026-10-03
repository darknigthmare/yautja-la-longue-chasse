# Aperçu composants The Pit V79 en mémoire

3 octobre 2026. Le manque d’espace sur C: et les permissions d’écriture non accordées sur D:/M: restent des contraintes distinctes des résultats applicatifs. Aucun changement d’ACL, écriture sur ces volumes, nouveau Chrome ou contournement du lanceur de validation n’a été réalisé.

Lancement réel autorisé : node work-local/v79/preview-memory.mjs. Serveur localhost http://127.0.0.1:4199, session Node 96592. V79_MEMORY_PREVIEW_PORT permet un autre port. Ce serveur reste actif pour les captures et parcours du root ; Chrome QA CDP http://127.0.0.1:58677 est conservé.

## Ce qui est exécuté

Le script lit les vrais fichiers PitExperienceV79, PitCanvas, leurs systèmes et données, ainsi que React/react-dom/client/jsx-runtime/scheduler. TypeScript transpile le graphe CommonJS entièrement en mémoire ; les imports sont résolus et les modules réellement exécutés par React dans le navigateur. Le graphe courant contient 123 sources, environ 6,2 Mo de JavaScript et 263 Ko de CSS. Aucun renderer de combat, catalogue, réponse métier ou état de victoire n’est substitué.

PostCSS lit les véritables modules CSS et réécrit leurs sélecteurs locaux avec les mêmes noms que les exports consommés par les composants. Les classes dans les attributs/chaînes sont préservées ; keyframes/animation sont raccordés. Une syntaxe CSS module non supportée provoque une erreur explicite. Les vrais globals et le preflight Tailwind sont chargés. La génération des utilities Tailwind et le packaging Next/Vinext ne sont pas exécutés : cette preuve concerne des composants isolés, elle ne remplace pas un build ni une publication.

Les assets sont lus depuis public et sa junction existante, avec contrôles du chemin demandé. Aucune copie n’est créée. Les seules écritures de ce chantier sont le script sauvegardé dans le workspace et ce rapport ; les sorties de compilation sont en RAM. Aucun cache ou bundle n’est écrit.

La fixture de montage fournit les bindings de production, ownerSaveCreatedAt 2026-10-03T07:50:00.000Z, contraste normal, gore réduit et secousses désactivées. Elle ne représente pas une campagne créée par le flux GameClient. Les callbacks de persistance historiques ne sont pas remplacés par un faux succès. Quitter le Pit normal démonte la racine de cet aperçu.

## Instrumentation de source

/__preview/health fournit le statut du serveur et ses erreurs. /__preview/manifest et window.__pitMemoryPreviewV79 donnent méthode/limites, date réelle de snapshot, SHA256 de chaque source et empreinte du manifeste. Chaque chargement du document recapture les sources actuelles ; JS et CSS sont servis depuis le snapshot RAM. Pour les preuves, conserver le manifeste du window réellement chargé, pas seulement celui du dernier visiteur du serveur.

Premier snapshot : 4c8430469376d8acc2216510c45ad53302737a79962e8aa1cca7256139464ceb. Smoke suivant après le patch retry du root : c6991e269527fbd31df408088f26f8a2f00b195d85f8d7ebd275e7008b9f50aa. Dans ce dernier, PitExperienceV79.tsx est 2796b757e738d21a9b8b9f11173bf7ca15273061c6e05454a02eae2f1f7ad5f6, 16088 octets, identique au fichier disque lu lors du contrôle. data-chronicle-preview-retry existe dans la source. La présence du bouton ne certifie pas encore que sa reprise après vraie erreur de décor fonctionne.

## Smoke réel constaté, sans capture revendiquée

Deux contextes Playwright isolés ont été créés sur le Chrome QA existant puis fermés. Le serveur et Chrome n’ont pas été arrêtés. Le premier chargement desktop 1440×900 montre le vrai menu, 199 chasseurs/187 arènes, 43 boutons et quatre canvases ; body.scrollWidth=1440, sans overflow horizontal. Aucun pageerror, requestfailed ou HTTP asset >=400 n’a été mesuré. Une console404 isolée a néanmoins été reçue sans URL retrouvée, possiblement le favicon du scaffold : elle est conservée comme réserve, pas supprimée ni déclarée corrigée.

Le chargement suivant a utilisé le snapshot après patch ci-dessus. Le vrai bouton « Chronique du chasseur » a ouvert l’archive Jungle Hunter et les quatre routes. Dans cette navigation : consoleErrors=0, pageErrors=0, requestfailed=0 et réponses HTTP>=400=0. Ce contrôle du montage ne constitue pas une validation de décodage visuel de toutes les images, du parcours complet, du combat gagné ou de la persistance après reload.

Les captures JPEG, leur inspection visuelle, les quatre histoires, l’introduction/KO de combat, pause/reprise et les défauts responsive restent à vérifier par le root sur cet aperçu. Le build Next/Vinext, la régression complète, le SHA publié et la vérification HTTPS de production restent des gates séparés. Les anciennes captures V77 ne prouvent aucun de ces changements V79.
