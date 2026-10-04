# Registre physique du Homeworld V83

Le vrai atlas `HomeworldWorldMapV77` reçoit la partie active et inclut une recherche parmi les lieux visitables, services, interlocuteurs et sorties visibles, sur tous les étages. Les conseils de PNJ en `point:...` et les identifiants directs sont résolus en fiches réelles ; choisir une fiche montre son étage et son emplacement, sans déplacer le joueur.

`homeworldAtlasLandmarksV83.ts` conserve les descriptions et conditions narratives existantes V75, mais prend toutes les positions dans les fournisseurs physiques V77 et les liaisons intérieures actuelles. Les coordonnées anciennes du port et les parcours du plan V75 à un seul étage ne sont pas utilisés. Un service intérieur est repéré sur sa vraie porte extérieure ; la consultation ne valide ni discussion, ni soin, ni enquête, ni équipement ou rang.

L’itinéraire indiqué entre étages est une succession de raccords existants, non un chemin A* joué ou une promesse d’optimalité. Le joueur rejoint lui-même les paliers bleus et utilise Interagir. Le registre n’appelle pas l’ascenseur et ne déclenche aucun transit. Les sorties ordinaires fermées restent affichées avec leurs conditions ; la réserve sensible reste absente tant que la visibilité narrative existante ne l’autorise pas.

Clavier et focus manette comprennent le champ de recherche et les boutons du registre. La carte reste un outil de consultation : aucune mutation de progression, de position ou de sauvegarde n’est ajoutée. L’intégration V83 n’a fait l’objet d’aucun test ou parcours navigateur, conformément à la consigne actuelle.
