# Manquants art Homeworld — lecture du 2 novembre 2026

Le manifeste sélectionne exactement les 40 cibles V111 `MISSING` et l’unique `MISSING_ANIMATION` (Forge active, `target-v81-63-141`). Les 313 familles avec candidats ne font pas partie de cet audit. Aucune admission ni clôture artistique n’est déclarée.

`MISSING` ne signifie pas fichier référencé absent : les 110 chemins de preuve candidats vérifiés existent. Les deux cibles ascenseur (`55-40`, `55-41`) possèdent déjà portique et cabine natifs V82 ; 38 autres n’ont pas de sprite indépendant identifié dans la recherche ciblée. Les sources ne prescrivent aucun nom de livraison dont on pourrait certifier l’absence.

Le JSON donne pour chacune l’ID exact, la ligne du brief, les cellules réelles `CatalogueArtV111` et `CatalogueArtV112`, les voisins existants (dimensions/SHA256) et les critères d’admission.

| ID | Cible | Cellules V112 : ID / libellé / présence |
| --- | --- | --- |
| target-v81-55-26 | balcon | A30 / C30 / D30 |
| target-v81-55-40 | ascenseur | A44 / C44 / D44 |
| target-v81-55-41 | cage ascenseur | A45 / C45 / D45 |
| target-v81-55-42 | tunnel | A46 / C46 / D46 |
| target-v81-55-43 | entrée tunnel | A47 / C47 / D47 |
| target-v81-56-56 | sas hangar | A60 / C60 / D60 |
| target-v81-56-58 | porte énergétique | A62 / C62 / D62 |
| target-v81-57-71 | émetteur énergie gauche | A75 / C75 / D75 |
| target-v81-57-72 | émetteur énergie droit | A76 / C76 / D76 |
| target-v81-57-73 | champ énergétique | A77 / C77 / D77 |
| target-v81-59-105 | hangar | A109 / C109 / D109 |
| target-v81-63-141 | Forge active | A145 / C145 / D145 |
| target-v81-65-175 | totem | A179 / C179 / D179 |
| target-v81-66-192 | crochet | A196 / C196 / D196 |
| target-v81-68-236 | trappe | A240 / C240 / D240 |
| target-v81-71-266 | Enclos | A270 / C270 / D270 |
| target-v81-71-267 | poteau enclos | A271 / C271 / D271 |
| target-v81-71-268 | barrière enclos | A272 / C272 / D272 |
| target-v81-71-270 | barrière énergie | A274 / C274 / D274 |
| target-v81-71-271 | abreuvoir alien | A275 / C275 / D275 |
| target-v81-71-272 | nourrisseur | A276 / C276 / D276 |
| target-v81-71-273 | support harnais | A277 / C277 / D277 |
| target-v81-71-276 | cage petite | A280 / C280 / D280 |
| target-v81-71-277 | cage moyenne | A281 / C281 / D281 |
| target-v81-71-278 | cage lourde | A282 / C282 / D282 |
| target-v81-71-280 | signal danger | A284 / C284 / D284 |
| target-v81-72-282 | support harnais | A286 / C286 / D286 |
| target-v81-72-283 | harnais | A287 / C287 / D287 |
| target-v81-72-284 | selle | A288 / C288 / D288 |
| target-v81-72-285 | rack selle | A289 / C289 / D289 |
| target-v81-72-288 | mangeoire adaptée | A292 / C292 / D292 |
| target-v81-73-295 | tuyau apparent | A299 / C299 / D299 |
| target-v81-73-301 | pile scrap | A305 / C305 / D305 |
| target-v81-73-305 | petite cage | A309 / C309 / D309 |
| target-v81-73-308 | échafaudage | A312 / C312 / D312 |
| target-v81-74-310 | Générateur | A314 / C314 / D314 |
| target-v81-74-311 | transformateur | A315 / C315 / D315 |
| target-v81-74-315 | radiateur | A319 / C319 / D319 |
| target-v81-74-316 | pompe | A320 / C320 / D320 |
| target-v81-74-319 | valve | A323 / C323 / D323 |
| target-v81-76-354 | alcôves | A358 / C358 / D358 |

Meilleurs lots : utilités faune271/272/280 (3 candidats produits hors repo, 4 PNG bruts conservés), ensuite poteau/barrière/petite cage/support harnais, puis modules industriels. Les 3 candidats ne passent pas le cadrage strict demandé 48 px au seuil alpha>0 ; bruit faible consigné, aucune retouche. Prompts, empreintes, rectangles alpha et pivots proposés : `/workspace/native-production-20261102/`.

La forge demande un cycle natif peint et un raccordement aux supports réels, plus qu’un pulse CSS. Les bâtiments lourds (hangar, sas, tunnel, balcon, alcôves) demandent implantation, orientation et accès avant production. Aucun parcours navigateur ou validation humaine n’a été réalisé.
