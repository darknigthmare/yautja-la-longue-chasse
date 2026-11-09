# Mobilité — poursuite des P0 du 9 novembre 2026

Sources : `production/mobility-20261108/Yautja_Mobilite_Gameplay_20261108.xlsx`,
feuille `Reste_a_faire`, lignes 6 et 7, critères **MOB-001 / MOB-002**, priorité P0.

**MOB-001 est qualifié dans son périmètre**, par le
[parcours natif complet](campaign-attempt-2/final-receipt.json) et son
[complément de notices sur le build courant](notice-attempt-1/final-receipt.json).
MOB-002 dépend des preuves globales de build, lint et régressions consolidées par
le propriétaire du lot ; aucun reçu de ce sous-dossier ne le ferme à lui seul.

## Corrections

- Le portefeuille du garage était coupé dans le vrai conteneur de service de
  GameClient. La largeur et les grilles respectent maintenant le conteneur ; les
  en-têtes peuvent revenir à la ligne, y compris en 390 et 320 pixels.
- Les cartes du catalogue conservent des boutons natifs avec `aria-pressed`,
  dans leurs éléments de liste. Les cinquante entrées restent présentes.
- Les erreurs et avertissements ESLint de mobilité ont été corrigés sans
  désactiver de règle ni supprimer de cas de test.
- Le premier parcours réel a révélé une halte involontaire : la rotation
  automatique des checkpoints suspendait le propriétaire de la conduite puis
  refusait son buffer. Le propriétaire GameClient diffère maintenant cette
  rotation périodique pendant une sortie active ; les commandes restent
  sauvegardées et les checkpoints manuels conservent leur contrat.
- Les notices annoncent une pause confirmée et remplacent une ancienne erreur
  par l'accusé réel après reprise. Le succès des écritures régulières ne déclenche
  pas une nouvelle annonce à chaque demi-seconde.

## Vérifications

- [Suite unique de domaine](domain-verified/report.json) : **189 réussis,
  zéro échec, ignoré ou todo**, sept fichiers. Elle utilise les vrais réducteurs,
  le propriétaire de sauvegarde, les archives et le SSR. Les répétitions ne sont
  pas additionnées.
- [Lint ciblé](lint-final/report.json) : 21 fichiers, zéro avertissement ; les
  deux nouveaux pilotes natifs et le correctif de notice passent également le
  lint strict. Ce n'est pas un résultat de lint global du dépôt.
- [Parcours MOB-001](campaign-attempt-2/final-receipt.json), build
  `nItYejsE7HSH4L0ykJM5K` : **29 contrôles, 68,398 secondes de conduite réelle,
  dix PNG originaux inspectés**, zéro erreur. Vraie porte de Forge, contournement
  de l'établi, formation des trois balises et colis, refus d'achat puis reprise,
  refus de mouvement puis reprise du même buffer, Continuer depuis un ancien
  checkpoint vers le canonique actuel, puis récupération et retour physique.
- [Complément de notices](notice-attempt-1/final-receipt.json), build
  `mdrvYovYvfvhuJqeZXn1D` : **13 contrôles, trois PNG originaux inspectés**,
  zéro erreur. La sauvegarde réellement gagnée dans le parcours précédent est
  rejouée et annoncée comme telle. La dette est payée explicitement ; la pause
  et un nouveau refus d'écriture/reprise vérifient les notices et les données.
  Ce complément n'est pas un nouveau parcours complet de 29 contrôles.

Les octets JS/CSS servis sont comparés aux vrais builds. Les rangs, honneur,
missions, trophées et inventaire restent inchangés. La formation ne crée pas de
véhicule : la remise reste distincte. Aucun résultat de conduite, callback de
jeu, horloge ou collision n'est remplacé ; les refus de quota sont déclarés.

Les tentatives `native-probe-*` servent uniquement au repérage. Le premier
parcours complet échoué reste dans `campaign-attempt-1`, avec son
[diagnostic daté](auto-checkpoint-diagnosis.json). Son ancien reçu n'est jamais
réécrit pour lui attribuer le correctif de notice plus récent.

Les premiers échecs de tests restent aussi conservés : un sous-processus Node
bloqué par `EPERM`, puis une erreur de renommage dans une boucle de test,
corrigée avant la suite `domain-verified`.

## Limites

Le checkpoint initial du parcours est un adulte historique déclaré, sans permis,
registre, engin ou résultat de mobilité. Il ne s'agit pas d'une campagne jouée
depuis la nurserie. Le complément rejoue une sauvegarde réellement gagnée.

Les contrôles de largeur en 390/320 pixels ne valent pas un essai de tablette ou
de manette physique. Les silhouettes restent des sources statiques en revue ;
aucune nouvelle animation, ressource graphique ou validation artistique humaine
n'est déduite de cette qualification. Les autres chantiers MOB P1 restent
suivis séparément.
