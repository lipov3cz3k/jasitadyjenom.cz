terraform {
  required_version = ">= 1.9"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.8"
    }
  }

  # State lives in HCP Terraform. The workspace uses Execution Mode: Local,
  # so plan/apply run locally with gcloud ADC and HCP only stores the state.
  cloud {
    organization = "jasitadyjenom"

    workspaces {
      name    = "prod"
      project = "jasitadyjenom"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
