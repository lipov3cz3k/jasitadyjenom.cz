variable "project_id" {
  description = "GCP project ID (created manually)."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run and Artifact Registry. europe-west1 supports Cloud Run domain mapping."
  type        = string
  default     = "europe-west1"
}

variable "service_name" {
  description = "Cloud Run service name."
  type        = string
  default     = "jasitadyjenom"
}

variable "github_repository" {
  description = "GitHub repository (owner/name) allowed to deploy via Workload Identity Federation."
  type        = string
  default     = "lipov3cz3k/jasitadyjenom.cz"
}

variable "domains" {
  description = "Domains mapped to Cloud Run. Must be verified in Google Search Console by the account running Terraform beforehand. Empty list = no custom domain."
  type        = list(string)
  default     = ["jasitadyjenom.cz", "www.jasitadyjenom.cz"]
}

variable "cloudflare_zone" {
  description = "Cloudflare zone in which Terraform creates DNS records for var.domains."
  type        = string
  default     = "jasitadyjenom.cz"
}

variable "ai_location" {
  description = "Vertex AI location for Gemini. \"eu\" is the EU multi-region endpoint (aiplatform.eu.rep.googleapis.com)."
  type        = string
  default     = "eu"
}

variable "ai_model" {
  description = "Gemini model used to pre-fill the report form from photos."
  type        = string
  default     = "gemini-3.5-flash-lite"
}
