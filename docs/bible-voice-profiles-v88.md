# V88 — attribution documentaire des profils de voix

Le lecteur conserve les archives et répliques originales. Il remplace sa recherche du premier nom correspondant par une résolution explicite des profils de `Voix V6!A6:I215` : 210 fiches, 202 noms, huit homonymies. Les fiches sont des directions d’interprétation, sans clips ou synthèse vocale.

`readBibleVoiceProfilesV88` conserve chaque ID, nom, rôle/contexte, direction, vocabulaire, geste, connaissance permise, limite, provenance et plage source A:I. `resolveBibleVoiceProfileV88` ne résout qu’un nom source exact présent une seule fois, ou un ID de profil explicitement fourni comme locuteur. Un nom absent reste absent ; accents, casse, titre, silhouette, rang et domaine de scène ne servent pas à emprunter un profil.

Les homonymes restent ambigus et affichent **tous** les candidats, leurs ID, contexte et cellules. Par exemple, Orha expose `D6-V-O-06` (`A11:I11`) et `D6-V-H087` (`A197:I197`). Réordonner les fiches ne peut pas choisir une autre direction. Un ID dupliqué avec des fiches contradictoires reste également ambigu.

Le corpus actuel ne fournit pas de binding explicite scène/locuteur → profil pour ces homonymes. Aucun binding par préfixe de scène ou proximité de rôle n’est inventé. Une future liaison contextuelle doit citer les cellules qui prouvent l’identité dans cette scène ; un choix manuel de consultation n’est pas une preuve et n’est pas enregistré comme une voix attribuée.

Les huit noms partagés sont Orha, Isha, Mara Venn, Saar, Yena, Artisane des Branches Entrelacées, Vigie de la Couronne et Artisane des Forges Souterraines. Aucun personnage ne reçoit les connaissances ou le timbre d’un homonyme par l’ordre du fichier.

Neuf tests dédiés couvrent les 210 fiches/cellules, les huit homonymies et leur ordre, noms uniques, identité explicite, absences, doublons contradictoires, formules inertes et rendu SSR du véritable bloc d’archives. Lint et TypeScript sont vérifiés séparément. Le rendu SSR ne certifie pas un parcours hydraté ou l’apparence en navigateur ; aucun audio, build produit, commit ou déploiement n’est créé par ce lot.
