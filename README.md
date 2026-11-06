# jasitadyjenom.cz

> „Já si tady jenom na minutku odskočím…“

Webová aplikace pro rychlé nahlášení špatně parkujících vozidel příslušnému úřadu
přes datovou schránku. Zatím je tu úvodní stránka. Prototyp aplikace je ve větvi
[`mvp`](../../tree/mvp).

## Stack

- **Next.js 16** (App Router, `output: standalone`), React 19, TypeScript, Tailwind CSS 4
- **Google Cloud Run** (`europe-west1`, scale-to-zero) a Artifact Registry
- **Terraform** v [`terraform/`](./terraform/)
- **GitHub Actions**: [CI](./.github/workflows/ci.yml) na každý PR a [Deploy](./.github/workflows/deploy.yml) při push do `main` (přihlášení přes Workload Identity Federation)

## Lokální vývoj

Potřebuješ Node.js 26 (viz `.nvmrc`).

```bash
npm ci
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build
```

Git hooky (gitleaks, ESLint, `terraform fmt` a pár základních kontrol před commitem)
spravuje [pre-commit](https://pre-commit.com):

```bash
brew install pre-commit
pre-commit install
```

Produkční kontejner:

```bash
docker build -t jasitadyjenom .
docker run --rm -p 8080:8080 jasitadyjenom   # http://localhost:8080
```

## Infrastruktura a nasazení

Jednorázové ruční kroky (GCP projekt, billing, HCP Terraform pro state, doména, DNS, GitHub
variables) a postup pro `terraform apply` popisuje [docs/SETUP.md](./docs/SETUP.md).

Terraform spouštíš lokálně. Image nasazuje GitHub Actions a Terraform ho ignoruje.

## Licence

[MIT](./LICENSE)
