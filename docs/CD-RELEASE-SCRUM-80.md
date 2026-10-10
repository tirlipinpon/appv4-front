# SCRUM-80 — CD automatique depuis `release` (front)

## Flux

```text
PR develop → release  →  CD lint/test/build  →  deploy SWA learning + admin
```

Gate : `vars.AZURE_DEPLOY_ENABLED == 'true'`.

## Secrets / variables GitHub

| Type | Nom |
|------|-----|
| var | `AZURE_DEPLOY_ENABLED` = `true` |
| secret | `AZURE_SWA_LEARNING_TOKEN` |
| secret | `AZURE_SWA_ADMIN_TOKEN` |

## URLs (jusqu’à SCRUM-81 domaines custom)

- learning : https://polite-ground-05659df0f.5.azurestaticapps.net
- admin : https://lively-sand-0e7de6e0f.5.azurestaticapps.net
