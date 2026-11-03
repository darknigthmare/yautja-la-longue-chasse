# V75 — Cité, paysage et accessibilité

Vérifié le 2026-10-02T15:45:08.962Z. Source `a1c1c4e41154d1c8c01d7b77bc6f6290caa99f8f`, identique à GitHub main. Production `dpl_BKHfLXsMEKn4MLwzyqabNFFam4AX` **READY**, cible production et alias confirmé : https://yautja-la-longue-chasse.vercel.app.

Le lot livre 13 façades civiques secondaires différentes et 62 meubles natifs de devanture indépendants. Les six façades principales, les 24 logements et tous les anciens bitmaps sont conservés. Les seuils et ouvertures réels sont mesurés dans les sources natives ; les cavités des 13 portes civiques ne laissent plus voir la rue au travers. Les 43 portes restent reliées au réseau praticable.

Les abords ajoutent 212 modules naturels, 14 surfaces locales et 6 matériaux natifs, avec une projection unique et des appuis triés à leur profondeur de sol. Le sol couvre désormais la caméra nord ; la caméra montre les épaules ouest/est sans agrandir les limites physiques. Les raccords internes des chaussées régionales ne se croisent plus visuellement. Les 162 anciens modules paysagers restent conservés.

Les 98 habitants proposent trois sujets : travail, lieux proches et usages locaux. Les 14 quartiers comportent 28 récits de travail et 14 textes de coutumes. Le registre Repères recherche une vraie porte, un interlocuteur, un service ou un départ autorisé puis guide à pied autour des obstacles, y compris en sortant/entrant physiquement dans les pièces. Il ne déplace pas le joueur, ne donne aucun rang, récompense, preuve ou permission et n’ajoute aucun champ de sauvegarde. Le codex contextuel comporte **1195 fiches**.

Les builds portable et Next, TypeScript, ESLint et le CSS compilé passent. ESLint conserve trois avertissements d’images préexistants, zéro erreur. La régression complète passe : **2502/2502 tests**, zéro échec, annulation ou test ignoré. Les 53 PNG contrôlés en public répondent HTTP 200 avec les SHA des fichiers versionnés.

| Parcours public | Résultat | Contrôles | Captures |
|---|---|---:|---:|
| wayfinding | PASS | 10 | 14 |
| conversations | PASS | 3 | 7 |
| landscape | PASS | 15 | 14 |
| architecture | PASS | 18 | 17 |
| identity | PASS | 15 | 24 |
| youth-motion | PASS | 27 | 13 |
| civilian-motion | PASS | 14 | 4 |
| motion-assets | PASS | 3 | 3 |
| prologue | PASS | 8 | 26 |
| connections | PASS | 15 | 18 |
| shell | PASS | 57 | 2 |
| secondary-interiors | PASS | 42 | 40 |

Les rapports JSON sont conservés dans ce dossier ; les captures inspectées sont dans work-local/v75/qa. Les sauvegardes de test sont isolées de celle de l’utilisateur.

## Limites

- Cité, architectures et usages originaux compatibles avec le lore : aucun plan canonique 1:1 ni gouvernement universel n’est revendiqué.
- Les cycles civils V74 restent **PARTIAL_ART** pour certaines alternances des jambes. Ce lot n’annonce pas leur finition anatomique complète.
- Les raccords des textures sont relus visuellement, sans certification mathématique de périodicité.
- Portrait mobile en émulation Chrome ; pas un essai sur téléphone physique ni une certification d’accessibilité.
- Connexion réelle au compte, inscription, courriels et synchronisation multiappareil non exercés dans ce lot.
- Ces preuves concernent cette amélioration Homeworld ; les autres chantiers historiques ne sont pas déclarés terminés.
