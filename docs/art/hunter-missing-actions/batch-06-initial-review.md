# Premières tentatives de descente, saut A et réception

Les trois sources restent conservées mais ne sont pas sélectionnées pour le lot final à ce stade. Le motif principal de correction est **l’équipement incohérent avec la locomotion retenue : les lames sont sorties au lieu d’être rétractées**. Le parent a demandé une correction native qui conserve la chorégraphie et le gabarit.

Il ne faut pas décrire ces trois images comme des silhouettes opaques coupées : les mesures exactes ne trouvent **aucun pixel alpha ≥16 sur les bords des cellules**, y compris pour le cannon haut de la réception et la main haute de la descente.

| Tentative | Source | Marges haut / bas minimales alpha ≥16 | Cellules touchant le bord avec alpha >2 |
| --- | --- | ---: | --- |
| Descente | `exec-56bbddd3-ed16-4818-b60c-d5bb05379b4d.png` | 10 / 1 px | 1, 6, 15 |
| Saut A | `exec-073f8a66-2041-454a-b0c0-84144018d014.png` | 5 / 8 px | Aucune |
| Réception | `exec-b7ae6cbe-a801-4d48-a980-98bf674a6434.png` | 6 / 9 px | 1, 13, 14, 15, 16 |

La descente possède une marge basse particulièrement serrée d’un pixel, donc un peu de marge supplémentaire est utile. Les marques au bord supérieur des autres feuilles sont de faible alpha et ne prouvent pas une tête ou un équipement coupé. Une correction d’équipement ne doit pas créer un nouveau changement d’échelle en réinventant les corps.

Le saut A montre une préparation puis une impulsion et une montée. Ces dessins ne justifient pas d’ajouter un délai mécanique de saut au Hunt. La future présentation devra respecter l’impulsion réelle, la hauteur variable et le boost éventuel. La réception démarre en fin de descente, comprime les jambes puis les redresse ; le jeu n’a toujours pas de curseur natif de pose de réception.

Mesures conservées : `batch-06-initial-qa.json`.
