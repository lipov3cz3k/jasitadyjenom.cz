# DNS records for the Cloud Run domain mapping in Cloudflare.
#
# The zone (and NS at the registrar) is managed manually; Terraform only looks it up by name.
# The provider reads the token from the CLOUDFLARE_API_TOKEN environment variable
# (Zone:Read and DNS:Edit permissions for this zone only).
#
# Record values are hardcoded: Google doesn't change them for Cloud Run domain mappings
# and the mapping status is only known once it's processed, so it can't be used in for_each.
# The check below warns if they ever differ from what Google returns.

locals {
  # Apex domains: 4× A and 4× AAAA. Subdomains: CNAME to ghs.googlehosted.com.
  cloud_run_apex_records = concat(
    [for ip in ["216.239.32.21", "216.239.34.21", "216.239.36.21", "216.239.38.21"] :
    { type = "A", content = ip }],
    [for ip in ["2001:4860:4802:32::15", "2001:4860:4802:34::15", "2001:4860:4802:36::15", "2001:4860:4802:38::15"] :
    { type = "AAAA", content = ip }],
  )

  dns_records = {
    for r in flatten([
      for d in var.domains : d == var.cloudflare_zone
      ? [for a in local.cloud_run_apex_records : merge(a, { name = d })]
      : [{ name = d, type = "CNAME", content = "ghs.googlehosted.com" }]
    ]) : "${r.name}/${r.type}/${r.content}" => r
  }
}

data "cloudflare_zone" "this" {
  count = length(local.dns_records) > 0 ? 1 : 0

  filter = {
    name = var.cloudflare_zone
  }
}

resource "cloudflare_dns_record" "cloud_run" {
  for_each = local.dns_records

  zone_id = data.cloudflare_zone.this[0].zone_id
  name    = each.value.name
  type    = each.value.type
  content = each.value.content
  ttl     = 1 # automatic
  # No proxy: Google must reach the domain directly, otherwise it won't issue a certificate.
  proxied = false
  comment = "Cloud Run domain mapping (Terraform)"
}

check "dns_records_match_google" {
  assert {
    condition = alltrue([
      for d, m in google_cloud_run_domain_mapping.app : (
        length(try(m.status[0].resource_records, [])) == 0 ||
        toset([for r in m.status[0].resource_records : "${r.type} ${trimsuffix(r.rrdata, ".")}"]) ==
        toset([for k, r in local.dns_records : "${r.type} ${r.content}" if r.name == d])
      )
    ])
    error_message = "DNS records in dns.tf differ from what Google returns (terraform output dns_records). Update local.cloud_run_apex_records."
  }
}

# Cloudflare signs the zone. The key has to be registered with the registrar:
# for .cz as a KEYSET with DNSKEY (output dnssec), elsewhere as a DS record.
resource "cloudflare_zone_dnssec" "this" {
  count = length(data.cloudflare_zone.this)

  zone_id = data.cloudflare_zone.this[0].zone_id
  status  = "active"
}
