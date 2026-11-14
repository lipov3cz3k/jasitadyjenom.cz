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
npm test
npm run build
```

### Předvyplnění pomocí AI lokálně

Endpoint `/api/analyze` potřebuje přístup ke Gemini. Bez něj vrací 503 a zbytek
aplikace funguje. Zkopíruj [`.env.example`](./.env.example) do `.env.local` a zvol
jednu z možností:

- **Vertex AI** (stejně jako v produkci): nastav `GOOGLE_CLOUD_PROJECT` a přihlas se
  `gcloud auth application-default login`. Tvůj účet potřebuje roli `roles/aiplatform.user`.
- **Gemini API klíč** z [Google AI Studio](https://aistudio.google.com/apikey): nastav
  `GEMINI_API_KEY`. Pozor: v bezplatné úrovni může Google poslaná data použít ke zlepšování
  svých produktů, testuj proto na fotkách, kterým to nevadí.

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

## Data úřadů

Aplikace hledá příslušný úřad (ORP, v Praze úřad MČ Praha 1–22) v prohlížeči
podle polohy nad souborem [`public/data/authorities.json`](./public/data/authorities.json).
Vyrábí ho pipeline v [`data-pipeline/`](./data-pipeline/) z otevřených dat ČÚZK
(RÚIAN, CC BY 4.0) a Registru práv a povinností:

```bash
npm ci --prefix data-pipeline
npm run data:update
npm test
```

Ruční úpravy (města s městskými obvody, opravy názvů) jsou v
[`data-pipeline/overrides.json`](./data-pipeline/overrides.json). Měsíční
aktualizaci dělá workflow [Data update](./.github/workflows/data-update.yml).

## Infrastruktura a nasazení

Jednorázové ruční kroky (GCP projekt, billing, HCP Terraform pro state, doména, DNS, GitHub
variables) a postup pro `terraform apply` popisuje [docs/SETUP.md](./docs/SETUP.md).

Terraform spouštíš lokálně. Image nasazuje GitHub Actions a Terraform ho ignoruje.

## Licence

[MIT](./LICENSE)
