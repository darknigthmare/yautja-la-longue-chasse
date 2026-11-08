# Retour du Berceau — relecture indépendante du 8 novembre 2026

Portée : raccord R2-M027 dans `buriedCradleReturn.ts`, `buriedCradleCampaign.ts`, `BuriedCradleReturnPanel.tsx`, `ShipInterior25D.tsx` et son écriture depuis `GameClient.tsx`. Base Git antérieure aux modifications : `04eb4caa217ad114faf1cf63b301b4df67736b2d`.

## Sauvegarde et progression

Un sondage indépendant a utilisé les fonctions de production, le chargeur SSR existant et `createCradleReturnRoute` pour parcourir réellement les chemins et seuils du modèle de vaisseau : soins, inspection, puis analyse personnelle à l'atelier. Après chacune des révisions 1, 2 et 3, `parseSaveImport(JSON.stringify(save))` a conservé exactement le dossier `buriedCradle`. La progression de terrain est restée identique.

Les anciens dossiers `reported` sans champ `returnVisit`, ainsi que ceux portant explicitement `returnVisit: null`, restent acceptés par l'import. Ils gardent le protocole historique ; cette compatibilité ne constitue pas une preuve de parcours des trois nouvelles étapes.

La lecture des gardes confirme que les nouvelles commandes exigent le vaisseau affecté et possédé, un retour actif, la salle correcte, un point praticable à portée du poste, la révision attendue et l'ordre soins → examen → choix. L'écriture passe par le mécanisme de campagne existant ; la scène ne confirme pas une écriture refusée. La crête et le snapshot d'extraction ne sont pas réécrits par les soins.

Aucun nouveau défaut de corruption, de double récompense ou de promotion automatique n'a été établi dans cette relecture. Les tests du chantier racine restent la source de preuve pour les matrices d'import, les écritures incertaines et la première preuve de reine ; les sondages ci-dessus ne les remplacent pas.

## Commandes et focus

La première version ne rendait pas le panneau utilisable à la manette seule : le contrôleur de menus global est inactif sur le pont. Le raccord corrigé ajoute Y/Triangle depuis la scène et un contrôleur de menus local actif lorsque le panneau possède le focus. B/Échap, le bouton de retour et les commandes de guidage rendent le focus aux déplacements.

`input-routing-probe.json` rapporte un sondage du véritable code des callbacks `tick`, `stop` et `focusCradleReturn`, extrait de `ShipInterior25D.tsx`, avec des objets de navigateur de test. Le véritable `menuPadStep` est également exécuté. Les vérifications réussies portent sur :

- l'attente d'un état neutre si A ou Y est maintenu à l'entrée ;
- la priorité de Y sur A lors d'un appui simultané, sans ouverture du service générique ;
- l'absence de réouverture pendant que le panneau détient le focus ;
- le retour à la scène sans activation du service si A/B est encore maintenu ;
- une seule activation pour A après relâchement, même si l'appui se prolonge ;
- l'armement neutre et le front unique de confirmation du menu.

La preuve contient l'empreinte SHA-256 du fichier de scène réellement sondé. Il s'agit d'une vérification des branches de commande, **pas d'une session navigateur, d'une hydratation React ni d'une manette physique**.

La perte de focus lorsqu'un bouton devient désactivé ou disparaît a aussi été prise en compte dans le code : après confirmation, un `useLayoutEffect` rend explicitement le focus à une action ou un guidage restant. L'occlusion utilise désormais la hauteur de la crête affichée. Ces deux raccords ont été relus, sans certification de leur rendu sur appareil.

## Critères restant ouverts

La bible décrit encore un mentor en visite et le cas d'un objet trop endommagé pour être installé. Ce lot n'ajoute ni visite de mentor ni modèle d'intégrité de crête. Le mentor devra dépendre d'une présence réellement autorisée par le recrutement et les affectations, conformément aux règles de compagnons. Une crête absente et les relevés d'un repli sont distingués ; cela ne simule pas un trophée endommagé.

Les effets de nettoyage acide, les signaux sonores spécifiques et la transition musicale restent à produire ou à raccorder. R2-M027 doit donc conserver un statut partiel.

La recette navigateur reste bloquée avant toute page par l'interdiction de création d'un socket Unix par Chromium ; le nouvel essai est documenté dans `../cradle-resume-20261108/`. Aucun nouveau lancement de navigateur ni changement de permissions n'a été effectué pour cette relecture.
