# V42 — Contre-enquête du convoi

## Source et adaptation

La demande utilisateur conservée dans `tmp/chatgpt-audit-2026-09-08/share-1.conversation.md` (lignes 1–3) demande une cité Homeworld avec habitants, quêtes, roi et campagne, en complément du vaisseau personnel. Le texte suivant est une proposition de conception de l’assistant, pas une transcription de décisions utilisateur supplémentaires : retour de chasse qui change l’histoire (37), convoi et prise supposée scellée (60–65), dossiers reçus par les Enforcers (149–157), audiences motivées par des preuves sans retirer les rangs acquis (169–177, 229–237), détournements et fausses accusations (341–371), récits secondaires avec décisions (395–401).

V42 adapte cette direction dans la cité et les deux expéditions **déjà jouables**, décrites dans `docs/chatgpt-v30-delivery.md` et `docs/glass-desert-v30.md`. Les dialogues, arguments, branches et cinq étapes ci-dessous sont une nouvelle écriture d’implémentation. Ils ne sont pas présentés comme du texte récupéré mot à mot, ni comme l’acte II complet. La source brute reste privée ; aucune nouvelle conversation privée n’a été récupérée pour cette livraison.

## Parcours intégré

Le complément exige les rapports durables des **Marches de Cendre et du Désert de Verre**, ainsi que la première audience existante. Le rang, les visites, la possession d’un trophée ou une simple sortie d’expédition ne les remplacent pas. Aucun déverrouillage ni rapport n’est injecté dans une vraie partie.

1. **Officier des quais** : distinguer la dissimulation documentée d’un commanditaire encore inconnu. Une conclusion erronée reçoit une explication et ne progresse pas.
2. **Conservatrice des marques** : confronter le registre aux relevés du Désert ; la balise conservée ou coupée est explicitement reconnue.
3. **Capitaine des Enforcers** : choisir une priorité après lecture de ses conséquences. Le choix devient durable et ne peut pas être réécrit par répétition.
4. **Branche physique** : retourner soit auprès du témoin pour un témoignage anonymisé, soit auprès de l’officier pour un recoupement des transferts. L’autre interlocuteur ne valide pas cette étape.
5. **Roi de la cité** : remettre un dossier complémentaire vérifié. Le journal et les répliques de revisite conservent cette conclusion, sans déclarer l’enquête générale résolue.

Les cinq PNJ sont les points existants de la ville ; aucun bouton de téléportation, scène fictive ou nouvelle géométrie n’est ajouté. Chaque réponse vérifie l’interlocuteur du dialogue et la proximité réelle de l’acteur. Le journal indique l’étape, la destination et le progrès sur cinq. Les boutons passent par la navigation clavier/manette déjà utilisée par les dialogues.

Le choix initial concernant le témoin, ses relations, le sort de la balise et le rang restent inchangés. Aucun octroi d’XP, d’honneur, de marque, d’objet, de trophée, de condamnation Bad Blood ou de titre monarchique n’est ajouté. La conséquence est narrative et durable : contenu du dossier, interlocuteur à visiter et répliques de revisite. Une surveillance automatique ou une nouvelle simulation de poursuite n’est pas implémentée.

## Persistance et migrations

`HomeworldProgress` garde sa version 1 et reçoit un champ additif `inquiry` version 1. Les sauvegardes sans ce champ le reçoivent vide, sans changer leurs preuves, rapports, choix et relations. La normalisation est pure : elle ne modifie ni l’objet d’origine ni le stockage ; seuls les préfixes ordonnés et justifiés par les prérequis survivent. Un champ futur ou malformé ne crée aucune étape acquise. Comme les autres normaliseurs existants, cette fonction assainit un clone ; elle n’archive pas une copie du JSON brut. En amont, l’inspecteur du stockage refuse une version Homeworld ou inquiry supérieure à 1 comme `future-version` avant toute normalisation : lecture, import et écriture normale préservent alors les octets du slot et de sa sauvegarde de secours.

Le mutateur refuse une version Homeworld inconnue et un champ `inquiry` explicite incompatible ou contradictoire (`ok:false`, `changed:false`). Aucun candidat ainsi refusé n’est envoyé au callback d’écriture. Une action valide passe par le `persistAction` existant : seul l’acquittement positif de `onProgress` remplace le progrès en mémoire. En cas de refus, l’étape et le bouton restent disponibles ; il n’y a pas de réessai automatique par frame. Une nouvelle sélection explicite retente l’action à partir du dernier état acquitté. Un remplacement de propriétaire ou un dialogue devenu distant est bloqué avant écriture. Les protections CAS et de récupération du stockage existantes ne sont pas contournées.

## Validation et limites

`tests/homeworld-inquiry.test.mjs` vérifie les prérequis, l’ancienne forme sans champ, les imports incohérents, les mauvaises déductions, les deux branches, les reprises idempotentes, la conservation des choix antérieurs et les callbacks réels extraits de `HomeworldHub`. Ces callbacks sont exécutés avec `save.ts` et un stockage isolé refusant une écriture : refus, récupération, cinq étapes et rechargement sont vérifiés. Les rapports préalables sont des fixtures validées, **pas une preuve que ces tests ont joué les expéditions**.

`scripts/verify-homeworld-inquiry-v42.mjs` est la recette navigateur séparée : fixture préalable isolée, déplacements clavier physiques entre PNJ, erreur de déduction, refus ciblé du slot, reprise, choix via manette virtuelle, audience, journal et rechargement. Variables : `V42_QA_URL`, `V42_HOMEWORLD_QA_OUTPUT`, `V42_QA_EXPECTED_VERSION`. Un harnais écrit n’est pas une recette réussie ; le résultat effectif figure dans son `report.json`. La manette virtuelle ne certifie aucun matériel physique.

Ce lot ne livre ni nouveaux décors, ni animation, ni Nurserie, ni Berceau, ni les huit autres régions ou les cinq actes complets. Il rend jouable un prolongement borné des preuves et de la cité existantes.

Recette locale V42 exécutée avec succès : `work/v42/homeworld-inquiry-qa/report.json`, six contrôles et cinq trajets physiques. Captures 1280px et 390px inspectées ; rechargement réel validé, zéro erreur console/HTTP. Le test de protection des sous-versions futures vérifie séparément zéro écriture et conservation des deux slots. La publication reste une validation distincte.
