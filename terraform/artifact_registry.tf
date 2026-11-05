resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = var.service_name
  description   = "Docker images for ${var.service_name}"
  format        = "DOCKER"

  # Delete old images so we don't pay for storage
  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "2592000s" # 30 days
    }
  }

  depends_on = [google_project_service.this]
}
