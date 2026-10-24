# SCRUM-79 — Static Web Apps (learning + admin)

## Ressources (Free / East US 2)

| App | Resource | URL |
|-----|----------|-----|
| learning | `swa-appv4-learning-prod` | https://polite-ground-05659df0f.5.azurestaticapps.net |
| admin | `swa-appv4-admin-prod` | https://lively-sand-0e7de6e0f.5.azurestaticapps.net |

API back : `https://app-appv4-back-prod-gbb9e2fcg6cxaqe6.francecentral-01.azurewebsites.net`

## Config front

- `environment.prod.ts` pointe vers `/api/ext` (learning) et `/api/int` (admin)
- Build prod : `npm run build:learning` / `npm run build:admin`
- Deploy manuel (jusqu’à SCRUM-80) : SWA CLI + deployment token (secrets GitHub / fichier local hors git)

## CORS back

App Service settings :

- `APPV4_CORS_ALLOWEDORIGINS_0` … `_3` (localhost + 2 SWA)
