# Secrets GitHub & environnements — appv4-front

Ticket : **SCRUM-75** (complète SCRUM-74 CD + SCRUM-76+ Azure).

## Principe

- Aucun secret dans le code, les workflows YAML, ni les logs CI/CD.
- Les valeurs réelles se configurent uniquement dans GitHub : **Settings → Secrets and variables → Actions** (et/ou Environment `production`).
- Le job `deploy` du workflow `cd-release.yml` ne tourne que si la variable `AZURE_DEPLOY_ENABLED=true` est définie.

## Environnements GitHub à créer

| Environment | Usage |
|-------------|--------|
| `production` | Deploy CD depuis `release` / `release/*` (approvals manuelles recommandées) |
| `develop` (optionnel) | Futur deploy DEV Azure si besoin — **pas** le flux nominal |

Création : repo → **Settings → Environments → New environment** → nom `production` → cocher *Required reviewers* si voulu.

## Secrets (production)

| Nom | Description | Exemple de forme (ne pas committer la valeur) |
|-----|-------------|-----------------------------------------------|
| `AZURE_CREDENTIALS` | JSON service principal Azure (login GitHub Actions) | `{"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}` |
| `AZURE_SWA_LEARNING_TOKEN` | Deployment token Static Web Apps (app **learning**) | token Azure portal / `az staticwebapp secrets…` |
| `AZURE_SWA_ADMIN_TOKEN` | Deployment token Static Web Apps (app **admin**) | idem |

> Si le choix final (SCRUM-76) est App Service au lieu de SWA, remplacer les tokens SWA par les secrets/noms App Service documentés dans l’ADR.

## Variables (non secrètes)

| Nom | Scope | Description |
|-----|-------|-------------|
| `AZURE_DEPLOY_ENABLED` | Repository ou Environment `production` | Mettre `true` **seulement** après provision Azure (SCRUM-76+) |
| `AZURE_RESOURCE_GROUP` | Environment `production` | Resource group Azure |

## Comment créer le service principal (rappel)

```bash
az ad sp create-for-rbac --name "appv4-front-gha" \
  --role contributor \
  --scopes /subscriptions/<SUB_ID>/resourceGroups/<RG> \
  --sdk-auth
```

Coller le JSON produit dans le secret `AZURE_CREDENTIALS` (Environment `production` de préférence).

## Checklist avant premier vrai deploy

1. Azure provisionné (SCRUM-76+) — learning + admin
2. Environment `production` créé (+ reviewers)
3. Secrets ci-dessus renseignés
4. Variables `AZURE_*` renseignées
5. `AZURE_DEPLOY_ENABLED=true`
6. PR `develop` → `release` mergée → CD build + deploy
