# Changelog PREY 1719 · V0.6.0

## Gameplay
- Furtivité enrichie par **bruit + posture basse** : marcher, sprinter et tirer produisent des signatures différentes ; la posture basse réduit la détection au prix de la vitesse.
- Ralentissement contextualisé dans le gué et le bourbier.
- Neuf profils de scènes/boss : cougar, grizzly, loup, duel monté et final du bourbier changent de comportement par phases.
- Les blessures Feral deviennent des états persistants : jambe blessée après F09 jusqu’au Medicomp de F10 ; avant-bras sectionné en F14 et conservé en F15.
- Le bouclier est donc indisponible après la section canonique du bras.
- La continuité V0.5 (IA spécifique, projectiles hostiles, couverture, sprint, Sarii, flèches récupérables) reste active.

## Chasse Feral
- Nouveau **registre de chasse** de 6 marques.
- Une seule marque est explicitement classée `physical-trophy` : le crâne du loup (`wolf-skull`). Les autres sont des jalons de chasse et ne sont pas présentés comme trophées physiques non attestés.
- Aucune arme Plasma Caster n’est ajoutée au Feral.

## Progression
- Sauvegarde **V6**, migrations V0.2 → V0.6, V0.3 → V0.6, V0.4 → V0.6 et V0.5 → V0.6.
- Statistiques ajoutées : bruit maximal, temps en posture basse et sauts entre dossiers miroir.
- Les dossiers miroir terminés permettent de relancer directement l’une des deux perspectives correspondantes.

## Homeworld / Mausolée
- Le dépôt hôte V65 possède déjà le service physique `Mausolée des Grandes Chasses` et le contrat `MausoleumDlcAdapter`.
- PREY V0.6 fournit `preyMausoleumAdapterV06.ts` et un patch local/réversible qui remplit `MAUSOLEUM_INSTALLED_CAMPAIGNS` avec l’adaptateur PREY.
- Le rituel natif du jeu hôte reste responsable de la saisie, de l’inspection, du port du masque et du retour au piédestal ; PREY ne duplique pas ce système.

## QA
- 37/37 chapitres chargés et terminés par le harnais runtime.
- 25 scénarios critiques PASS.
- QA statique, portable et intégration hôte/mausolée PASS.
- Chromium headless reste indisponible dans l’environnement de validation ; aucune capture navigateur V0.6 n’est revendiquée.
