# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Le parent est l'utilisateur principal. Il ouvre l'application pour tenir les fiches de ses enfants : les voir, en ajouter, en modifier, inviter un autre parent, accepter ou refuser un partage ou un transfert.

Le même site sert aussi le professeur et l'administrateur. Ces rôles existent. Ils ne sont pas l'utilisateur principal de la page Enfants.

## Product Purpose

Permettre à un parent de garder la liste de ses enfants et d'agir sur une fiche sans quitter la page. La page est réussie quand la liste se lit en premier, et que le formulaire vient ensuite.

## Operating Context

Application web déjà en place, espace parent, route `/parent/enfants`. Le parent est connecté. Les fiches, les demandes, les invitations et les transferts viennent de l'API.

## Capabilities and Constraints

La page fait déjà : liste, ajout, modification, copie d'une fiche, invitation, demande de partage, transfert, désactivation, réactivation, retrait, liens entre enfants, photo, avatar, école, classe, centres d'intérêt, classement, code PIN.

Contrainte confirmée : toutes les actions et tous les textes déjà à l'écran restent. Aucun libellé métier n'est inventé. Une donnée absente de l'API ne s'affiche pas.

## Brand Commitments

Le look demandé, dans les mots de l'utilisateur : « copier pour l'adapter a ce projet admin » le gabarit sombre de Smart Angular, https://www.einfosoft.com/templates/admin/smartangular/source/dark/#/admin/dashboard/main . Fond sombre, barre latérale, barre du haut, cartes. Les pages, les menus et les données de ce template ne sont pas ceux du produit.

Les anciens fichiers Figma et les PNG de `design/learning/` ne sont pas la référence de cette page.

## Evidence on Hand

La page et ses textes sont dans `projects/admin/src/app/features/parent/parent-children.page.html`. Les couleurs partagées actuelles sont dans `design/tokens.json` (thème clair). Il n'y a pas de jeu de démo à afficher à la place des enfants renvoyés par l'API.

## Product Principles

- La liste des enfants se lit avant le formulaire.
- Chaque action déjà présente reste trouvable, avec son texte actuel.
- L'écran montre ce que l'API a renvoyé.
- Le parent reconnaît l'espace au premier coup d'œil, puis trouve l'enfant.
