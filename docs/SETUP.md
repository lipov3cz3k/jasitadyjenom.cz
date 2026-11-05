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
| DNS v Cloudflare | Dohoda: pár záznamů, které se nemění. Bez dalšího API tokenu. |
| GitHub Actions variables | Terraform by potřeboval GitHub token s právy na repozitář. |
| Hodnoty tajemství (budoucí `GEMINI_API_KEY`) | Hodnota by skončila v Terraform state. Až přijde na řadu, Terraform založí jen secret bez hodnoty a verzi přidáš přes `gcloud secrets versions add`. |

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

## 7. DNS v Cloudflare

```bash
terraform output dns_records
```

Zobrazí se záznamy pro `jasitadyjenom.cz` (4× A a 4× AAAA) a pro `www`
(CNAME na `ghs.googlehosted.com`). Pokud jsou výstupy prázdné, mapping se ještě
zpracovává. Počkej pár minut a spusť `terraform apply -refresh-only && terraform output dns_records`.

V Cloudflare:
- záznamy zadej přesně podle výstupu
- **Proxy status: DNS only (šedý mráček)**, jinak Google nevydá certifikát
- pokud máš v zóně CAA záznamy, musí povolovat `pki.goog` a `letsencrypt.org`

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

## 9. První nasazení

Push do `main` (mimo změny v `terraform/`, `docs/` a `*.md`), nebo ruční spuštění:

```bash
gh workflow run deploy.yml
```

Přihlášení přes Workload Identity Federation projde jen z repozitáře
`lipov3cz3k/jasitadyjenom.cz` a jen z větve `main`.
