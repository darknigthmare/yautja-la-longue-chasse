# QA — AVP:R WOLF v0.6.0-candidate.1

## Statut

Candidate jouable validée par contrôle structurel, runtime VM et simulations de route complètes.

| Contrôle | Résultat |
|---|---|
| Structure / transitions | OK |
| 47 zones / 14 chapitres / 8 armes | OK |
| 2 scènes Unrated, skip cinéma | OK |
| 6 sprite-sheets | OK |
| Corrections de fidélité v0.6 | OK |
| Runtime smoke duel | OK |
| Tests ciblés | 66/66 |
| Route Cinéma | 45/45 · 16/16 preuves · 45/45 sync |
| Route Unrated | 47/47 · 16/16 preuves · 47/47 sync |
| Rang / score / difficultés | OK |
| Checkpoint de pièce | OK |
| Migration v0.5 → v0.6 | OK |
| Standalone distant | aucune dépendance externe |

## Couverture ciblée supplémentaire

- aucune apparition vivante de Facehugger dans la forêt Buddy/Sam ;
- Combistick verrouillé à la piscine ;
- Power Punch obligatoire à la sortie des égouts ;
- séquence magasin à 2 humains → 5 Xénomorphes ;
- scaling Film Canon / Chasse Noire ;
- score de nettoyage, kill et pièce parfaite ;
- restauration de checkpoint et pénalité ;
- maternité sans combat inventé ;
- un seul Xénomorphe avant le duel du toit ;
- arrachement de la mâchoire interne avant grapple final.

## Navigateur

Chromium 144 est présent mais le mode headless expire avant le rendu à cause d'erreurs DBus/zygote propres au conteneur. Aucune capture v0.6 n'est donc étiquetée comme capture navigateur. Le log est conservé dans `docs/qa/chromium-v06-store.log`.
