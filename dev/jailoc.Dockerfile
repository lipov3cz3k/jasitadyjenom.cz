# Workspace overlay image for developing jasitadyjenom.cz inside a jailoc
# workspace VM (https://seznam.github.io/jailoc/).
#
# The jailoc base image already ships Node.js 26 (matches .nvmrc), npm, git,
# jq, ripgrep and curl, so `npm ci && npm run dev` works out of the box. This
# overlay adds the rest of the toolchain used by CI and the git hooks:
#
#   gh          GitHub CLI: PRs, issues, CI runs
#   terraform   same version as the CI terraform job (fmt / validate)
#   gitleaks    same version as the CI secrets scan and the pre-commit hook
#   pre-commit  runs .pre-commit-config.yaml (gitleaks, ESLint, terraform fmt)
#
# Usage: add to ~/.config/jailoc/config.toml:
#
#   [workspaces.jasitadyjenom]
#   paths = ["/path/to/jasitadyjenom.cz"]
#   dockerfile = "/path/to/jasitadyjenom.cz/dev/jailoc.Dockerfile"
#
# then `jailoc restart jasitadyjenom` after changing this file. jailoc injects
# the resolved base image via the BASE build arg.

ARG BASE
FROM ${BASE}

# pre-commit from Ubuntu's archive, so no pip/venv setup is needed.
RUN apt-get update && apt-get install -y --no-install-recommends pre-commit \
    && rm -rf /var/lib/apt/lists/*

# gh — GitHub CLI, checksum-verified release binary.
ARG GH_VERSION=2.103.3
RUN set -eu; arch=$(dpkg --print-architecture); \
    case "$arch" in \
      arm64) sha=ee32df2323c8847f5fac6cb6b4b69ca75828e9329a8f22f677021f7b3306ce63 ;; \
      amd64) sha=4c806978ffce1cec70853302a56d70ac6da4f19bae7adca4e1a8ab00633dd91d ;; \
      *) echo "unsupported architecture $arch" >&2; exit 1 ;; \
    esac; \
    tmp=$(mktemp -d); \
    curl -fsSLo "$tmp/gh.tar.gz" \
      "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${arch}.tar.gz"; \
    echo "${sha}  $tmp/gh.tar.gz" | sha256sum -c -; \
    tar -xzf "$tmp/gh.tar.gz" -C /usr/local/bin --strip-components=2 "gh_${GH_VERSION}_linux_${arch}/bin/gh"; \
    rm -r "$tmp"

# terraform — keep in sync with terraform_version in .github/workflows/ci.yml.
ARG TERRAFORM_VERSION=1.16.6
RUN set -eu; arch=$(dpkg --print-architecture); \
    case "$arch" in \
      arm64) sha=a750b5a11038f165846b2658c40c88cd7070aa67a61bab431a14ba27928ea9ea ;; \
      amd64) sha=38034b38d03096399a7a1264a14561a8029b2b496fd1f169452656e53968f1b7 ;; \
      *) echo "unsupported architecture $arch" >&2; exit 1 ;; \
    esac; \
    tmp=$(mktemp -d); \
    curl -fsSLo "$tmp/terraform.zip" \
      "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${arch}.zip"; \
    echo "${sha}  $tmp/terraform.zip" | sha256sum -c -; \
    unzip -q "$tmp/terraform.zip" terraform -d /usr/local/bin; \
    rm -r "$tmp"

# gitleaks — keep in sync with GITLEAKS_VERSION in .github/workflows/ci.yml
# and the rev in .pre-commit-config.yaml.
ARG GITLEAKS_VERSION=8.30.1
RUN set -eu; arch=$(dpkg --print-architecture); \
    case "$arch" in \
      arm64) sha=e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080; garch=arm64 ;; \
      amd64) sha=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb; garch=x64 ;; \
      *) echo "unsupported architecture $arch" >&2; exit 1 ;; \
    esac; \
    tmp=$(mktemp -d); \
    curl -fsSLo "$tmp/gitleaks.tar.gz" \
      "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${garch}.tar.gz"; \
    echo "${sha}  $tmp/gitleaks.tar.gz" | sha256sum -c -; \
    tar -xzf "$tmp/gitleaks.tar.gz" -C /usr/local/bin gitleaks; \
    rm -r "$tmp"

ENV NEXT_TELEMETRY_DISABLED=1
