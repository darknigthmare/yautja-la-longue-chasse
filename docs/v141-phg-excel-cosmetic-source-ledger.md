# V141 — Excel de preuve, catégories PHG et droits de biomask

La version [QA V141](./production/Yautja_PHG_QA_Visual_Morphologies_V141.xlsx) prolonge sans effacement V138, V139 et V140 : **1 134** cas de contrôle visuel, **40** dossiers documentaires, **52** parités CSS/Canvas et **18** tests de filtrage.

L'onglet **Sources_PHG_V141** ajoute 23 lignes sourcées par catégories issues des patch notes officiels :
- 2 teintes d'armure PHG **Requiem** / **Nova**, non installées comme matières d'armure dans le moteur (sources V120 candidates), et **différentes** des teintes de biomask portant le même nom ;
- 8 peintures de biomask, dont 7 études originales V132 et Ogre V131 ;
- 1 teinte **Waves/Gator** de peau, distincte du Warpaint Waves ;
- 3 géométries de masque dont le modèle original n'est pas encore certifié (Mr Black, City Hunter Rebreather, Saber) ;
- 6 Warpaints, encore dépourvus de sources de pixels authentifiées ;
- 3 restrictions ou corrections issues des patchs 2.50 / 3.00, dont **Pirate sans Warpaint/Scar officiels**.

L'onglet **Portées_V141** comprend **144** combinaisons (9 biomasks reconnus × 2 origines × 8 teintes), dont 63 légalement compatibles et 81 incompatibles, et un tableau de bord à valeurs calculées. Ces autorisations ne sont **pas** des preuves artistiques. Les modèles originaux V133 ne sont pas des copies PHG ; un identifiant inconnu est explicitement rejeté par `maskClassForAppearanceV132`.

Le script `verify-phg-official-v141.py` vérifie l'empreinte SHA-256, les catégories, tous les anciens éléments, 144 contrôles, et empêche tout faux label 1:1. La CI V139 continue à vérifier les versions historiques ; la V141 y est ajoutée et exécutée à chaque changement.

Source : https://forum.predator.illfonic.com/t/patch-notes-2-19/20975 et https://predator.illfonic.com/news/patch-notes-2-50/, https://predator.illfonic.com/news/patch-notes-3-00/.
