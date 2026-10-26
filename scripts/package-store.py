#!/usr/bin/env python3
"""Validate local store-package constraints and produce a reproducible candidate ZIP."""

import hashlib
import json
import re
import struct
import zipfile
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent.parent
PACKAGE = ROOT / "store" / "sanctionskit"


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def read_json(relative):
    return json.loads((PACKAGE / relative).read_text())


def local_file(relative):
    require(relative.startswith("./"), f"Expected a relative package path: {relative}")
    path = (PACKAGE / relative).resolve()
    require(path.is_relative_to(PACKAGE.resolve()) and path.is_file(),
            f"Missing file or path outside package: {relative}")
    return path


def https_url(value):
    parsed = urlparse(value)
    return (parsed.scheme == "https" and bool(parsed.hostname)
            and not parsed.username and not parsed.password)


manifest = read_json("plugin.json")
claude = read_json(".claude-plugin/plugin.json")
codex = read_json(".codex-plugin/plugin.json")
require(manifest["name"] == PACKAGE.name, "Folder and plugin names differ")
require(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", manifest["name"]), "Invalid public name")
for other in (claude, codex):
    for field in ("name", "version", "author", "license"):
        require(other[field] == manifest[field], f"Client manifest differs: {field}")
require(manifest["author"]["name"] == "SanctionsKit LLC", "Publisher attribution differs")
require(re.fullmatch(r"\d+\.\d+\.\d+", manifest["version"]), "Expected a release version")

extension = manifest["extensions"]["com.openai"]
interface = extension["interface"]
for field, limit in (("displayName", 30), ("shortDescription", 30),
                     ("longDescription", 4000), ("developerName", 80)):
    require(isinstance(interface[field], str) and 0 < len(interface[field]) <= limit,
            f"Invalid public listing length: {field}")
for field in ("websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"):
    require(https_url(interface[field]), f"Missing valid HTTPS listing URL: {field}")
prompts = interface["defaultPrompt"]
require(isinstance(prompts, list) and 1 <= len(prompts) <= 3, "Expected 1-3 starter prompts")
require(len(set(prompts)) == len(prompts) and all(0 < len(p) <= 128 for p in prompts),
        "Starter prompts must be unique and no longer than 128 characters")
require(codex["interface"] == {k: v for k, v in interface.items() if k != "supportURL"},
        "Compatibility listing differs from the authoritative portable manifest")
local_file(extension["onboardingSkill"])

for field in ("logo", "composerIcon"):
    path = local_file(interface[field])
    png = path.read_bytes()
    require(png[:8] == b"\x89PNG\r\n\x1a\n" and png[12:16] == b"IHDR", "Invalid PNG icon")
    width, height = struct.unpack(">II", png[16:24])
    require(48 <= width == height <= 4096, "Public icons must be square and at least 48px")

review = extension["review"]
for kind, count in (("positive", 5), ("negative", 3)):
    cases = review["test_cases"][kind]
    require(len(cases) == count, f"Expected exactly {count} {kind} review cases")
    for case in cases:
        fields = ("description", "prompt", "tools_triggered", "expected_behavior") if kind == "positive" else ("description", "prompt")
        require(all(isinstance(case.get(f), str) and case[f].strip() for f in fields),
                f"Incomplete {kind} review case")
require("test_credentials" not in review and "reviewer_instructions" not in review,
        "Private reviewer details cannot be packaged")

portable_mcp = read_json("mcp.json")["mcpServers"]
client_mcp = read_json(".mcp.json")["mcpServers"]
require(list(portable_mcp) == list(client_mcp) == ["sanctionskit"], "Expected one MCP server")
require(portable_mcp["sanctionskit"]["type"] == "streamable-http", "Invalid portable transport")
require(client_mcp["sanctionskit"]["type"] == "http", "Invalid Claude transport")
for server in (portable_mcp["sanctionskit"], client_mcp["sanctionskit"]):
    require(server["url"] == "https://www.sanctionskit.com/mcp", "MCP destinations differ")
    require(not server.get("headers"), "Static headers cannot be included")
auth = portable_mcp["sanctionskit"]["extensions"]["com.openai"]["auth"]
require(auth["type"] == "mixed" and auth["client"]["mode"] == "provided",
        "Account tools require mixed access and the registered-client flow")
require("clientSecret" not in auth["client"], "Client secrets cannot be packaged")

files = sorted(p for p in PACKAGE.rglob("*") if p.is_file())
require(1 <= len(files) <= 512, "Unexpected file count")
seen = set()
for path in PACKAGE.rglob("*"):
    require(not path.is_symlink(), f"Symlinks are not allowed: {path.name}")
    relative = path.relative_to(PACKAGE).as_posix()
    require(relative.casefold() not in seen, f"Case-colliding path: {relative}")
    seen.add(relative.casefold())
    for part in path.relative_to(PACKAGE).parts:
        require(part not in {".git", ".DS_Store", "__MACOSX", "node_modules", "hooks"}
                and not part.startswith(".env"), f"Unexpected package entry: {relative}")
    if path.is_file():
        require(path.stat().st_size < 5 * 1024 * 1024, f"File exceeds directory limit: {relative}")
        if path.suffix != ".png":
            require(path.stat().st_size < 256 * 1024, f"Text file exceeds scan limit: {relative}")
            text = path.read_text()
            require(not re.search(r"(?:sk_(?:live|test)_[A-Za-z0-9]{16,}|-----BEGIN .*PRIVATE KEY)", text),
                    f"Possible credential in package: {relative}")
            require("127.0.0.1" not in text and "localhost" not in text,
                    f"Desktop callback in store package: {relative}")
readme = (PACKAGE / "README.md").read_text()
require(len(re.sub(r"```.*?```", "", readme, flags=re.S).split()) >= 40, "README is too short")
require((PACKAGE / "LICENSE").is_file(), "License missing")

destination = ROOT / "dist" / f"sanctionskit-store-{manifest['version']}.zip"
destination.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        info = zipfile.ZipInfo(path.relative_to(PACKAGE).as_posix(), (1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes())
with zipfile.ZipFile(destination) as archive:
    require(archive.testzip() is None, "ZIP integrity check failed")
    require("plugin.json" in archive.namelist() and ".claude-plugin/plugin.json" in archive.namelist(),
            "ZIP root layout is incorrect")

print(json.dumps({
    "local_package_checks": "passed",
    "archive": str(destination),
    "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
    "files": len(files),
    "bytes": destination.stat().st_size,
    "release_status": "candidate_only_not_submitted",
    "external_checks": "publisher access, OAuth, client tests, video, portal validation and approval remain unverified"
}, indent=2))
