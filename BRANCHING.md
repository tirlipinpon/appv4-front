# Stratégie de branches — appv4-front

## Branches

| Branche | Rôle |
|---------|------|
| `main` | Historique stable / miroir des releases validées |
| `develop` | Intégration continue (développement) |
| `release` / `release/x.y` | Déclenche le **déploiement Azure** (CD) |
| `feature/*` | Travail court, merge via PR vers `develop` |

## Flux

```text
feature/*  --PR(+CI)-->  develop  --merge-->  release  --CD-->  Azure
                              ^
                              |
                             CI (build learning + build admin)
```

1. Développer sur `feature/...`
2. Ouvrir une PR vers **`develop`** → GitHub Actions **CI** (obligatoire)
3. Quand on veut publier : merger **`develop` → `release`** (ou créer `release/x.y` depuis `develop`)
4. Le push sur `release` déclenche le **CD Azure** (SCRUM-38 / SCRUM-39)

## Règles

- Ne **pas** déployer Azure directement depuis `develop` ou une `feature/*`
- Ne **pas** pousser en direct sur `develop` / `release` / `main` (PR uniquement, dès que les protections sont actives)
- Les builds `learning` et `admin` sont indépendants, mais la CI doit faire les **deux**

## Protections recommandées (GitHub)

À activer sur `develop` et `release` :

- Require a pull request before merging
- Require status checks to pass (CI)
- Restrict who can push (équipe seulement)

Ticket : **SCRUM-71** (stratégie) — suites CI/CD : **SCRUM-72+** / Azure : **SCRUM-76+**.
