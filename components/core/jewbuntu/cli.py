"""`jewbuntu` command-line interface."""

import argparse
import json
import sys

from . import config, paths
from .version import __version__, installed_package_versions


def _print(obj, as_json):
    if as_json:
        print(json.dumps(obj, indent=2, ensure_ascii=False, default=str))
    else:
        print(obj)


def cmd_version(args):
    info = {"jewbuntu": __version__, "packages": installed_package_versions(), "settings_schema": config.SCHEMA_VERSION}
    if args.json:
        _print(info, True)
    else:
        print(f"Jewbuntu {__version__} (settings schema {config.SCHEMA_VERSION})")
        for pkg, ver in info["packages"].items():
            print(f"  {pkg} {ver}")


def cmd_config(args):
    if args.action == "show":
        _print(config.load(), True)
    elif args.action == "path":
        print(paths.settings_file())
    elif args.action == "get":
        print(json.dumps(config.get_key(config.load(), args.key), ensure_ascii=False))
    elif args.action == "set":
        config.set_key(args.key, args.value)
        print(f"{args.key} = {json.dumps(config.get_key(config.load(), args.key), ensure_ascii=False)}")
    elif args.action == "migrate":
        result = config.migrate()
        if not args.quiet or result["status"] == "migrated":
            _print(result, True)
        try:  # keep GTK4 apps on the installed skin (older versions copied the files)
            from . import desktop_defaults
            note = desktop_defaults.refresh_libadwaita()
            if note and not args.quiet:
                print(note)
        except Exception as e:  # never block login on this
            print(f"note: could not refresh the GTK4 look: {e}", file=sys.stderr)
        try:  # extensions that changed their UUID (ShulGo), so they stay enabled
            from . import renames
            for note in renames.migrate_extensions():
                if not args.quiet:
                    print(note)
        except Exception as e:
            print(f"note: could not update renamed extensions: {e}", file=sys.stderr)
    elif args.action == "validate":
        problems = config.validate(config.load())
        print("\n".join(problems) if problems else "settings valid")
        return 1 if problems else 0
    elif args.action == "backup":
        print(config.backup() or "no settings file to back up")
    return 0


def cmd_doctor(args):
    from . import doctor
    report = doctor.full_report()
    _print(report, True) if args.json else print(doctor.format_text(report))


def cmd_upgrade_check(args):
    try:
        from . import upgrade
    except ImportError:
        print("Install jewbuntu-upgrade-tools for the readiness report.", file=sys.stderr)
        return 1
    report = upgrade.readiness_report(check_upstream=args.check_upstream)
    if args.export:
        from .userdata import export_bundle
        dest, _ = export_bundle()
        report["exported_settings"] = str(dest)
    _print(report, True) if args.json else print(upgrade.format_text(report))
    if report.get("exported_settings") and not args.json:
        print(f"\nSettings exported to {report['exported_settings']}")
    return 0


def cmd_repo(args):
    try:
        from . import repo
    except ImportError:
        print("Install jewbuntu-upgrade-tools for repository management.", file=sys.stderr)
        return 1
    if args.action == "status":
        _print(repo.status(), True)
    else:
        _print(repo.enroll(channel=args.channel, url=args.url, dry_run=args.dry_run), True)
    return 0


def cmd_export(args):
    from .userdata import export_bundle
    dest, manifest = export_bundle(args.path)
    print(f"Exported settings (schema {manifest['settings_schema']}) to {dest}")


def cmd_import(args):
    from .userdata import import_bundle
    _print(import_bundle(args.path, dry_run=args.dry_run), True)


def cmd_reset(args):
    from .userdata import reset, reset_plan
    plan = reset_plan()
    if not plan:
        print("Nothing to remove: no Jewbuntu data for this user.")
        return 0
    print("A reset removes this user's Jewbuntu data:")
    for item in plan:
        print(f"  {item['kind']:6} {item['path']} ({item['bytes']} bytes)")
    print("Your settings are exported to your home folder first." if not args.no_export else "No export will be made.")
    if not args.yes:
        if not sys.stdin.isatty():
            print("Re-run with --yes to confirm.")
            return 1
        if input("Type 'reset' to confirm: ").strip() != "reset":
            print("Cancelled.")
            return 1
    _print(reset(keep_backup=not args.no_export), True)
    return 0


def cmd_defaults(args):
    from . import desktop_defaults
    if args.action == "status":
        for row in desktop_defaults.status():
            mark = "=" if row["matches_jewbuntu"] else ("?" if not row["schema_installed"] else "*")
            print(f"{mark} {row['schema']} {row['key']}: {row['current']}  (Jewbuntu: {row['value']}) - {row['why']}")
        print("\n= Jewbuntu default   * you changed it   ? schema not installed")
    else:
        changes = desktop_defaults.restore(dry_run=args.dry_run)
        print("\n".join(changes) if changes else "All Jewbuntu-managed keys already at Jewbuntu defaults.")


def cmd_skin(args):
    from . import desktop_defaults as dd
    if args.action == "status":
        state = dd.read_state()
        changes = dd.pending_changes()
        print(f"Skin applied for this user: {state.get('applied', False)}  (first-login question: {state.get('prompt_answer', 'asked' if state.get('prompted') else 'not yet asked')})")
        print(f"Top-bar extension: {dd.extension_state()}")
        print("Would change:" if changes else "Nothing to change: this account already has the Jewbuntu look.")
        for c in changes:
            print(f"  - {c}")
    elif args.action == "apply":
        for line in dd.apply_skin() or ["already applied; nothing changed"]:
            print(line)
        print("Log out and back in to see every change.")
    elif args.action == "undo":
        for line in dd.undo_skin():
            print(line)
    elif args.action == "prompt":
        print(dd.prompt())
    return 0


def cmd_startup_sound(args):
    try:
        from . import startup_sound
    except ImportError:
        print("Install jewbuntu-branding for the startup sound.", file=sys.stderr)
        return 1
    if args.action in ("on", "off"):
        config.set_key("sound.startup.enabled", args.action == "on")
        print(f"Startup sound {args.action}.")
        return 0
    print(startup_sound.run(preview=True))
    return 0


def build_parser():
    p = argparse.ArgumentParser(prog="jewbuntu", description="Jewbuntu settings, diagnostics and maintenance.")
    p.add_argument("--version", action="version", version=f"jewbuntu {__version__}")
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("version", help="show Jewbuntu and package versions")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_version)

    s = sub.add_parser("config", help="view or change your settings")
    s.add_argument("action", choices=["show", "path", "get", "set", "migrate", "validate", "backup"])
    s.add_argument("key", nargs="?")
    s.add_argument("value", nargs="?")
    s.add_argument("--quiet", action="store_true")
    s.set_defaults(func=cmd_config)

    s = sub.add_parser("doctor", help="hardware inventory and profile suggestion")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_doctor)

    s = sub.add_parser("upgrade-check", help="Ubuntu upgrade readiness report (changes nothing)")
    s.add_argument("--json", action="store_true")
    s.add_argument("--check-upstream", action="store_true", help="ask Ubuntu whether a new release is offered")
    s.add_argument("--export", action="store_true", help="also export your settings")
    s.set_defaults(func=cmd_upgrade_check)

    s = sub.add_parser("repo", help="Jewbuntu APT repository status / enrollment")
    s.add_argument("action", choices=["status", "enroll"])
    s.add_argument("--channel", choices=["stable", "testing"])
    s.add_argument("--url")
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(func=cmd_repo)

    s = sub.add_parser("export", help="export your settings to a .tar.gz")
    s.add_argument("path", nargs="?")
    s.set_defaults(func=cmd_export)

    s = sub.add_parser("import", help="restore settings from an export")
    s.add_argument("path")
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(func=cmd_import)

    s = sub.add_parser("reset", help="remove your Jewbuntu data (asks first)")
    s.add_argument("--yes", action="store_true")
    s.add_argument("--no-export", action="store_true")
    s.set_defaults(func=cmd_reset)

    s = sub.add_parser("defaults", help="show or restore the desktop settings Jewbuntu manages")
    s.add_argument("action", choices=["status", "restore"])
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(func=cmd_defaults)

    s = sub.add_parser("skin", help="apply or undo the Jewbuntu look for your account")
    s.add_argument("action", choices=["status", "apply", "undo", "prompt"])
    s.set_defaults(func=cmd_skin)

    s = sub.add_parser("startup-sound", help="preview or switch the startup jingle")
    s.add_argument("action", choices=["preview", "on", "off"])
    s.set_defaults(func=cmd_startup_sound)
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        return args.func(args) or 0
    except config.NewerSchemaError as exc:
        print(f"jewbuntu: {exc}", file=sys.stderr)
        return 3
    except (config.ConfigError, KeyError) as exc:
        print(f"jewbuntu: {exc}", file=sys.stderr)
        return 2
    except ModuleNotFoundError as exc:
        # Builds for other distros (Fedora Asahi Remix) ship only part of the package.
        if not (exc.name or "").startswith("jewbuntu."):
            raise
        print(f"jewbuntu: '{args.command}' is not available on this system ({exc.name} is not installed)", file=sys.stderr)
        return 4
