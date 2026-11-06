output "service_url" {
  description = "Default URL of the Cloud Run service."
  value       = google_cloud_run_v2_service.app.uri
}

output "artifact_registry" {
  description = "Docker repository path (GitHub variable GAR_REPOSITORY)."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}"
}

output "workload_identity_provider" {
  description = "Full WIF provider name (GitHub variable GCP_WORKLOAD_IDENTITY_PROVIDER)."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account" {
  description = "Service account for GitHub Actions (GitHub variable GCP_DEPLOYER_SA)."
  value       = google_service_account.deployer.email
}

output "dns_records" {
  description = "DNS records Google returns for the domain mapping (to check against dns.tf)."
  value = {
    for domain, m in google_cloud_run_domain_mapping.app : domain => [
      for r in try(m.status[0].resource_records, []) : {
        type  = r.type
        name  = r.name == "" ? domain : r.name
        value = r.rrdata
      }
    ]
  }
}

output "dnssec" {
  description = "KEYSET data for the registrar (.cz: DNSKEY = flags, protocol 3, algorithm, public key; elsewhere DS)."
  value = length(cloudflare_zone_dnssec.this) == 0 ? null : {
    flags      = cloudflare_zone_dnssec.this[0].flags
    protocol   = 3
    algorithm  = cloudflare_zone_dnssec.this[0].algorithm
    public_key = cloudflare_zone_dnssec.this[0].public_key
    ds         = cloudflare_zone_dnssec.this[0].ds
  }
}
