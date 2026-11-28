#!/usr/bin/env python3
"""Publish a pinned public GitHub commit's web/ directory over an SSH session.

Python 3.6+, standard library only. Run on the destination host with --commit,
--document-root and --release-root. The release root must be outside the public
document root. No credentials are read, stored or passed to GitHub.

Publication replaces only document-root/subdir, and only when that entry is
absent or already a symlink resolving inside release-root. Previous releases
are never removed; the JSON result identifies the previous target for rollback.
The generated release-manifest.json contains no server filesystem paths.
"""

import argparse
import contextlib
import fcntl
import gzip
import hashlib
import json
import os
import re
import shutil
import stat
import sys
import tarfile
import tempfile
import time
import urllib.request
import uuid


MAX_ARCHIVE_BYTES = 200 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_WEB_BYTES = 200 * 1024 * 1024
MAX_FILES = 10000
CHUNK_BYTES = 1024 * 1024
MANIFEST_NAME = "release-manifest.json"
REQUIRED_FILES = frozenset((
    "index.html", "app.js", "engine.js", "game-data.js", "styles.css",
    "manifest.webmanifest", "sw.js", ".htaccess", "LICENSE.txt",
))
STATIC_EXTENSIONS = frozenset((
    ".html", ".css", ".js", ".mjs", ".json", ".webmanifest", ".svg",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".txt",
    ".woff", ".woff2", ".ttf", ".otf", ".map", ".wasm", ".mp3", ".ogg",
    ".wav", ".mp4", ".webm",
))


class DeploymentError(Exception):
    """A deployment refused before replacing any unrelated public content."""


def is_inside(path, root):
    """Strict descendant test, with paths that have already been canonicalized."""
    return path != root and os.path.commonpath((path, root)) == root


def canonical_absolute(value, label):
    if not value or not os.path.isabs(value):
        raise DeploymentError("{} must be an absolute path".format(label))
    return os.path.realpath(value)


def safe_subdir(value):
    parts = value.split("/")
    if not parts or any(not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", part) for part in parts):
        raise DeploymentError("subdir must contain relative directory names without traversal")
    return parts


def ensure_directory(path, mode=0o755):
    if os.path.lexists(path):
        if os.path.islink(path) or not os.path.isdir(path):
            raise DeploymentError("Expected a real directory: {}".format(path))
    else:
        os.mkdir(path, mode)
        os.chmod(path, mode)


def publication_target(document_root, parts):
    parent = document_root
    for part in parts[:-1]:
        parent = os.path.join(parent, part)
        ensure_directory(parent)
    return os.path.join(parent, parts[-1])


def inspect_target(target, release_root):
    if not os.path.lexists(target):
        return None
    if not os.path.islink(target):
        raise DeploymentError("Publication target exists and is not a symlink; refusing replacement")
    resolved = os.path.realpath(target)
    if not is_inside(resolved, release_root):
        raise DeploymentError("Existing publication link points outside release-root")
    return resolved


@contextlib.contextmanager
def deployment_lock(release_root):
    lock_path = os.path.join(release_root, ".deploy.lock")
    flags = os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(lock_path, flags, 0o600)
    try:
        if not stat.S_ISREG(os.fstat(descriptor).st_mode):
            raise DeploymentError("Deployment lock is not a regular file")
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise DeploymentError("Another deployment is using this release-root")
        yield
    finally:
        os.close(descriptor)


def download_archive(repo, commit, destination):
    url = "https://codeload.github.com/{}/tar.gz/{}".format(repo, commit)
    request = urllib.request.Request(url, headers={
        "User-Agent": "ussr-simulator-static-deployer/1",
        "Accept": "application/gzip",
    })
    started = time.monotonic()
    with urllib.request.urlopen(request, timeout=45) as response:
        length = response.headers.get("Content-Length")
        if length and length.isdigit() and int(length) > MAX_ARCHIVE_BYTES:
            raise DeploymentError("GitHub archive exceeds the 200 MiB download limit")
        count = 0
        with open(destination, "xb") as output:
            while True:
                chunk = response.read(CHUNK_BYTES)
                if not chunk:
                    break
                count += len(chunk)
                if count > MAX_ARCHIVE_BYTES:
                    raise DeploymentError("GitHub archive exceeds the 200 MiB download limit")
                if time.monotonic() - started > 300:
                    raise DeploymentError("GitHub download exceeded five minutes")
                output.write(chunk)
        if not count:
            raise DeploymentError("GitHub returned an empty archive")


class BoundedReader:
    """Bound the decompressed tar stream as well as the downloaded gzip file."""

    def __init__(self, source, limit):
        self.source = source
        self.limit = limit
        self.total = 0

    def read(self, size=-1):
        if size < 0:
            size = self.limit - self.total + 1
        data = self.source.read(min(size, self.limit - self.total + 1))
        self.total += len(data)
        if self.total > self.limit:
            raise DeploymentError("Uncompressed archive exceeds the 1 GiB safety limit")
        return data


def archive_parts(name):
    if not isinstance(name, str) or "\\" in name or "\x00" in name or name.startswith("/"):
        raise DeploymentError("Archive contains an unsafe path")
    parts = name.rstrip("/").split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise DeploymentError("Archive contains path traversal or an ambiguous path")
    return parts


def allowed_static_file(relative):
    if relative in ("communist-world-simulator.apk", "communist-world-simulator.apk.sha256"):
        return True
    if relative == ".htaccess":
        return True
    if any(part.startswith(".") for part in relative.split("/")):
        return False
    return os.path.splitext(relative)[1].lower() in STATIC_EXTENSIONS


def extract_web(archive_path, destination, repo, commit):
    """Extract manually; never call tarfile.extract/extractall or follow tar links."""
    expected_root = repo.split("/", 1)[1] + "-" + commit
    files = []
    seen = set()
    total_bytes = 0
    with gzip.open(archive_path, "rb") as compressed:
        bounded = BoundedReader(compressed, MAX_UNCOMPRESSED_BYTES)
        with tarfile.open(fileobj=bounded, mode="r|") as archive:
            for member in archive:
                parts = archive_parts(member.name)
                if parts[0] != expected_root:
                    raise DeploymentError("Archive root does not match the requested repository and commit")
                if len(parts) < 2 or parts[1] != "web":
                    continue
                if len(parts) == 2:
                    if not member.isdir():
                        raise DeploymentError("Archive web/ root is not a directory")
                    continue
                relative = "/".join(parts[2:])
                if relative in seen:
                    raise DeploymentError("Archive contains duplicate web paths")
                seen.add(relative)
                if member.issym() or member.islnk():
                    raise DeploymentError("Links are forbidden in web/")
                path = os.path.join(destination, *parts[2:])
                if member.isdir():
                    ensure_extract_parents(destination, parts[2:])
                    continue
                if member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE) or getattr(member, "sparse", None):
                    raise DeploymentError("Only regular static files and directories are accepted")
                if not allowed_static_file(relative) or relative == MANIFEST_NAME:
                    raise DeploymentError("Unexpected or reserved static file: {}".format(relative))
                file_limit = 95 * 1024 * 1024 if relative == "communist-world-simulator.apk" else MAX_FILE_BYTES
                if member.size < 0 or member.size > file_limit:
                    raise DeploymentError("A static file exceeds its configured size limit")
                total_bytes += member.size
                if total_bytes > MAX_WEB_BYTES or len(files) >= MAX_FILES:
                    raise DeploymentError("web/ exceeds the total size or file-count limit")
                ensure_extract_parents(destination, parts[2:-1])
                source = archive.extractfile(member)
                if source is None:
                    raise DeploymentError("A static file cannot be read")
                digest = hashlib.sha256()
                written = 0
                with source, open(path, "xb") as output:
                    while True:
                        chunk = source.read(min(CHUNK_BYTES, member.size - written + 1))
                        if not chunk:
                            break
                        written += len(chunk)
                        if written > member.size:
                            raise DeploymentError("Archive file exceeds its declared size")
                        digest.update(chunk)
                        output.write(chunk)
                if written != member.size:
                    raise DeploymentError("Archive contains a truncated static file")
                os.chmod(path, 0o644)
                files.append({"path": relative, "bytes": written, "sha256": digest.hexdigest()})
    paths = set(item["path"] for item in files)
    missing = REQUIRED_FILES - paths
    if missing:
        raise DeploymentError("Missing required web files: {}".format(", ".join(sorted(missing))))
    if not any(path.startswith("assets/") for path in paths):
        raise DeploymentError("Required assets/ directory contains no static files")
    files.sort(key=lambda item: item["path"])
    return files


def ensure_extract_parents(destination, parts):
    path = destination
    for part in parts:
        path = os.path.join(path, part)
        ensure_directory(path)


def manifest_bytes(repo, commit, files):
    value = {"schema": 1, "repository": repo, "commit": commit, "files": files}
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def verify_existing_release(path, manifest, files):
    """Reuse an immutable release only when all its bytes and paths still agree."""
    if os.path.islink(path) or not os.path.isdir(path):
        raise DeploymentError("The commit release path already exists and is not a real directory")
    expected = {item["path"]: item for item in files}
    expected[MANIFEST_NAME] = {"bytes": len(manifest), "sha256": hashlib.sha256(manifest).hexdigest()}
    found = set()
    for root, directories, filenames in os.walk(path, followlinks=False):
        if stat.S_IMODE(os.stat(root).st_mode) != 0o755:
            raise DeploymentError("Existing release has unexpected directory permissions")
        for directory in directories:
            child = os.path.join(root, directory)
            if os.path.islink(child) or not os.path.isdir(child):
                raise DeploymentError("Existing release contains a directory link")
        for filename in filenames:
            full = os.path.join(root, filename)
            relative = os.path.relpath(full, path).replace(os.sep, "/")
            metadata = os.lstat(full)
            if not stat.S_ISREG(metadata.st_mode) or stat.S_IMODE(metadata.st_mode) != 0o644 or relative not in expected:
                raise DeploymentError("Existing release contains an unexpected file or link")
            if metadata.st_size != expected[relative]["bytes"]:
                raise DeploymentError("Existing release differs from the requested commit")
            digest = hashlib.sha256()
            with open(full, "rb") as source:
                for chunk in iter(lambda: source.read(CHUNK_BYTES), b""):
                    digest.update(chunk)
            if digest.hexdigest() != expected[relative]["sha256"]:
                raise DeploymentError("Existing release failed SHA-256 verification")
            found.add(relative)
    if found != set(expected):
        raise DeploymentError("Existing release is incomplete")


def publish(args):
    if not re.fullmatch(r"[0-9a-fA-F]{40}", args.commit):
        raise DeploymentError("commit must be an exact 40-character hexadecimal SHA")
    commit = args.commit.lower()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9][A-Za-z0-9._-]*", args.repo):
        raise DeploymentError("repo must be a public GitHub owner/repository name")
    document_root = canonical_absolute(args.document_root, "document-root")
    release_root = canonical_absolute(args.release_root, "release-root")
    if not os.path.isdir(document_root):
        raise DeploymentError("document-root does not exist or is not a directory")
    if release_root == document_root or is_inside(release_root, document_root):
        raise DeploymentError("release-root must be outside document-root")
    if release_root == os.path.sep or is_inside(document_root, release_root):
        raise DeploymentError("release-root must be a dedicated directory, not an ancestor of document-root")
    parts = safe_subdir(args.subdir)
    if not os.path.exists(release_root):
        os.makedirs(release_root, mode=0o755)
        os.chmod(release_root, 0o755)
    ensure_directory(release_root)
    with deployment_lock(release_root):
        target = publication_target(document_root, parts)
        previous = inspect_target(target, release_root)
        release = os.path.join(release_root, commit)
        work = tempfile.mkdtemp(prefix=".stage-", dir=release_root)
        os.chmod(work, 0o700)
        temporary_link = None
        try:
            archive_path = os.path.join(work, "archive.tar.gz")
            download_archive(args.repo, commit, archive_path)
            payload = os.path.join(work, "payload")
            ensure_directory(payload)
            files = extract_web(archive_path, payload, args.repo, commit)
            manifest = manifest_bytes(args.repo, commit, files)
            with open(os.path.join(payload, MANIFEST_NAME), "xb") as output:
                output.write(manifest)
            os.chmod(os.path.join(payload, MANIFEST_NAME), 0o644)
            if os.path.lexists(release):
                verify_existing_release(release, manifest, files)
            else:
                os.rename(payload, release)
            if inspect_target(target, release_root) != previous:
                raise DeploymentError("Publication target changed while the release was prepared")
            temporary_link = os.path.join(os.path.dirname(target), ".ussr-publish-" + uuid.uuid4().hex)
            os.symlink(release, temporary_link)
            os.replace(temporary_link, target)
            temporary_link = None
            return {"commit": commit, "target": target, "previous": previous,
                    "files": len(files) + 1, "digest": hashlib.sha256(manifest).hexdigest()}
        finally:
            if temporary_link is not None and os.path.islink(temporary_link):
                os.unlink(temporary_link)
            shutil.rmtree(work)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--commit", required=True, help="Exact public GitHub commit SHA (40 hexadecimal characters)")
    parser.add_argument("--document-root", required=True, help="Existing absolute document root on this host")
    parser.add_argument("--release-root", required=True, help="Dedicated absolute release directory outside document-root")
    parser.add_argument("--subdir", default="jeux/ussr-simulator", help="Relative public destination (default: jeux/ussr-simulator)")
    parser.add_argument("--repo", default="jasmin-abernathy/ussr-simulator", help="Public GitHub owner/repository")
    args = parser.parse_args()
    os.umask(0o022)
    try:
        result = publish(args)
    except (DeploymentError, OSError, ValueError, tarfile.TarError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True, separators=(",", ":"), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
