# Nastavení infrastruktury (jednorázové ruční kroky)

Většinu infrastruktury spravuje Terraform ve složce [`terraform/`](../terraform/).
Tenhle návod popisuje kroky, které se dělají **ručně**, protože Terraform by k nim
potřeboval příliš silná oprávnění, protože by se na nich dalo snadno něco nevratně
rozbít, nebo protože jde o ověření vlastnictví, které se automatizovat nedá.

Předpoklady: osobní Google účet (bez organizace), účet v
[HCP Terraform](https://app.terraform.io), nainstalované
[`gcloud`](https://cloud.google.com/sdk/docs/install), Terraform ≥ 1.9 a `gh` (volitelně).

Dál se počítá s projektem `jasitadyjenom` a regionem `europe-west1`. Pokud je ID projektu
obsazené (ID jsou globálně unikátní), zvol jiné a použij ho všude níže.

```bash
export PROJECT_ID=jasitadyjenom
export REGION=europe-west1
```

## Proč tyhle věci nejsou v Terraformu

| Co | Proč ručně |
|---|---|
| GCP projekt a billing | Vyžaduje práva na billing účet. `terraform destroy` by smazal celý projekt. |
| Rozpočet (budget alert) | Patří k billing účtu, ne k projektu. Navíc jen upozorňuje, útratu nezastaví. |
| Organizace a workspace v HCP Terraform | Problém slepice a vejce: state nemůže spravovat místo, ve kterém sám leží. |
| Ověření domény | Prokázání vlastnictví domény v Search Console je interaktivní. |
| Zóna v Cloudflare a NS servery u registrátora | Zóna se zakládá jednou a její smazání by shodilo celou doménu. NS (u `.cz` NSSET) se mění u registrátora, pro WEDOS Terraform provider není. DNS záznamy pro Cloud Run už Terraform spravuje. |
| GitHub Actions variables | Terraform by potřeboval GitHub token s právy na repozitář. |
| Hodnoty tajemství | Hodnota by skončila v Terraform state. Terraform proto zakládá jen secret bez hodnoty a verzi přidáš přes `gcloud secrets versions add`. Gemini žádné tajemství nepotřebuje, volá se přes Vertex AI pod service accountem Cloud Runu. |

## 1. Projekt a billing

```bash
gcloud auth login
gcloud projects create "$PROJECT_ID" --name="jasitadyjenom"
gcloud billing accounts list
gcloud billing projects link "$PROJECT_ID" --billing-account=XXXXXX-XXXXXX-XXXXXX
gcloud config set project "$PROJECT_ID"
```

## 2. Rozpočet

V konzoli: **Billing → Budgets & alerts → Create budget**
- rozsah: projekt `jasitadyjenom`
- částka: např. 300 Kč měsíčně
- upozornění na 50 %, 90 % a 100 % (e-mail správcům billingu)

Cloud Run se při nečinnosti škáluje na nulu a má free tier, takže reálné náklady
na landing page budou v řádu korun. Rozpočet je pojistka.

## 3. HCP Terraform pro state

State je v [HCP Terraform](https://app.terraform.io) (free plán stačí). Terraform běží
lokálně, HCP jen ukládá state, zamyká ho a drží historii verzí.

1. Založ organizaci `jasitadyjenom` a v ní projekt `jasitadyjenom` (workspace nezakládej,
   vytvoří se při `terraform init`). Pokud je název organizace obsazený, zvol jiný a změň
   `organization` v [`terraform/versions.tf`](../terraform/versions.tf).
2. V organizaci otevři **Settings → General → Default Execution Mode** a nastav **Local**.
   Workspace `prod` pak vznikne při `terraform init` rovnou s lokálním během.
   Bez toho by plan/apply běžel na serverech HCP, které nemají přístup do GCP.
3. Přihlas se:

   ```bash
   terraform login
   ```

## 4. Přihlášení pro Terraform (Application Default Credentials)

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project "$PROJECT_ID"
```

Pro DNS záznamy potřebuje Terraform API token do Cloudflare. V Cloudflare otevři
**My Profile → API Tokens → Create Token → Custom token**:
- oprávnění **Zone → Zone → Read** a **Zone → DNS → Edit**
- Zone Resources: **Include → Specific zone → `jasitadyjenom.cz`**

Token si ulož bezpečně (správce hesel apod.) a před spuštěním Terraformu ho dej
do prostředí jako `CLOUDFLARE_API_TOKEN`.

Token se do Terraform state neukládá, provider ho čte jen z prostředí.

Bez vlastní domény (`domains = []`) Terraform do Cloudflare nesahá.

## 5. Ověření domény

Cloud Run domain mapping vyžaduje, aby účet, pod kterým běží Terraform, byl
ověřeným vlastníkem domény v Google Search Console.

```bash
gcloud domains verify jasitadyjenom.cz
```

Otevře se Search Console. Zvol ověření přes DNS a TXT záznam přidej v Cloudflare.
Ověření celé domény pokrývá i `www`. Pokud chceš zatím nasadit bez vlastní domény,
nastav v `terraform.tfvars` hodnotu `domains = []` a tenhle krok přeskoč.

## 6. Terraform apply

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars  # uprav project_id
terraform init
terraform apply
```

Při úplně prvním `apply` se zapínají API. Pokud některý zdroj selže s chybou, že API
ještě není aktivní, počkej minutu a spusť `terraform apply` znovu.

Cloud Run služba se vytvoří se zástupným image (`hello`). Skutečnou aplikaci
nasadí až GitHub Actions. Služba má `deletion_protection`, takže ji
`terraform destroy` nesmaže, dokud ochranu nevypneš.

## 7. DNS a certifikát

Zónu `jasitadyjenom.cz` založ v Cloudflare ručně (Add a domain, plán Free) a u registrátora
nastav NS servery, které Cloudflare přidělí. Pokud má doména DNSSEC (u `.cz` KEYSET),
před změnou NS ho odeber, jinak doména přestane resolvovat.

DNSSEC pak zapne Terraform (`cloudflare_zone_dnssec`). Po `terraform apply` vypiš klíč
příkazem `terraform output dnssec` a u WEDOSu vytvoř nový KEYSET s DNSKEY: flags **KSK** (`257`),
algoritmus `13` a veřejný klíč z `public_key` (protokol `3` doplní WEDOS sám). Jiní registrátoři chtějí
místo toho DS záznam (`ds`). Než KEYSET doplníš, zóna je podepsaná, ale řetězec důvěry
z `.cz` ještě nevede, což nevadí.

DNS záznamy pro domény z `domains` vytváří Terraform v [`dns.tf`](../terraform/dns.tf):
pro `jasitadyjenom.cz` 4× A a 4× AAAA, pro `www` CNAME na `ghs.googlehosted.com`,
vše **bez proxy** (šedý mráček), jinak Google nevydá certifikát. Hodnoty jsou v kódu
napevno. `terraform output dns_records` ukazuje, co vrací Google, a check
`dns_records_match_google` při `plan` upozorní, kdyby se lišily.

Pokud máš v zóně CAA záznamy, musí povolovat `pki.goog` a `letsencrypt.org`.

Vydání certifikátu trvá obvykle 15 minut, výjimečně až 24 hodin. Stav zkontroluješ takto:

```bash
gcloud beta run domain-mappings describe --domain=jasitadyjenom.cz --region="$REGION"
```

## 8. GitHub Actions variables

Hodnoty bereš z výstupů Terraformu. Nejde o tajemství, proto **variables**, ne secrets.

```bash
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --body "$(terraform output -raw workload_identity_provider)"
gh variable set GCP_DEPLOYER_SA               --body "$(terraform output -raw deployer_service_account)"
gh variable set GAR_REPOSITORY                --body "$(terraform output -raw artifact_registry)"
```

Totéž jde nastavit ručně v **Settings → Secrets and variables → Actions → Variables**.

Dokud `GCP_WORKLOAD_IDENTITY_PROVIDER` není nastavená, workflow Deploy se přeskakuje.

## 9. Automatická aktualizace dat

Workflow [Data update](../.github/workflows/data-update.yml) jednou měsíčně stáhne
hranice ORP a seznam úřadů s datovými schránkami a při změně založí PR. Aby to
mohl udělat, zapni v **Settings → Actions → General → Workflow permissions**
volbu **„Allow GitHub Actions to create and approve pull requests“**.

PR založený z GitHub Actions nespouští CI (omezení `GITHUB_TOKEN`). Testy proto
běží přímo ve workflow Data update. Pokud chceš CI i na PR, zavři ho a znovu otevři.

## 10. První nasazení

Push do `main` (mimo změny v `terraform/`, `docs/` a `*.md`), nebo ruční spuštění:

```bash
gh workflow run deploy.yml
```

Přihlášení přes Workload Identity Federation projde jen z repozitáře
`lipov3cz3k/jasitadyjenom.cz` a jen z větve `main`.

## 11. Předvyplnění pomocí AI

Endpoint `/api/analyze` volá Gemini přes Vertex AI pod service accountem Cloud Runu,
takže žádný API klíč ani secret není potřeba. Terraform zapne `aiplatform.googleapis.com`,
přidělí service accountu roli `roles/aiplatform.user` a nastaví proměnné prostředí:

| Proměnná | Výchozí hodnota | Význam |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | `var.project_id` | projekt pro Vertex AI |
| `GOOGLE_CLOUD_LOCATION` | `eu` (`var.ai_location`) | EU multi-region endpoint, data se zpracují v EU |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` (`var.ai_model`) | model |
| `GEMINI_DRAFT_MODEL` | `GEMINI_MODEL` | model pro psaní textu podnětu (nastavuje se jen ručně) |
| `AI_LIMIT_PER_HOUR` | `10` | volání AI (rozpoznání i psaní textu) na IP adresu za hodinu (nastavuje se jen ručně) |
| `AI_LIMIT_PER_DAY` | `500` | volání AI celkem za den na jednu instanci (nastavuje se jen ručně) |

Jedno rozpoznání (až 4 fotky, zhruba 5 000 tokenů na vstupu a 1 000 na výstupu včetně
myšlení) vyjde s Flash-Lite přibližně na 0,1 Kč, tisíc rozpoznání tedy asi na 100 Kč.
Limity drží jednotlivé instance v paměti a při max. 2 instancích je denní strop nejvýš
dvojnásobný. Pojistkou proti neočekávané útratě zůstává rozpočet z kroku 2.

Bez `GOOGLE_CLOUD_PROJECT` (a bez `GEMINI_API_KEY`) endpoint vrací 503 a aplikace
funguje dál, jen bez předvyplnění.

## 12. Přehled používání

Terraform (`terraform/monitoring.tf`) založí v Cloud Loggingu tři log-based metriky
z logů požadavků Cloud Runu a dashboard **„jasitadyjenom – používání“**
(Cloud Console → Monitoring → Dashboards):

| Metrika | Co počítá |
|---|---|
| `page_views` | otevření `/`, `/nahlasit` a `/soukromi` za den, bez známých robotů a náhledů odkazů |
| `ai_requests` | volání `/api/analyze` (rozpoznání) a `/api/draft` (text podnětu) podle HTTP statusu |
| `ai_latency` | doba odpovědi úspěšných volání AI |

Metriky obsahují jen počty a krátké popisky (stránka, endpoint, status), žádné IP adresy
ani user agenty. V prohlížeči neběží žádný měřicí skript. Interní odkazy mají vypnutý
prefetch (`<Link prefetch={false}>`), aby se do počtů nepletlo přednačítání a každá
návštěva byla jeden požadavek v logu. Při přidání nového odkazu to dodržte.

Metriky se počítají až od chvíle, kdy vzniknou, do minulosti nejdou. Vejdou se do volného
limitu Cloud Monitoringu. Podněty vytvořené bez AI, kopírování textu ani odeslání
podnětu se nezměří, ty se odehrávají jen v prohlížeči.
