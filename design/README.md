# Design references (appv4)

Source of truth for UI validation while coding features.

## Figma (équipe Tony Ster)

| App | Fichier | URL |
| --- | --- | --- |
| Learning | `appv4 — Learning` | https://www.figma.com/design/2rccbhHVIBnzzAtLbOEFln |
| Teacher | `appv4 — Teacher` | https://www.figma.com/design/B15sNaAnxgwjyDqOJRvvBu |
| Admin | `appv4 — Admin` | https://www.figma.com/design/jYPYLgH5YupcDTawwt3XYL |

Projet Figma : **Team project** (`458160316`).

## Mapping tickets Learning

| Zone | Tickets |
| --- | --- |
| Shell / nav bas / avatar | LEARN-28 |
| Home dashboard (mission, XP, explore) | LEARN-27, LEARN-31, LEARN-32 |
| Learn — matières (grille) | LEARN-29 (+ BACK-15) |
| Learn — board matière (hero, leçons, extras) | LEARN board stories (+ BACK liés) |
| Rewards / badges | LEARN-34+ |
| Ranking / amis | LEARN-36, LEARN-37 |

## Local exports

Place PNG validés sous `design/learning/<feature>/` (ex. `learn/01-library-subjects.png`).
L’agent doit les lire avant de coder la feature correspondante.

Board matière : `design/learning/subject/01-subject-board.png`, `02-lessons-list.png`, `03-minigames-badges.png`.

## Librairie icônes matières

Codes fermés côté back (`SubjectIcons`) : `math`, `alphabet`, `animals`, `words`,
`knowledge`, `opposites`, `books`, `globe`, `music`, `sport`, `art`, `science`.
Le professeur choisit via `iconChoices` ; Learn affiche le glyph connu pour `iconCode`.
