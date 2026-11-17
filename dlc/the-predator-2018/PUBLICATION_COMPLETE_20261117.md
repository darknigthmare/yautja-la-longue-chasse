# The Predator (2018) — DLC et sprites conservés dans la PR #146

Génération arrêtée à la demande de l’utilisateur. Cette passe conserve les fichiers existants ; elle ne dessine, ne régénère, ne redécoupe et ne remplace aucun sprite.

## DLC

- [Standalone v0.5](JOUER_THE_PREDATOR_2018_V0_5.html), [données](src/data/game-data.json), [documentation](docs/) et [intégration](docs/INTEGRATION_V0_5.md).
- 51 fichiers v0.5 inchangés, 52 séquences et 183 micro-zones.
- [Archives historiques](history/) : ZIP originaux v0.2, v0.3, v0.5 ; six fichiers v0.4 ; archive de contrôle de fidélité originale et ses onze membres accessibles séparément.
- Les ZIP originaux v0.1 et v0.4 ne sont pas récupérés. Le checksum v0.4 seul ne remplace pas son archive.

## Sprites, planches et illustrations

13 images sources originales + 2 découpes individuelles déjà présentes = 15 PNG artistiques consultables. Les captures QA du DLC sont conservées séparément dans docs/. Une planche contenant plusieurs poses reste une seule image source, pas une série d’animations intégrées.

[Index de toutes les images](SPRITES_INDEX.md)

Tous les statuts de revue sont conservés : candidats non approuvés et essais rejetés restent distingués. Leur présence dans Git ne certifie pas une fidélité 1:1 au film et ne les active pas dans le moteur.

## Vérification

[Inventaire des 45 fichiers disponibles](publication/20261117-source-completion/available-inputs.json) · [Correspondances SHA-256 et chemins réels](publication/20261117-source-completion/receipt.json)

45/45 fichiers disponibles retrouvés à l’octet près, directement ou dans les ZIP historiques. Les 13 images sources sont aussi accessibles directement, hors ZIP. Les quatre ZIP et leurs 140 membres ont été vérifiés ; les 15 PNG artistiques ont été décodés.

Commande de contrôle : `python dlc/the-predator-2018/tools/verify_conversation_publication.py` (Python 3 et Pillow). Sans --report, le contrôle est en lecture seule.

Les rapports anciens, y compris les mentions antérieures « non envoyé dans la PR », sont préservés comme documents historiques ; le présent index et son reçu décrivent la conservation actuelle. Aucun nouveau résultat de gameplay, aucune fusion HuntCanvas et aucun déploiement ne sont revendiqués.
