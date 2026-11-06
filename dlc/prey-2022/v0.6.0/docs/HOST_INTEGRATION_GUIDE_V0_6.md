# Intégration hôte · PREY 1719 V0.6

Base vérifiée : `darknigthmare/yautja-la-longue-chasse` au commit `73c0f6e8fe5e0a1301c6aa9becb5a67f0fb34aa9` (V65). Le `SaveGame` hôte reste V9 et PREY conserve une sauvegarde privée V6 (`yautja.prey.2022.dlc.v06`).

## 1 — Installation privée, zéro modification publique

```bash
node INSTALLER_PREY_V0_6.mjs /repo/yautja-la-longue-chasse install
node /repo/yautja-la-longue-chasse/private-dlc/campaigns/prey-2022/integration/prey-private-dev-server-v06.mjs
```

Le bridge écoute par défaut sur `127.0.0.1:4319` et sert uniquement le dossier du DLC. Endpoints :

- `/__prey/status` — version, schéma V6, compteurs, disponibilité du mausolée ;
- `/__prey/descriptor` — descripteur privé ;
- `/JOUER_PREY_DLC_V0_6.html` — runtime modulaire ;
- `/JOUER_PREY_DLC_V0_6_PORTABLE.html` — build autonome.

Le bridge renvoie CORS `*` afin que l’interface de développement du jeu hôte puisse le sonder depuis un autre port local.

## 2 — Carte PREY dans le menu principal (facultatif)

```bash
node private-dlc/campaigns/prey-2022/integration/APPLIQUER_CARTE_PREY_LOCALE_V0_6.mjs /repo/yautja-la-longue-chasse install
```

Le patch s’applique seulement à une structure `CampaignMainMenu.tsx` reconnue, conserve une copie + SHA et ajoute la carte uniquement en `NODE_ENV === 'development'`. Si le fichier hôte change ensuite, la désinstallation automatique refuse de restaurer un backup ancien (code 6).

## 3 — Mausolée natif du Homeworld (facultatif, recommandé pour le flux immersif)

Le V65 hôte contient déjà `Mausolée des Grandes Chasses`, une chronique `prey`, le rituel de masque et l’interface `MausoleumDlcAdapter`. PREY V0.6 n’invente donc pas un deuxième mausolée.

```bash
node private-dlc/campaigns/prey-2022/integration/APPLIQUER_MAUSOLEE_PREY_LOCAL_V0_6.mjs /repo/yautja-la-longue-chasse install
```

Le patch :

1. vérifie `app/game/systems/mausoleum.ts` ;
2. copie `preyMausoleumAdapterV06.ts` dans les systèmes du jeu ;
3. inscrit l’adaptateur PREY dans `MAUSOLEUM_INSTALLED_CAMPAIGNS` ;
4. laisse le jeu hôte gérer l’accès par rang, le ticket de retour et le rituel `take → inspect → wear → boot → …` ;
5. l’adaptateur vérifie le bridge V0.6 puis ouvre la campagne humaine avec un ticket de retour propriétaire ;
6. la restauration est protégée par SHA et refusée si `mausoleum.ts` a changé depuis l’installation.

Retrait :

```bash
node private-dlc/campaigns/prey-2022/integration/APPLIQUER_MAUSOLEE_PREY_LOCAL_V0_6.mjs /repo/yautja-la-longue-chasse uninstall
```

## Pourquoi la sauvegarde reste isolée

Les 37 chapitres PREY utilisent Naru, Taabe et un arsenal Feral qui ne correspondent pas aux unions fermées `MissionId`, `WeaponId` et au runtime `HuntCanvas` du jeu principal. Fusionner artificiellement ces données dans le `SaveGame` V9 risquerait de casser les archives de campagne. Le V0.6 raccorde le lancement et le retour via les contrats déjà présents tout en laissant la progression PREY dans son propre schéma.

Aucun push GitHub ni déploiement public n’est effectué par ces scripts.
