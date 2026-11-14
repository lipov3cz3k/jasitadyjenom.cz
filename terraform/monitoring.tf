# Usage overview from the Cloud Run request logs that exist anyway: nothing runs in the browser,
# no cookies, and the metrics hold only counts – no IP address, user agent or full URL.
# Internal links have prefetch disabled, so one page view is one request in the log.

locals {
  # Requests of this service from its request log
  run_requests = join("\n", [
    "resource.type=\"cloud_run_revision\"",
    "resource.labels.service_name=\"${var.service_name}\"",
    "logName=\"projects/${var.project_id}/logs/run.googleapis.com%2Frequests\"",
  ])

  # Rough filter for crawlers and uptime checkers; people's browsers don't announce themselves like this
  not_bots = "httpRequest.userAgent!~\"(?i)(bot|crawl|spider|slurp|preview|externalhit|whatsapp|telegram|discord|linkedin|monitor|uptime|curl|wget|python|go-http|java|headless|lighthouse)\""

  # Endpoint name from the URL, e.g. "analyze"
  ai_endpoint_extractor = "REGEXP_EXTRACT(httpRequest.requestUrl, \"/api/([a-z]+)\")"
}

resource "google_logging_metric" "page_views" {
  name        = "page_views"
  description = "Page views of the public pages (full loads and client-side navigations), without known bots."

  # "/", "/nahlasit" and "/soukromi", with or without a query (?_rsc= for client-side navigation)
  filter = join("\n", [
    local.run_requests,
    "httpRequest.requestMethod=\"GET\"",
    "httpRequest.status<400",
    "httpRequest.requestUrl=~\"^https?://[^/]+/(nahlasit|soukromi)?/?([?]|$)\"",
    local.not_bots,
  ])

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "Page views"

    labels {
      key         = "page"
      value_type  = "STRING"
      description = "Path: /, /nahlasit or /soukromi"
    }
  }

  label_extractors = {
    page = "REGEXP_EXTRACT(httpRequest.requestUrl, \"^https?://[^/]+(/[a-z]*)\")"
  }

  depends_on = [google_project_service.this]
}

resource "google_logging_metric" "ai_requests" {
  name        = "ai_requests"
  description = "Calls of the AI endpoints by endpoint and HTTP status (200 = success, 4xx = rejected, 429 = rate limit, 502 = model failure)."

  filter = join("\n", [
    local.run_requests,
    "httpRequest.requestMethod=\"POST\"",
    "httpRequest.requestUrl=~\"/api/(analyze|draft)([?]|$)\"",
  ])

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "AI requests"

    labels {
      key         = "endpoint"
      value_type  = "STRING"
      description = "analyze = recognition from photos, draft = tailored notice text"
    }
    labels {
      key         = "status"
      value_type  = "STRING"
      description = "HTTP status code"
    }
  }

  label_extractors = {
    endpoint = local.ai_endpoint_extractor
    status   = "EXTRACT(httpRequest.status)"
  }

  depends_on = [google_project_service.this]
}

resource "google_logging_metric" "ai_latency" {
  name        = "ai_latency"
  description = "Response time of successful AI calls."

  filter = join("\n", [
    local.run_requests,
    "httpRequest.requestMethod=\"POST\"",
    "httpRequest.requestUrl=~\"/api/(analyze|draft)([?]|$)\"",
    "httpRequest.status=200",
  ])

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "DISTRIBUTION"
    unit         = "s"
    display_name = "AI latency"

    labels {
      key         = "endpoint"
      value_type  = "STRING"
      description = "analyze or draft"
    }
  }

  # Latency is logged as e.g. "1.234567s"
  value_extractor = "REGEXP_EXTRACT(httpRequest.latency, \"^([0-9.]+)s$\")"
  label_extractors = {
    endpoint = local.ai_endpoint_extractor
  }

  # 0.25 s … 64 s
  bucket_options {
    exponential_buckets {
      num_finite_buckets = 8
      growth_factor      = 2
      scale              = 0.25
    }
  }

  depends_on = [google_project_service.this]
}

locals {
  metric_filter = {
    for name, metric in {
      page_views  = google_logging_metric.page_views
      ai_requests = google_logging_metric.ai_requests
      ai_latency  = google_logging_metric.ai_latency
    } : name => "metric.type=\"logging.googleapis.com/user/${metric.name}\" resource.type=\"cloud_run_revision\""
  }

  daily_sum = {
    alignmentPeriod    = "86400s"
    perSeriesAligner   = "ALIGN_SUM"
    crossSeriesReducer = "REDUCE_SUM"
  }

  latency_percentile = {
    for p in [50, 95] : p => {
      timeSeriesQuery = {
        timeSeriesFilter = {
          filter = local.metric_filter.ai_latency
          aggregation = {
            alignmentPeriod    = "3600s"
            perSeriesAligner   = "ALIGN_DELTA"
            crossSeriesReducer = "REDUCE_PERCENTILE_${p}"
            groupByFields      = ["metric.label.endpoint"]
          }
        }
      }
      plotType       = "LINE"
      legendTemplate = "p${p} $${metric.labels.endpoint}"
    }
  }
}

resource "google_monitoring_dashboard" "usage" {
  dashboard_json = jsonencode({
    displayName = "${var.service_name} – používání"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          xPos = 0, yPos = 0, width = 12, height = 4
          widget = {
            title = "Návštěvy stránek za den (bez známých robotů)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter      = local.metric_filter.page_views
                    aggregation = merge(local.daily_sum, { groupByFields = ["metric.label.page"] })
                  }
                }
                plotType       = "STACKED_BAR"
                legendTemplate = "$${metric.labels.page}"
              }]
              yAxis = { label = "návštěvy", scale = "LINEAR" }
            }
          }
        },
        {
          xPos = 0, yPos = 4, width = 6, height = 4
          widget = {
            title = "Úspěšná volání AI za den (analyze = rozpoznání, draft = text podnětu)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter      = "${local.metric_filter.ai_requests} metric.label.status=\"200\""
                    aggregation = merge(local.daily_sum, { groupByFields = ["metric.label.endpoint"] })
                  }
                }
                plotType       = "STACKED_BAR"
                legendTemplate = "$${metric.labels.endpoint}"
              }]
              yAxis = { label = "volání", scale = "LINEAR" }
            }
          }
        },
        {
          xPos = 6, yPos = 4, width = 6, height = 4
          widget = {
            title = "Odmítnutá a chybná volání AI za den (4xx = odmítnuto, 429 = limit, 502 = chyba modelu)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "${local.metric_filter.ai_requests} metric.label.status=monitoring.regex.full_match(\"[45][0-9][0-9]\")"
                    aggregation = merge(local.daily_sum, {
                      groupByFields = ["metric.label.status", "metric.label.endpoint"]
                    })
                  }
                }
                plotType       = "STACKED_BAR"
                legendTemplate = "$${metric.labels.status} $${metric.labels.endpoint}"
              }]
              yAxis = { label = "volání", scale = "LINEAR" }
            }
          }
        },
        {
          xPos = 0, yPos = 8, width = 12, height = 4
          widget = {
            title = "Doba odpovědi AI (medián a 95. percentil, po hodinách)"
            xyChart = {
              dataSets = [local.latency_percentile[50], local.latency_percentile[95]]
              yAxis    = { label = "sekundy", scale = "LINEAR" }
            }
          }
        },
      ]
    }
  })

  depends_on = [google_project_service.this]
}
