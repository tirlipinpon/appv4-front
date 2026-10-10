# appv4-front

Workspace Angular **19**.

| App | Port | API backend | UI |
|-----|------|-------------|-----|
| `learning` | http://localhost:4200 | `GET http://localhost:8080/api/ext/hello` | Bootstrap 5 |

## Prérequis

- Node.js 20+ (testé avec 22)
- Backend `appv4-back` démarré (`docker compose up -d` + `.\mvnw.cmd spring-boot:run`)

## Install

```bash
cd C:\Users\tonys\Desktop\appv4\appv4-front
npm install
```

## Lancer learning

```bash
npm run start:learning
```

Smoke attendu : la page affiche **hello learning**.

## Build

```bash
npm run build:learning
```
