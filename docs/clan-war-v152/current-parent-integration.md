# Réconciliation des têtes parentes de V152

Les têtes de #76 et de #77 ont avancé après la création de leurs branches
enfants. La branche #78 contenait la provenance V152, mais pas les six commits
les plus récents de #77 qui ajoutent les tests d'arrêt et de reprise RTS sous
verrou. La branche #77, issue d'une version antérieure de #76, ne contenait pas
non plus les corrections plus récentes du Conseil qui refusent des statuts ou
points de vie incohérents, ni l'Excel V147 final de #76.

Cette intégration conserve ensemble les têtes #76 `8dcbed32`, #77 `d9237b86`
et #78 `29b5dd20`, sans modifier les PR parentes ni fusionner vers main. Les
classeurs existants V147, V151 et V152 sont conservés séparément. Aucun statut
de suivi n'est clos par ce rapprochement.

La CI dédiée rejoue les tests source, les archives de test et les garde-fous
V85, vérifie les XLSX, puis utilise Chromium avec deux vrais panneaux V115 pour
le verrou, le reset et la reprise RTS. Ces vérifications ne certifient ni une
sauvegarde historique de joueur, ni GameClient complet, réseau, autres appareils
ou fidélité artistique 1:1. Les sources V6/W3 restent distinctes de la campagne
V85 ; la validation locale des reçus ne constitue pas une signature serveur.
