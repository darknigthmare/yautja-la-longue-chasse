# Bridge privé PREY V0.6

Le bridge est un serveur HTTP local minimal destiné au développement et au lancement depuis le Homeworld/menu du projet hôte.

```bash
node prey-private-dev-server-v06.mjs
```

Adresse par défaut : `http://127.0.0.1:4319`.

Il ne publie rien sur Internet et ne pousse aucun fichier. Le port peut être remplacé par `PREY_DLC_PORT` ou par le premier argument CLI.

## Adaptateurs

- `preyPrivateDlcAdapterV06.ts` : état/résumé du DLC pour le menu local ;
- `preyMausoleumAdapterV06.ts` : implémente le contrat natif `MausoleumDlcAdapter` du V65 ;
- `APPLIQUER_CARTE_PREY_LOCALE_V0_6.mjs` : patch optionnel du menu de développement ;
- `APPLIQUER_MAUSOLEE_PREY_LOCAL_V0_6.mjs` : patch optionnel et réversible du registre du mausolée.

Les deux patchers utilisent un backup et un SHA du fichier patché. Une modification ultérieure du fichier hôte bloque la restauration automatique plutôt que d’écraser le travail récent.
