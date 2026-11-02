# Réunion des améliorations de chasse et du Homeworld R7

L’état de travail de chasse a été préservé par le commit `9e463aa13`, puis réuni avec `main` au commit `03cf51badd450338d748da55599a317a71debd28`. Les métadonnées, le classeur et les rapports R7 existants gardent exactement leurs octets. La réserve du trajet V104 est conservée avec les 64 contacts et 30 liaisons protégés par R7 ; le nouveau repère reste à sa position relue `(6270, 4990)`.

Les projections V103 conservent leurs deux contrats : projection canonique explicite pour l’éditeur et conversion historique interne pour V115. Le harnais Atlas sert les vrais modules Worker demandés et en consigne les empreintes. Les contrôles actuels ne demandent pas que l’application reproduise un défaut ancien.

## Vérifications réellement exécutées

- [359 assertions de chasse](hunting-native-359.log), dont le journal de reprise, les signaux à deux lignes et la sélection de carcasse portée, sur l’état de travail ensuite committé dans `9e463aa13`.
- [52 assertions Homeworld/planètes](homeworld-planets-52.log) sur l’arbre réuni : contacts conservés, trajets réels du moteur, reçus originaux et refus de migrations invalides, import concurrent et projection V103/V115.
- [TypeScript](application-types.log) et [ESLint ciblé](changed-source-lint.log) passent sur l’arbre réuni.
- [Neuf assertions historiques inchangées et trois générateurs d’origine](historical-homeworld-9-and-generators.log) passent dans une copie privée identifiée par le commit original `a5ed39dfbed118669b2e76402c490b200136a74d`. Les documents imbriqués et les sources historiques sont restaurés dans cette seule copie ; aucun ancien certificat n’est attribué au runtime actuel.

Le [relevé des sources courantes](source-inputs.json) couvre 2 456 fichiers d’application, de configuration, de build, de scripts et de tests, soit 126 722 812 octets. Il est ancré au commit `f269ea2290f41ecd7651854c216995d18ef52c1e` et se vérifie avec `node scripts/check-hunt-integration-source-v112.mjs --check`. Il ne constitue pas un build, un inventaire exhaustif des ressources publiques ni une réexécution des parcours archivés.

Le classeur chasse conserve 22 onglets et deux nouvelles clôtures justifiées. Les huit exigences atomiques restent ouvertes : six autres contrats navigateur, campagnes avec charge maintenue à pleine capacité, novices, matériel physique, performance cible et Microsoft Excel natif restent à qualifier selon leur protocole. Les autres rapports distinguent les mesures cloud du matériel cible.
