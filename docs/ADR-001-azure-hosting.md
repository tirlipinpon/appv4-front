# ADR-001 — Hébergement Azure appv4 (front)

- **Statut** : Accepté (SCRUM-76)
- **Date** : 2026-10-10
- **Note** : Même décision que le backend ; ce fichier reste dans le repo front pour lecture autonome.

## Décision (front)

| Composant | Service Azure | Pourquoi |
|-----------|---------------|----------|
| **learning** | **Static Web Apps** | Build Angular → fichiers statiques ; deploy via token GitHub |
| **admin** | **Static Web Apps** (app séparée) | Même stack, site isolé (comme 4200 / 4201 en local) |

Le backend (App Service Java + Postgres Flexible) est documenté dans `appv4-back/docs/ADR-001-azure-hosting.md`.

## Noms proposés

| Ressource | Nom |
|-----------|-----|
| Resource Group (partagé) | `rg-appv4-prod` |
| SWA learning | `swa-appv4-learning-prod` |
| SWA admin | `swa-appv4-admin-prod` |
| Région | **France Central** (fallback West Europe) |

## Flux

```text
PR → develop (CI lint+test+build)
        ↓ PR
      release  →  CD  →  2× Static Web Apps
```

Deploy uniquement si `AZURE_DEPLOY_ENABLED=true` + secrets SWA (voir [`GITHUB_SECRETS.md`](GITHUB_SECRETS.md)).

## Suite

- **SCRUM-79** : provision des 2 SWA
- **SCRUM-80** : brancher `swa deploy` dans `cd-release.yml`
- Après provision : mettre à jour `environment.production.ts` (URL API App Service) + CORS côté back
