# Livraison complète — accès depuis la PR #121

## État exact

Les liens ci-dessous donnent accès aux fichiers complets conservés dans le Drive du propriétaire. **Un lien dans une PR n'est pas un commit des fichiers liés. L'import dans la branche Git reste partiel.** Les autorisations Drive n'ont pas été rendues publiques.

La comparaison de l'archive complète (79 fichiers) avec les 54 fichiers de la PR au commit `520333c1ad9e590be2f5c7501c0b79a684812de2` révèle **28 fichiers absents**. Le précédent patch de 16 fichiers omettait 12 fichiers supplémentaires, dont le rapport visuel autonome v0.2, des inventaires, des archives de suivi et des journaux de test.

## Fichiers complets

- [Archive complète v0.1 + v0.2 reconstruite — 79 fichiers et 31 images](https://drive.google.com/file/d/17W6Wa0tnTm4G2PiF8JDbxO7BQNktJzcX/view?usp=drivesdk)
- [Patch complet — les 28 fichiers réellement absents](https://drive.google.com/file/d/1w-CzLSPtZuim82I6mayw8uY_bMIpF03B/view?usp=drivesdk)
- [Dossier de livraison du propriétaire](https://drive.google.com/drive/folders/1EyBJofVa7zUhkZ0bkwdo4vKzaatG7YjI)

L'archive contient les 18 SVG, les 7 captures PNG originales, les 6 captures PNG v0.2, les deux HTML standalone, les sources, les rapports et le ZIP v0.1 original. Les octets de l'archive n'ont pas été modifiés.

| Fichier | Octets | SHA-256 |
| --- | ---: | --- |
| `BADLANDS_PR121_V02_RECONSTRUITE_COMPLET.zip` | 4 931 101 | `db3fc9faf3a6a89a22ef0266a439e72a97bb9ca5701f463bce913484b6101909` |
| `BADLANDS_PR121_IMPORT_COMPLET_28_FICHIERS.patch` | 6 468 836 | `8efda32e10d55b9cbb810fdfa92c28ddd5b220dd224d4249015f7ed4df86eece` |

## Contrôles rejoués pour cette livraison

- CRC de l'archive complète et 42 empreintes SHA-256 historiques : réussis.
- 13 PNG vérifiés avec un décodeur d'images ; 18 SVG présents.
- 198 assertions v0.1 et 88 tests moteur v0.2 : réussis.
- Reconstruction du standalone v0.2 : identique, 92 019 octets.
- Nouveau patch : `git apply --check` puis application dans un dépôt temporaire réussis ; les 28 fichiers produits correspondent exactement aux octets du paquet.

Aucun nouveau test navigateur n'a été exécuté dans cette passe. Aucun nouveau sprite, aucune nouvelle certification 1:1 et aucune intégration native ne sont revendiqués.

## Appliquer le patch dans une copie locale de la branche

Ces commandes sont une procédure de reprise, **pas des commandes déjà exécutées sur GitHub**. Elles supposent le patch téléchargé et un dépôt propre sur la branche de la PR. Ne pas appliquer l'ancien patch de 16 fichiers en plus de celui-ci.

```sh
git switch feat/dlc-predator-badlands-import-20261106
git status --short
git apply --check /chemin/BADLANDS_PR121_IMPORT_COMPLET_28_FICHIERS.patch
git apply --binary --index /chemin/BADLANDS_PR121_IMPORT_COMPLET_28_FICHIERS.patch
git diff --cached --stat
git commit -m "feat(dlc): import all 28 remaining Badlands delivery files"
git push origin HEAD:feat/dlc-predator-badlands-import-20261106
```

Après publication effective, vérifier les empreintes et mettre à jour `IMPORT_STATUS.json`. Aucun script automatique, workflow de transfert, permission ou secret n'a été ajouté par cette livraison.
