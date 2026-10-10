# Stratégie de branches — appv4-front

## Branches

| Branche | Rôle |
|---------|------|
| `main` | Historique stable / miroir des releases validées |
| `develop` | Intégration continue (développement) |
| `release` / `release/x.y` | Cible de release ; le merge (via PR) déclenche le **CD Azure** |
| `feature/*` | Travail court, merge **via PR** vers `develop` |

## Flux (toujours via Pull Request)

```text
feature/*  --PR(+CI)-->  develop  --PR(+CI)-->  release  --CD-->  Azure
                              ^                     ^
                              |                     |
                         CI obligatoire        CI obligatoire
                          (learning+admin)      (puis deploy Azure)
```

1. Développer sur `feature/...`
2. Ouvrir une **PR** vers **`develop`** → CI GitHub Actions (obligatoire)
3. Pour publier : ouvrir une **PR** **`develop` → `release`** (ou `release/x.y`) — **jamais de merge direct en ligne de commande / push direct**
4. Le merge de cette PR sur `release` déclenche le **CD Azure** (SCRUM-38 / SCRUM-39)

## Règles (non négociables)

- **Toute** intégration vers `develop`, `release` ou `main` passe par une **Pull Request**
- Interdit : `git push origin develop` / `git push origin release` avec du travail direct
- Interdit : merger `develop` dans `release` en local puis push sans PR
- Ne **pas** déployer Azure depuis `develop` ou une `feature/*`
- Les builds `learning` et `admin` sont indépendants, mais la CI doit faire les **deux**
- CI rouge = pas de merge

## Protections GitHub (obligatoires)

Sur **`develop`** et **`release`** :

- Require a pull request before merging
- Require status checks to pass (CI)
- Pas de force-push
- Restrict direct pushes (équipe seulement / personne)

## CI actuelle

Workflow : `.github/workflows/ci-develop.yml`  
Triggers : `push` et `pull_request` vers **`develop`** (`npm ci` + build `learning` + build `admin`, Node 22.23).

Ticket : **SCRUM-71** — suites CI : **SCRUM-72+** / Azure : **SCRUM-76+**.
