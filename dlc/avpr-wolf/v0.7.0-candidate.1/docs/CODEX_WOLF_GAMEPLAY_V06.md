# CODEX GAMEPLAY — WOLF v0.6

## Contrôles

- A / D : déplacement horizontal
- W / S : changer de plan
- Espace : bond
- F : attaque / action F du grapple final
- E : interaction / action E du grapple final
- Q : parade
- Shift : esquive
- 1–8 : sélectionner une arme
- V : changer la vision du biomask
- C : camouflage
- T : pulse de pistage
- R : Cleaner Fluid
- G : mine laser
- H maintenu : Medicomp
- M : carte de la route
- K : audio procédural on/off
- P / Échap : pause

## Difficultés

**Film Canon** conserve les valeurs de référence du runtime. **Vétéran** et **Chasse Noire** renforcent seulement les valeurs de combat et le multiplicateur de score. Les scripts canoniques, nombres d'adversaires documentés et transitions ne changent jamais.

## Protocole de chasse

Le score d'honneur récompense la propreté et l'efficacité mais ne change jamais la fin. Les seuils de rang sont : D < 2000, C ≥ 2000, B ≥ 3600, A ≥ 5400, S ≥ 7200.

Le score augmente avec les objectifs de scène, les traces dissoutes, les pièces traversées sans dégâts, les Xénomorphes neutralisés, certaines actions techniques et les phases majeures du Predalien. Il diminue avec les dégâts et les reprises de checkpoint.

## Checkpoints

Chaque pièce enregistre un snapshot d'entrée : intégrité, énergie, inventaire, arme, vision, flags, progression des preuves et score. Une mort ou le bouton `CHECKPOINT DE PIÈCE` restaure ce snapshot et ajoute une pénalité de chasse. Aucun checkpoint ne permet de contourner un événement canonique.

## Duel final

1. Endommager le Predalien jusqu'à la rupture du wrist gauntlet.
2. Poursuivre jusqu'au retrait volontaire de l'équipement et du biomask.
3. Continuer au corps-à-corps jusqu'à l'arrachement de la mâchoire interne.
4. Ramener le Predalien au seuil final.
5. Alterner F/E pendant le grapple. La réussite reproduit l'échange mortel ; elle ne crée aucune fin alternative.
