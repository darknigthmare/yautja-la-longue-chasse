# PR 4 — Propriété des commandes des fenêtres

Base inspectée : 799a2843d6cb25fdd0ed3fd01fec6d9c96b64d49.

Le hook partagé refusait déjà les contrôles désactivés, mais Retour pouvait encore quitter un menu dont la racine était hidden ou aria-disabled. Une fenêtre modale désactivée devait également conserver la propriété des commandes, sans transmettre Retour au menu derrière elle.

Le correctif bloque ces contextes et réarme les entrées après neutralisation. Six cas supplémentaires exécutent le vrai hook et le vrai résolveur de manette avec DOM/RAF instrumentés : quatre échouaient avant, six passent après. Les 15 cas précédents restent présents ; le groupe exécuté localement totalise 21 réussites. La commande CI existante inclut ce fichier : aucun test ajouté hors du chemin de validation.

Aucune sauvegarde, progression, action de combat, dépendance ni ressource artistique modifiée. Ce test ne certifie pas une manette matérielle. La PR reste non fusionnée. Les travaux d’invocations multi-univers sont isolés dans Multiverse Breach ; aucun pouvoir extérieur n’est injecté dans Yautja.
