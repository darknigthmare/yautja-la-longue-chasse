# Audit V94 — PR4, suite 09 : scores du vaisseau

Base de cette passe : `76c33efcf9cef5943b221531b73655822f9537ca`.
PR maintenue en brouillon, sans fusion ni modification de la production.

## Raccords réalisés

`ShipHub` utilise maintenant `useShipTrainingV94` et un reçu de tentative
`shipTrainingReceiptV94`. Les cinq disciplines et leurs règles restent inchangées.
Le score et sa date sont figés à la conclusion. La progression locale et le message
« sauvegardé » attendent la confirmation du writer et de sa relecture.

Une écriture perdue, un quota ou un refus de lecture ne compte pas une deuxième
épreuve lors du réessai. Un résultat déjà écrit est reconnu exactement ; le reçu
ne réécrit pas le sidecar pour le seul besoin d'annoncer le succès. Une archive
étrangère, future, corrompue ou modifiée depuis la tentative n'est pas remplacée.
Les changements de progression dans le même écran sont également détectés.

La fermeture du seul exercice conserve son reçu et un bouton de reprise dans le
vaisseau. Les autres mutations locales du sidecar, dont le minuteur médical,
attendent qu'un score en suspens soit réglé. Les rafraîchissements des callbacks
parent ne rechargent plus une archive ancienne par simple changement d'identité.
Les soins, configurations et changements de coque ne doivent plus annoncer une
réussite quand le writer renvoie une absence de confirmation.

Une épreuve externe possède une identité de requête, une fenêtre d'attente
annulable et une commande de retour remappée/manette. Doubles demandes, réponses
après annulation/démontage et réponses appartenant à une autre campagne sont
refusées. La progression actuelle, et non celle capturée avant l'attente, est
utilisée. L'attente externe empêche l'entrée dans une autre installation derrière
sa fenêtre. Les suspensions et le réglage manette sont transmis au vrai drill.

En intégration contrôlée, la progression est transmise une seule fois au parent,
sans écriture locale implicite. Le message indique une transmission et une
sauvegarde non vérifiée. Une exception du destinataire n'entraîne pas de rejeu.

## Validation reproductible

```
node --test tests/ship-training-receipt-v94.test.mjs tests/ship-training-lifecycle-v94.test.mjs
node --experimental-strip-types --test tests/ship-progression.test.mjs tests/ship-progression-owner.test.mjs tests/ship-hub-input-runtime.test.mjs tests/training-drill.test.mjs tests/training-lifecycle-v94.test.mjs
AUDIT_CHROME_CHANNEL=chrome node scripts/qa-ship-training-browser-v94.mjs
```

Avant publication : 52 nouveaux tests locaux réussis (27 reçu, 25 cycle de vie),
45 tests historiques locaux réussis parmi ceux exécutables avec les dépendances
disponibles. Les deux fichiers historiques utilisant Vite nécessitent la CI.
Le bundle du vrai panneau se construit localement ; ce n'est pas un contrôle
TypeScript global. Chromium local refuse les navigations par une politique de
l'environnement : aucun scénario navigateur local n'est annoncé réussi.

Le workflow `ship-training-v94.yml` est en lecture seule et installe les dépendances
verrouillées. Il ne remplace pas les workflows principaux de compilation et de
persistance. Les résultats CI associés au SHA effectivement publié doivent être
consultés dans la PR, sans reconduire un succès d'une révision antérieure.

## Portée et limites

Le montage navigateur utilise le vrai ShipHub et le vrai TrainingDrill, des gestes
réels sur les contrôles, un profil synthétique et le stockage natif d'une origine
locale isolée. Les images sont remplacées par un pixel de test. Ce n'est pas une
qualification de campagne complète, de graphisme ou de matériel physique.

Le reçu de score reste en mémoire **tant que ce ShipHub reste monté**. Fermer
l'épreuve n'est pas fermer l'application ou quitter le vaisseau. Le message demande
de réessayer avant de partir ; cette passe n'ajoute ni récupération après arrêt
forcé, ni migration générale des sauvegardes. Elle ne revendique pas une transaction
atomique multi-onglets pour les anciens writers du sidecar. Le registre IndexedDB
des exercices de clans demeure séparé.

Les callbacks contrôlés n'offrent pas d'accusé de persistance : on ne prétend pas
que leur retour void certifie une sauvegarde. Les compléments GameClient et combat
non publiés dans les suites antérieures ne sont pas intégrés par cette passe.
Aucune dépendance, image, règle de score, déblocage de rang ou DLC n'est ajouté.
