# V46 — profil QA 4 : fiabilité et conservation des parties

Ce profil simule un joueur qui interrompt le jeu, change de partie, ouvre deux onglets et rencontre des refus de stockage. Il s'agit d'un profil de test automatisé distinct des audits novice, combat et accessibilité, pas d'un testeur humain extérieur.

## Vérification du moteur de sauvegarde

79 tests ciblés réussis le 23 septembre 2026 : `campaign-slots`, `active-hunt-ownership`, `active-hunt-save`, `complete-archive-adversarial`, `save-recovery-import`, `save-storage-status`.

Scénarios couverts : cinq propriétaires isolés, dix checkpoints manuels et deux autos rotatives, chargement sans fusion entre parties, révisions obsolètes, verrou concurrent, refus quota, écriture non relisible, versions futures conservées, récupération explicite de copies corrompues, rollback partiel et journal protégé, annexe de chasse suspendue, dossier Homeworld, reprise durable plus récente que le dernier auto, absence de rotation à vide.

Aucune nouvelle anomalie confirmée dans ces transactions. Leurs gardes ne sont pas assouplies pour les besoins du tutoriel. Les actions guidées ne doivent pas créer une preuve de nurserie accomplie ni attribuer de récompense supplémentaire.

## Vérification navigateur du build intégré

**11 parcours réussis sur le build V46 intégré**, sans erreur JavaScript ni réponse HTTP en échec : `scripts/verify-campaign-menu-v43.mjs`, avec `V43_CAMPAIGN_QA_OUTPUT=work/v46/resilience-browser-qa`. Vérifications : vraie première chasse, suspension et reprise en pause, isolation des parties, conservation des douze checkpoints, refus de quota, conflit entre onglets, menu clavier/manette simulée, création tactile et archives de version future. Rapport et sept captures conservés dans ce dossier.

La fermeture matérielle brutale du système et les manettes physiques ne sont pas certifiées par ces tests.
