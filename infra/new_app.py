#!/usr/bin/env python3
"""
Scaffold a new web app: creates apps/<name>/ from infra/templates/app and
registers it in deploy.yml.

    python3 infra/new_app.py recipes --subdomain recipes --title "Recipe Box"

The generated app is the house stack — React + TypeScript + Vite, bluestar for
UI, PocketBase for auth/data — so it builds and deploys with no further wiring.

Push to main and it goes live at <subdomain>.ryanzrau.dev.
"""

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "infra" / "templates" / "app"
DEPLOY_YML = REPO_ROOT / "deploy.yml"

APP_NAME_RE = re.compile(r"^[a-z][a-z0-9_]*$")
SUBDOMAIN_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def default_subdomain(app_name):
    """App dirs are snake_case; subdomains are kebab-case."""
    return app_name.replace("_", "-")


def default_title(app_name):
    return app_name.replace("_", " ").title()


def render(template_text, substitutions):
    for key, value in substitutions.items():
        template_text = template_text.replace(key, value)
    return template_text


def scaffold_files(app_dir, substitutions):
    """Copy every *.tpl in the template tree to app_dir, substituting placeholders.

    The .tpl suffix keeps placeholder-laden files out of eslint/prettier/tsc.
    """
    created = []
    for template in sorted(TEMPLATE_DIR.rglob("*.tpl")):
        target = app_dir / template.relative_to(TEMPLATE_DIR).with_suffix("")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(render(template.read_text(), substitutions))
        created.append(target.relative_to(REPO_ROOT))
    return created


def deploy_entry(app_name, subdomain, port, enabled):
    return "\n".join(
        [
            f"  {app_name}:",
            f'    subdomain: "{subdomain}"',
            f"    enabled: {str(enabled).lower()}",
            f"    port: {port}",
            "",
        ]
    )


def register_in_deploy_yml(app_name, subdomain, port, enabled):
    """Append the app to the `apps:` block, preserving the file's comments.

    Done as text rather than a YAML round-trip because PyYAML drops every
    comment in deploy.yml, and those comments are the config's documentation.
    """
    lines = DEPLOY_YML.read_text().splitlines(keepends=True)

    apps_index = next(
        (i for i, line in enumerate(lines) if line.rstrip() == "apps:"), None
    )
    if apps_index is None:
        fail("no top-level `apps:` block found in deploy.yml")

    # The apps block ends at the next top-level key, or at end of file.
    end = len(lines)
    for i in range(apps_index + 1, len(lines)):
        if (
            lines[i].strip()
            and not lines[i][0].isspace()
            and not lines[i].startswith("#")
        ):
            end = i
            break

    # Trim trailing blank lines inside the block so the new entry sits flush.
    while end > apps_index + 1 and not lines[end - 1].strip():
        end -= 1

    if end > apps_index + 1 and not lines[end - 1].endswith("\n"):
        lines[end - 1] += "\n"

    lines.insert(end, deploy_entry(app_name, subdomain, port, enabled))
    DEPLOY_YML.write_text("".join(lines))


def npm_install(app_dir):
    """Install the app's dependencies, bootstrapping bluestar first.

    An app depends on bluestar through a `file:` reference, and npm runs that
    package's `prepare` (tsup build) during the app's install — but it does not
    install bluestar's own devDependencies to do it. So bluestar has to be
    installed and built first, exactly as the Dockerfiles do it.
    """
    if shutil.which("npm") is None:
        return False, "npm not found on PATH"

    bluestar = REPO_ROOT / "packages" / "bluestar"
    if not (bluestar / "node_modules").is_dir():
        print(
            "Bootstrapping packages/bluestar (its build produces the app's dependency)..."
        )
        result = subprocess.run(["npm", "install"], cwd=bluestar)
        if result.returncode != 0:
            return False, f"npm install in packages/bluestar exited {result.returncode}"

    print(f"Running npm install in {app_dir.relative_to(REPO_ROOT)}...")
    result = subprocess.run(["npm", "install"], cwd=app_dir)
    if result.returncode != 0:
        return False, f"npm install exited {result.returncode}"
    return True, None


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("name", help="app directory name, snake_case (e.g. recipe_box)")
    parser.add_argument(
        "--subdomain",
        help='subdomain, kebab-case; "" for the root domain (default: name with underscores as dashes)',
    )
    parser.add_argument(
        "--title", help="human-readable app title (default: derived from name)"
    )
    parser.add_argument(
        "--port", type=int, default=80, help="container port (default: 80)"
    )
    parser.add_argument(
        "--disabled",
        action="store_true",
        help="register in deploy.yml with enabled: false (default: enabled)",
    )
    parser.add_argument("--no-install", action="store_true", help="skip npm install")
    args = parser.parse_args()

    app_name = args.name
    if not APP_NAME_RE.match(app_name):
        fail(f"'{app_name}' is not a valid app name — use snake_case (e.g. recipe_box)")

    subdomain = (
        args.subdomain if args.subdomain is not None else default_subdomain(app_name)
    )
    if subdomain and not SUBDOMAIN_RE.match(subdomain):
        fail(
            f"'{subdomain}' is not a valid subdomain — use kebab-case (e.g. recipe-box)"
        )
    if subdomain.startswith("test-") or subdomain == "test":
        fail("the 'test' / 'test-*' namespace is reserved for test deployments")

    app_dir = REPO_ROOT / "apps" / app_name
    if app_dir.exists():
        fail(f"{app_dir.relative_to(REPO_ROOT)} already exists")
    if not TEMPLATE_DIR.is_dir():
        fail(f"template directory missing: {TEMPLATE_DIR}")

    title = args.title or default_title(app_name)
    domain = "ryanzrau.dev"
    fqdn = f"{subdomain}.{domain}" if subdomain else domain

    created = scaffold_files(
        app_dir,
        {
            "__APP_NAME__": app_name,
            "__TITLE__": title,
            "__SUBDOMAIN__": subdomain,
            "__FQDN__": fqdn,
        },
    )
    register_in_deploy_yml(app_name, subdomain, args.port, not args.disabled)

    print(f"\nCreated apps/{app_name}:")
    for path in created:
        print(f"  {path}")
    print(
        f"Registered '{app_name}' in deploy.yml (enabled: {str(not args.disabled).lower()})"
    )

    installed = True
    if args.no_install:
        installed = False
        note = "skipped (--no-install)"
    else:
        installed, note = npm_install(app_dir)

    print("\nNext steps:")
    step = 1
    if not installed:
        print(
            f"  {step}. cd apps/{app_name} && npm install   # {note}; needed for the lockfile"
        )
        step += 1
    print(f"  {step}. npm run dev in apps/{app_name} and build the thing")
    step += 1
    print(f"  {step}. python3 infra/validate_deploy.py to check the config")
    step += 1
    print(
        f"  {step}. commit (including package-lock.json) and push to main — it deploys to {fqdn}"
    )


if __name__ == "__main__":
    main()
