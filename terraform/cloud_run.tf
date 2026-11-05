resource "google_service_account" "runtime" {
  account_id   = "${var.service_name}-run"
  display_name = "Cloud Run runtime – ${var.service_name}"

  depends_on = [google_project_service.this]
}

resource "google_cloud_run_v2_service" "app" {
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = true

  template {
    service_account                  = google_service_account.runtime.email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 0 # scale-to-zero, no traffic means no cost
      max_instance_count = 2 # cap against unexpected costs
    }

    containers {
      # Placeholder image for the initial create; real images are deployed by GitHub Actions
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }
    }
  }

  lifecycle {
    # Image and revision metadata are managed by CI (google-github-actions/deploy-cloudrun)
    ignore_changes = [
      client,
      client_version,
      labels,
      template[0].labels,
      template[0].revision,
      template[0].containers[0].image,
    ]
  }

  depends_on = [google_project_service.this]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.app.name
  location = google_cloud_run_v2_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
