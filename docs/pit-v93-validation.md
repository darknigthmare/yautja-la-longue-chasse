# The Pit V93 — livraison et limites de validation

## Résultat de ce lot

Le runtime distingue désormais garde, introduction, victoire de manche, défaite de manche, attente étourdie de fatalité et provocation. Les introductions et le compte à rebours conservent leur blocage de la simulation. Le dizzy appartient uniquement au perdant pendant une vraie fenêtre de conclusion après KO décisif. Une provocation volontaire possède son propre transport sans suspendre le combat, et s'interrompt lorsque le moteur reçoit une action ou un changement réel du combattant. Aucun champ de combat, moveset, codec de sauvegarde ou replay historique n'est modifié.

Les 11 pages natives acceptées ajoutent 66 dessins et 22 clips orientés : garde/dizzy/taunt pour Jungle Hunter, Scar et City Hunter masqués ; dizzy/taunt pour Wolf masqué. Chaque direction est dessinée séparément. Les copies publiques sont identiques aux originales par SHA256. Les 28 originales sont conservées, dont 17 refusées et jamais chargées. Les anciennes gardes et cérémonies restent disponibles sans être comptées comme des créations V93.

Trois phases par direction constituent un **cycle court provisoire**. Ce lot ne termine ni les animations détaillées de tous les combattants ni leur certification 1:1. Wolf n'a toujours pas de nouvelle introduction, victoire ou défaite native admise. Aucune scène d'arrivée avec PNJ ou capsule n'est ajoutée sans référence propre au personnage. Les détails de chaque admission, des gouttières réellement mesurées et des refus sont dans `pit-native-lifecycle-v93.md` et les archives `art-source/v93/pit/`.

## Catalogue de production actualisé

Le dossier couvre 201 identités, 416 variantes explicites et 21 apparences historiques, soit 437 apparences. Le registre contient 76 atlas, 409 clips et 146 PNG uniques mesurés. Sur les 5244 demandes de famille/orientation, 5162 sont absentes, 78 possèdent seulement des dessins partiels et quatre sont des poses tenues. **Aucune demande n'est déclarée comme une animation détaillée complète.** Les déclarations et SHA des 135 PNG historiques restent conservés ; les neuf fixtures de replay contrôlées sont inchangées.

L'atelier `/pit-lab` lit le vrai renderer, avec boutons pour les six familles et costume/orientation exacts. Il ouvre maintenant la garde d'un costume même si ses autres familles ou ses directions sont réparties entre plusieurs pages. La garde gauche de Wolf est retrouvée automatiquement ; un atlas choisi explicitement reste respecté, y compris s'il ne contient pas le côté demandé. Le dossier exhaustif est chargé seulement à l'ouverture des directions de production ; il ne grossit pas le chemin d'exécution du combat. Les séquences non mesurées, poses tenues et variantes voisines ne deviennent jamais une couverture complète par repli ou miroir.

## Vérifications locales, 13 octobre 2026

- **147 tests ciblés PASS**, aucun échec ou skip, après gel des données et de l'atelier. Ils couvrent les pages PNG réelles, la sélection par costume/orientation, les pivots, les frontières temporelles, les vrais KO et dégâts moteur, les transports, le HUD, les replays et les movesets existants.
- Build finale **Next.js webpack PASS**, vérification TypeScript de la build PASS ; lint ciblé PASS.
- Les quatre contrôles du CSS réellement compilé du HUD passent. Ils ne certifient pas toute la cascade ni un CDN.
- Navigateur Edge sur la build de production locale : entrée libre sans créer de campagne, séquence des deux introductions puis compte à rebours, HUD habillé, provocation native de J1 et J2 pendant le combat, lecture native droite/gauche dans l'atelier, Scar masqué ouvert sur sa garde et statut `partial-native` des six familles vérifiés. Les mains, attaches et contacts au sol ont été relus visuellement ; cela n'est pas une certification anatomique microscopique.
- L'interruption au premier tick reçoit une preuve avec le vrai moteur. Le retour DOM immédiatement après un maintien clavier automatisé ne permet pas de certifier son rendu visuel ; cette limite est conservée. Les KO, cérémonies de résultat et fenêtres de fatalité sont vérifiés par les tests moteur, **pas par un KO joué jusqu'au bout dans ce navigateur**.

Les traces et captures sont conservées localement sous `work-local/v93/qa/`. Cette validation ne constitue pas un passage de tous les tests globaux du projet, de tous les personnages, de toutes les variantes, ni de toutes les tailles d'écran.

## Conservation et publication

Les deux premiers commits conservent chacun dix originales et leur provenance : `48c0ad01` puis `5d433664`. Le commit d'intégration ajoute les huit originales restantes, les copies publiques acceptées, le runtime, l'atelier, les tests et ce dossier. Aucun ancien sprite n'est supprimé.

Le commit Git, son envoi sur GitHub, l'état READY de Vercel et le chargement public de cette même révision sont des étapes distinctes. Les preuves locales ci-dessus ne doivent pas être présentées comme une confirmation de la version déployée. Le reçu de publication est tenu séparément dans `work-local/v93/qa/`.
