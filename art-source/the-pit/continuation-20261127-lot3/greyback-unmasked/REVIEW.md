# Greyback sans casque — reprise du lot 3

**Aucun nouveau PNG reçu.** Le premier essai du lot a été refusé par ImageGen. Les trois autres poses prévues n'ont pas été tentées après ce refus.

## Référence et intention

Combattant `greyback`, variante `elder-greyback-sans-casque-7955bb66ac`. La référence exacte est le [PNG du lot précédent](../../continuation-20261127/greyback-unmasked/reference-original.png), SHA-256 `7955bb66ac7c438237fe99e58f1be69c506cbaa475c60e220b9291358148ea04`, inspecté avant l'appel. Son identité est celle fournie dans le projet ; cette lecture ne constitue pas une nouvelle certification indépendante de fidélité au film ou à la figurine.

Les quatre poses visées étaient : garde calme à droite, reconnaissance de sélection à droite, garde calme à gauche et retour de désélection à gauche. Le prompt exigeait de préserver anatomie, empattement, équipement asymétrique, longues lames de poignet, épée, pistolet au holster, ornements et palette, dans un PNG entier individuel transparent.

## Tentative réellement exécutée

La première pose a été demandée via `image_gen.imagegen` avec la source locale et `transparent_background: true`. Le [prompt exact](preview-guard-01-right.prompt.txt) est conservé.

Réponse : HTTP 400, `moderation_blocked`, stade `output`, catégorie `other`, requête `f12e19cd-ab0e-47cc-aed7-67ccdad1800d`. Le service n'a pas donné davantage d'explication. Aucun fichier image ni octet de sortie n'a été fourni.

Les trois autres poses n'ont pas été tentées. Aucune reformulation, autre modèle ou route CLI n'a été utilisée pour contourner ce refus.

## État de production

Nouveaux PNG, copies publiques et clips admis : **0**. Certification de fidélité 1:1 : **aucune**. Les cinq candidats précédents, leur source et leurs limites documentées restent inchangés. Les quatre manques sont ouverts.

Le [manifeste](manifest.json) enregistre les slots, statuts, empreintes et réponse du service. Il ne compte pas un prompt comme un asset généré.
