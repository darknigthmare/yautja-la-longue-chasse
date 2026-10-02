# V74 — Livraison et vérification publique

Vérifié le 2026-10-02T09:34:46.332Z. Source `ed19caf3120122d14da22a0e0e0e23d7b5e15436`, identique à GitHub main. Production `dpl_DCxBhVfrPEjftk5KHc6FYjkeAvgT`, **READY**, cible production et alias canonique confirmé : https://yautja-la-longue-chasse.vercel.app.

Le lot livre 37 intérieurs différenciés (80 zones, 29 passages, 153 meubles natifs indépendants), la marche du jeune dans huit directions (40 poses), et 112 poses civiles natives pour les 14 tenues déjà utilisées par 98 habitants. Le codex contextuel comporte 879 fiches. Les anciens bitmaps sont conservés.

Les builds Next et portable, TypeScript, ESLint et les quatre contrôles du CSS compilé passent. ESLint conserve trois avertissements d’images préexistants. La régression complète passe : **2 464 / 2 464 tests**, zéro échec, annulation ou test ignoré.

Les 39 PNG du contrôle public répondent HTTP 200 avec SHA identiques aux fichiers versionnés. Les huit parcours publics utilisent des sauvegardes de test isolées :

| Parcours public | Résultat | Contrôles | Captures |
|---|---|---:|---:|
| shell | PASS | 43 | 2 |
| prologue | PASS | 8 | 26 |
| identity | PASS | 15 | 24 |
| connections | PASS | 15 | 18 |
| youth-motion | PASS | 27 | 13 |
| secondary-interiors | PASS | 42 | 40 |
| motion-assets | PASS | 3 | 3 |
| civilian-motion | PASS | 14 | 4 |

Les rapports JSON correspondants sont conservés dans ce dossier. Les captures originales sont dans work-local/v74/qa et ont été inspectées localement ; elles ne sont pas ajoutées aux assets du jeu.

## Limites explicites

- **PARTIAL_ART pour la marche civile** : costumes, sources natives, ancrage au sol et parcours fonctionnels sont contrôlés ; certaines alternances apparentes des jambes restent à affiner. Les 14 cycles ne sont pas présentés comme une finition commerciale anatomique achevée.
- La cité, les coutumes locales et les tenues originales sont des adaptations compatibles avec le lore. Aucun plan canonique 1:1 de la ville ni monarchie universelle n’est revendiqué.
- La marche V74 du jeune concerne Homeworld et ses intérieurs ; les avatars régionaux et du prologue restent inchangés.
- Le menu de compte reste accessible ; connexion réelle, inscription, courriel et synchronisation entre appareils n’ont pas été exercés.
- Aucun contrôle n’utilise la sauvegarde réelle de l’utilisateur. Le rechargement ordinaire revient au point de Port déjà prévu ; les retours régionaux immédiats conservent leur porte physique.
- Ces preuves concernent ce lot Homeworld. Elles n’attestent pas que tous les chantiers historiques (arènes, campagne complète, etc.) sont terminés.
