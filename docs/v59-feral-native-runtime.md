# V59 — Présentation native de Feral

Les nouvelles planches appartiennent uniquement à l’apparence par défaut de Feral.
Elles couvrent le tir debout et l’attaque lourde au bouclier, dans deux directions
dessinées indépendamment. Elles ne sont pas attribuées aux variantes fournies par
l’utilisateur, aux attaques accroupies ni aux attaques aériennes.

L’atlas `feral-actions-v59` doit charger toutes ses pages et toutes ses phases.
Une seule direction prête ou un ancien idle disponible ne suffisent pas. Une
page absente suspend l’introduction, le compte à rebours et la simulation. Le
briefing d’entraînement reste également bloqué. Le bouton de nouvelle tentative
annule l’ancienne demande et attend une nouvelle banque complète ; les callbacks
d’une demande annulée ne peuvent pas la réactiver.

La version du moteur du replay est transmise comme option de présentation, sans
modifier les états de combat. Les replays V4 à V9 n’utilisent pas les nouveaux
dessins de tir : leurs anciennes trajectoires partent d’une origine différente
et restent accompagnées d’une pose historique tenue. Le bouclier V59 demeure
disponible, car son dessin ne dépend pas de cette origine. Les combats V10
utilisent les planches de tir et le départ physique mesuré dans ces planches.

Les quatre PNG restent inchangés. Le renderer utilise leurs cellules, pivots et
une échelle uniforme ; il ne crée ni miroir, ni interpolation, ni recoloration.
La lecture d’une phase suit les ticks de simulation et reste stable en pause.
Le mouvement réduit conserve ces indications essentielles du combat.

## Contrôles ciblés

- 23 tests du chargeur et du renderer passent, dont la page opposée absente,
  les anciennes banques, les annulations, les costumes exclus et les replays.
- L’audit de production passe sur les vrais PNG : SHA, dimensions, cellules,
  pivots, alpha, marges et chaque dessin transmis au renderer sont contrôlés.
- V59 remplace six anciennes phases d’attaque lourde par douze phases natives
  de lanceur et bouclier. Les quatre nouvelles pages contiennent seize dessins
  distincts ; leur réutilisation pendant une phase ne crée pas d’autres dessins.

Ces contrôles ne constituent ni une certification artistique 1:1, ni la livraison
de toutes les animations de Feral. La validation navigateur et la publication
sont consignées séparément dans le compte rendu de livraison.
