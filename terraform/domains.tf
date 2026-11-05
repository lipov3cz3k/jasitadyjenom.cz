# Cloud Run domain mapping (v1 API). The domain must be verified in Search Console
# by the account Terraform runs as. DNS records: see output `dns_records`.
resource "google_cloud_run_domain_mapping" "app" {
  for_each = toset(var.domains)

  name     = each.key
  location = var.region

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.app.name
  }
}
