# S16 — extraction locale bornée

Ce lot étend le même exercice `ClanWarWorksV6`, uniquement en mode **stocks
locaux**. Il ne déploie pas un conflit de campagne et n’accorde ni XP, mission,
rang, revenu, soin, consommable ou acteur de campagne.

## Cellules attestées

Source : `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, SHA256
`87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.

- **Structures de guerre S16, D21:G21** : 14 RAV de kit, 2 RAV d’entretien,
  trois tours de travaux, opérateur W3-U17. H21 impose contenants/couverture et
  route gardée ; I21 impose transport réel jusqu’au dépôt sans résurrection.
  J21 impose livraison des pièces, appuis et mise en service.
- **Unités de guerre U17, D22:H22** : trois membres, 3 PC, recrutement 12 RAV,
  entretien 2 RAV, arrivée après deux tours. N22 précise que porter réduit
  les mains disponibles et exige un itinéraire praticable.
- **U07, C12:H12** : rôle tenue de passage, trois membres, 3 PC, recrutement
  12 RAV, entretien 2 RAV, deux tours de formation. L’escorte ne crée pas de
  formation : elle affecte ces lanciers réellement présents au lien.
- **W3-R15 C20:D20**, **W3-R20 C25:D25**, **W3-OBJ04 D9:E9** : membre blessé
  indisponible, trajet vers une sortie, validation individuelle d’arrivée ; les
  retardataires gardent leur position.
- **S11 D16:I16 / U18 D23:H23 et N23** attestent une stabilisation ultérieure :
  poste 14/2/3 RAV/entretien/tours, U18 1 membre/2 PC/10 RAV/2 entretien/3 tours,
  consommables nécessaires, aucune résurrection ou effacement de blessure
  majeure. **S16 ne référence pas S11 comme un prérequis obligatoire**. Aucun
  prix/quantité de consommable ni délai de récupération n’étant fourni ici,
  S11/U18 ne deviennent pas une construction ou un traitement dans ce lot.

Les coûts/délais du modèle proviennent des fiches runtime, pas d’alias V3.
Les tables se déclarent proposées/reconstituées pour le jeu, pas canon de
franchise.

## Boucle consommée par l’interface

S16 suit la réservation au dépôt, chargement du vrai kit, parcours compatible
RAV, livraison au site reconnu, trois commandes de travaux réellement
accomplies, puis opérateurs présents. Une attente ne construit rien. L’entretien
commence au tour suivant et prélève seulement les lots du site ; un S16 isolé
ne tire pas gratuitement sur le dépôt d’origine. U17 n’est pas compté une
seconde fois comme garnison.

Le joueur **déclare explicitement une blessure de simulation** sur un membre
existant, libre et à son lieu réel. Aucun combat n’est prétendu. L’identité,
l’XP et l’affectation originale sont conservées ; le membre devient indisponible
et reçoit une position individuelle. Départ de son équipe ou de son ancien
porteur ne le téléporte pas.

Un U17 complet rejoint le patient ; le porteur enregistré est un véritable
memberId apte de cette équipe. Chaque passage est exécuté et relit fermeture,
capacité et garde. Une équipe U07 complète doit être effectivement affectée
à ce lien depuis une extrémité adjacente ; elle reste immobile tant qu’elle
garde. Libérer la garde ou fermer le passage arrête le transport sans
dépense/tour ni déplacement fictif. Chaque étape garde porteur, lien, lieux,
tour, garde et position de garde.

Déposer un patient en route conserve sa position et ses étapes sans valider
l’extraction. Atteindre le site de S16 ne suffit pas : le bouton d’arrivée
contrôle le dépôt installé, les opérateurs et la dernière garde. Les U17
arrivants peuvent occuper un dépôt libre. Le reçu d’arrivée reste individuel
et dédupliqué ; les retardataires ne suivent pas. Le blessé reste blessé.

## Règles déclarées d’exercice et limites

- Un patient maximum par équipe U17 complète, sans kit ou charge RAV,
  chantier, observation ou repos simultané. C’est un gabarit de simulation,
  pas une capacité physique ou canonique fournie par N22.
- Une garde U07 affectée à une extrémité couvre le lien topologique. Cette
  règle n’invente pas une portée de tirs ; aucun adversaire, munition, combat
  ou sécurité de campagne n’est simulé.
- Le patient n’a pas de ration médicale ou consommation supplémentaire
  inventée. Les équipes et ouvrages continuent leur entretien sourcé ;
  le transport n’est ni une rémunération ni un crédit de ressources.
- L’inventaire personnel n’existe pas encore dans cet exercice. Aucun objet
  ou consommable n’est créé ; cette limite reste visible. La position sur
  graphe n’équivaut pas à un patient animé sur un théâtre 2D, aux appuis
  physiques de J21 ou à un retour vers la medical-bay du vrai vaisseau.

## Reprise compatible

Les checkpoints V87 version 2 gardent leur clé exacte et restent lisibles,
y compris avec une ancienne source locale ne possédant que les cinq ouvrages
S02/S03/S04/S05/S07. Manquer l’un de ces cinq ouvrages refuse toujours l’état.
S16 et son extraction restent optionnels et sont refusés sans leurs sources
complètes.

L’extension facultative `extraction.version: 1` apparaît seulement lors d’un
geste joueur utilisant S16, la garde ou le patient. Elle lie les cellules
pertinentes, positions, vrais membres/porteurs, étapes, gardes et arrivées.
Validation/import/export refuse duplications, sauts de position, faux porteurs,
source incompatible et champs de campagne. Une ancienne version de l’app sans
cette extension ne saura pas reprendre son contenu ; les anciens exports
sans extraction ne sont pas réécrits. Ce contrôle est une reprise cohérente,
pas une protection anti-triche ou un raccord `SaveGame`/compte/cloud.

## Parcours QA à jouer dans le vrai jeu

1. Table des mandats → Bible V6 → Logistique et ouvrages. Préparer un nouvel
   exercice **120 RAV / U17 / stocks locaux**, puis confirmer.
2. À K01 : reconnaître ; choisir S16/K01 ; réserver, charger, livrer le kit ;
   travailler **trois fois**. Dépôt prêt au tour 5. Libérer U17.
3. Former U07 et U19 ; attendre deux tours. Commander U19 vers K02, exécuter
   L01, déclarer **deux** membres blessés de simulation, puis ramener U19 à K01.
   Les patients restent à K02 ; un seul membre U19 est encore apte.
4. Choisir U07 à K01 et affecter la garde de L01. Choisir U17, rejoindre K02,
   prendre un patient avec son vrai porteur. Préparer le retour K01.
5. Fermer L01 et tenter le passage : position/tour/RAV ne changent pas.
   Rouvrir L01 puis exécuter : patient et porteur atteignent K01, arrivée
   encore non validée. Valider l’arrivée au dépôt.
6. Résultat attendu de ce parcours : **tour 11, 40/120 RAV**, dépenses
   recrutement 22 / kit 14 / entretien 44 ; un patient arrivé toujours blessé,
   l’autre à K02. U17 conserve ses 4 XP de reconnaissance, U19 ses 0 XP ;
   l’extraction n’en attribue aucune. Exporter/afficher le JSON et reprendre
   uniquement cet exercice doit préserver ces personnes et gardes.

Tests dédiés : `clan-war-extraction-s16-v88.test.mjs`. Ils exécutent les vrais
ordres du modèle ; les anciens tests ouvrages/logistique et la reprise par texte
restent des régressions séparées. Une réussite de tests ne certifie pas le
parcours navigateur/visuel ci-dessus.
