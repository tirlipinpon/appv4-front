# appv4-front

Workspace Angular **22** avec deux applications :

| App | Port | API backend | UI |
|-----|------|-------------|-----|
| `learning` | http://localhost:4200 | `GET http://localhost:8080/api/ext/hello` | Bootstrap 5 |
| `admin` | http://localhost:4201 | `GET http://localhost:8080/api/int/hello` | Angular Material |

## Prérequis

- Node.js **≥ 22.22.3** (Angular 22) — testé avec 22.23.x
- Backend `appv4-back` démarré (`docker compose up -d` + `.\mvnw.cmd spring-boot:run`)

## Install

```bash
cd C:\Users\tonys\Desktop\appv4\appv4-front
npm install
```

## Lancer

```bash
npm run start:learning
npm run start:admin
```

Smoke attendu :

- learning affiche **hello learning**
- admin affiche **admin-helloworld**

## Build

```bash
npm run build:learning
npm run build:admin
```

Les builds sont indépendants : un échec sur `admin` ne bloque pas `build:learning`.

## Branches & deploiement

Voir **[BRANCHING.md](./BRANCHING.md)** : `feature/*` ? `develop` (CI) ? `release` (CD Azure).

