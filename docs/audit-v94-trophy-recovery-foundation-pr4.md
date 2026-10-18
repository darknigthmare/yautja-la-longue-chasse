# Audit V94 — suite 12 : fondation de récupération des rites

17 octobre 2026. Départ : `017aed3befadf41cc68b149a2aaf250bfdfbcb68`.

## État exact

**Les modules et tests de récupération sont disponibles, mais le raccord à GameClient n'est PAS publié dans cette passe.** Le jeu ne sauvegarde donc pas encore automatiquement les rites non confirmés dans ce nouveau journal. Ce chantier reste ouvert. Les confirmations et gardes de la suite 11 restent actives.

La copie complète du raccord a été préparée localement. La publication d'un transport temporaire du gros fichier parent a été bloquée par un contrôle de sécurité ; ce transport n'a pas été installé et n'a pas été contourné. Seuls les fichiers de domaine, le hook autonome, les tests et la CI en lecture seule sont publiés directement. Le patch parent et sa fixture navigateur sont livrés séparément, comme non intégrés.

## Comportements implémentés dans les modules

- Reçu JSON borné et versionné pour une seule action : nettoyage, préparation, exposition ou rite. Propriétaire, prérequis, dates, score et progression vérifiés.
- Restauration sans accès au stockage ni écriture. Un réessai explicite compare la campagne complète, sauf sa date externe de dernière écriture.
- Reconnaissance d'un résultat déjà écrit avant une relecture échouée ; aucune récompense rejouée et aucun faux reçu interne de sauvegarde recréé.
- Réessais successifs conservés même après normalisation de cette date externe au rechargement.
- Journal IndexedDB indépendant `yautja.trophy-workshop.v94.recovery`, version 1, magasin `pending`, une copie par propriétaire. Limite de 4 fois la taille maximale sérialisée d'une campagne.
- Confirmation sur fin de transaction, comparaison avant remplacement/suppression, file ordonnée, refus des bases futures ou indisponibles. Aucun repli en écriture localStorage sans contrôle.
- Hook autonome : lecture initiale, copie, export exact, abandon explicite de la copie seulement et nettoyage après confirmation. Retours asynchrones invalidés après fermeture/changement de propriétaire.

## Validation et limites

59 nouveaux cas Node : 43 domaine/journal et 16 cycle de vie du hook. 149 tests Node du groupe de persistance passent localement, incluant les 53 tests existants du parent non modifié. Le lint ciblé passe. Le TypeScript global local n'a pas terminé dans la limite d'exécution ; consulter les résultats CI du commit publié.

Le nouveau script navigateur teste les API réelles et le stockage natif sur des opérations synthétiques, sans GameClient ni séquence de gestes. Il ne constitue pas une campagne jouée. Le script historique des rites joués reste inchangé. Les résultats GitHub doivent être associés au SHA courant, sans recopier le succès d'une ancienne révision.

Une copie de secours n'est pas une sauvegarde de campagne. Même après raccord, sa disponibilité nécessitera une transaction confirmée et des données de navigateur conservées. Le journal n'unifie pas l'atomicité de tous les stockages, n'ajoute pas de cloud et ne protège pas contre l'effacement du profil navigateur.

## Pour terminer l'intégration

Raccorder le hook à la session de campagne, différer les écritures automatiques pendant la vérification, afficher les états copie/erreur/conflit, appeler backup après refus et confirmed après accord, puis qualifier les gestes réels suivis d'un rechargement. Le patch local accompagne le rapport de conversation, mais aucune de ces étapes parent ne doit être supposée active à partir de la seule présence du module.

Aucun changement de schéma de campagne, dépendance, asset, rang ou contenu narratif. Aucune fusion de la PR ni publication de production.
