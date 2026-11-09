# Tests Playwright — à suivre pour un nouveau scénario

Les parcours admin vivent dans `e2e/`. L’admin tourne sur http://localhost:4201 (`npm run start:admin`).

## Lancer

| Commande | Quand |
| --- | --- |
| `npm run e2e:mock` | Parent, professeur, modération. L’API est simulée dans le test. Le back peut être éteint. |
| `npm run e2e:auth` | Inscription, choix de rôle, Google, Facebook. Le back doit répondre sur le port 8080. |
| `npm run e2e` | Toute la suite. |
| `npx playwright test --grep @parent` | Un seul groupe. Tags : `@parent`, `@teacher`, `@moderation`, `@auth`, `@mock`. |

`npm run e2e:visual` ouvre l’interface Playwright sur http://127.0.0.1:9333.

## Où écrire le test

Un fichier par parcours, déjà en place :

- `e2e/parent-flows.spec.ts`
- `e2e/teacher-flows.spec.ts`
- `e2e/teacher-subjects-transfer.spec.ts`
- `e2e/teacher-requests.spec.ts`
- `e2e/complete-roles.spec.ts`

Nouveau parcours : un nouveau fichier, pas un quatrième sujet dans un fichier qui n’a rien à voir.

Chaque fichier ouvre un seul `test.describe`. Le nom dit le parcours. Les tags disent comment le lancer.

```ts
test.describe('parcours parent', { tag: ['@parent', '@mock'] }, () => {
  test.describe.configure({ mode: 'parallel' });

  test('le parent enregistre son profil', async ({ page }) => {
    // ...
  });
});
```

- Suite simulée : tags `@mock` et le métier (`@parent`, `@teacher` ou `@moderation`), et `mode: 'parallel'`. Chaque test a sa propre page et ses propres réponses.
- Suite qui appelle le vrai back (`@auth`) : pas de `mode: 'parallel'`. Deux tests lancés ensemble écrivent dans la même base.

`playwright.config.ts` laisse `fullyParallel: false`. On ne le passe pas à `true` : l’inscription réelle ne supporte pas d’être lancée en vrac.

## Repères dans la page

Les libellés vont changer de langue. Un test ne clique pas et ne cherche pas un bouton par sa phrase française.

- Interface (lien, bouton, titre, champ, alerte, état vide, message de succès ou d’erreur) : `data-testid` stable, puis `getByTestId`. Le testid ne recopie pas le texte affiché. Exemple : `profile-save`, pas `Enregistrer`.
- Donnée saisie ou renvoyée par l’API (nom, e-mail, téléphone, école, matière) : on vérifie encore ce texte. Exemple : le bandeau `account-name` contient `Camille Martin`.
- Les testid d’un fichier sont regroupés dans une constante `ui` en tête de spec.
- On pose un testid seulement sur un élément qu’un scénario touche.
- Pas de `.first()`, `.last()` ou `.nth()`. S’il y a plusieurs éléments, on filtre par une donnée (le nom de l’enfant, l’id) ou on compte (`not.toHaveCount(0)`).

```ts
await page.getByTestId(ui.profileSave).click();
await expect(page.getByTestId(ui.accountName)).toHaveText('Camille Martin');
```

## Scénarios qui se ressemblent

Même parcours, seule l’entrée change (Google et Facebook) : un seul test, une boucle sur les valeurs. On n’écrit pas le scénario deux fois.

Un e-mail créé pour le vrai back est unique, avec un compteur. `Date.now()` seul peut se répéter si deux tests partent ensemble.

```ts
for (const provider of ['google', 'facebook'] as const) {
  test(`${provider} neuf passe par le choix de rôle puis /parent`, async ({ page, request }) => {
    // mêmes étapes, provider change
  });
}
```

## Ce qu’on ne fait pas

- Pas de classe Page Object tant que l’écran n’est pas utilisé par plusieurs fichiers. Les helpers du fichier (`signIn`, `fillChild`, `chooseRoles`) suffisent.
- Pas de message métier inventé. L’alerte affichée reste celle du template ou de l’API. Le test la retrouve par son testid.
- Un test `@mock` n’écrit pas en base. Il répond à la place de l’API avec `page.route`.
