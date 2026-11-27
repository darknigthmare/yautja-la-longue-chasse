# QA REPORT — AVP:R WOLF v0.7.0-candidate.1

## Résultat

- `validate.mjs` : PASS
- `runtime-smoke.mjs` : PASS
- `deep-runtime-tests.mjs` : **94/94 PASS**
- `full-route-tests.mjs` : PASS
- installateur : PASS, deux installations donnent un seul bouton
- désinstallateur : PASS, aucun résidu
- route Cinéma : **45/45 zones**, **16/16 preuves**, **45/45 sync**
- route Unrated : **47/47 zones**, **16/16 preuves**, **47/47 sync**

## Nouveaux tests v0.7

- migration v0.6 → v0.7 ;
- chaîne de chasse et multiplicateur ;
- expiration de chaîne ;
- rupture de chaîne en cas de dommage ;
- trauma standard ;
- charge acide ;
- Medicomp réinitialisant trauma/acide/blessure canonique ;
- blessure canonique de centrale ;
- réduction de mobilité ;
- mémoire d'alerte après impact malgré cloak ;
- flanking entre plans ;
- compteur de flanking ;
- télégraphe du Predalien ;
- esquive de l'attaque spéciale ;
- restauration blessure/chaîne par checkpoint ;
- débrief de chapitre ;
- métrique HUD de chaîne ;
- première mêlée de l'hôpital limitée à deux cibles initiales + une cible Cleaner.

## Visuel

Chromium 144 est installé mais le mode headless bloque toujours sur DBus/zygote dans ce conteneur. La tentative est conservée dans `docs/qa/chromium-v07-attempt.log`. Les 8 captures Chromium v0.3 restent archivées comme historique et ne sont pas utilisées pour prétendre certifier le rendu v0.7.
