#!/usr/bin/env python3
"""A luce-ui program that traps is started again to show its report: build a small program
that traps in its run loop, run it in a scratch home, and check the report (named by the
program's package), the crash hook's recovery copy, and the second process, which must carry
LUCE_CRASH_REPORT, read the report and keep its crash window up until it is ended here."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base", type=Path, default=ROOT.parent / "luce-base/build/luce-base")
args = parser.parse_args()


def processes_of(binary: Path):
    """The processes running `binary`, by PID: its path is unique to this run."""
    listing = subprocess.run(["ps", "-axo", "pid=,command="], capture_output=True, text=True, check=True).stdout
    found = []
    for line in listing.splitlines():
        pid, _, command = line.strip().partition(" ")
        if command.strip() == str(binary):
            found.append(int(pid))
    return found


def environment_of(pid: int) -> str:
    """The command line and environment `ps` shows for one of our own processes."""
    return subprocess.run(["ps", "eww", "-o", "command=", "-p", str(pid)], capture_output=True, text=True).stdout


def wait_for(found, seconds=20.0):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        answer = found()
        if answer:
            return answer
        time.sleep(0.1)
    raise SystemExit("timed out")


with tempfile.TemporaryDirectory(prefix="luce-ui-crash-") as temporary:
    work = Path(temporary)
    home = work / "home"
    home.mkdir()
    project = work / "project"
    (project / "src").mkdir(parents=True)
    (project / "src/main.lucb").write_text((ROOT / "tests/crash_relaunch_main.lucb").read_text())
    dependencies = ''.join(f'    def dependency "{name}" {{\n        str path = {json.dumps((ROOT if name == "luce-ui" else ROOT.parent / name).as_posix())}\n    }}\n' for name in ('luce-ui', 'luce-std'))
    (project / "package.prisma").write_text('#prisma 4.0\ndef package "crash-relaunch" {\n    str version = "0.0.7"\n' + dependencies + '}\n')
    binary = work / "crash-relaunch"
    subprocess.run([str(args.base.resolve()), "build", str(project / "src/main.lucb"), "--native", "-o", str(binary)], check=True, timeout=300)
    env = {name: value for name, value in os.environ.items() if name != "LUCE_CRASH_REPORT"}
    env.update(HOME=str(home))
    reporters = []
    try:
        result = subprocess.run([str(binary)], env=env, capture_output=True, timeout=60)
        assert result.returncode == 1, f"the program exited {result.returncode}: {result.stderr.decode(errors='replace')}"
        assert b"a deliberate trap in the run loop" in result.stderr
        crashes = home / ".luce/crashes"
        report = wait_for(lambda: [Path(str(p).removesuffix(".seen")) for p in crashes.glob("crash-relaunch-*.crash*")])[0]
        recovered = home / ".luce/recovery/crash-relaunch/scene.recovered"
        assert recovered.read_text() == "the scene, as it was"
        reporters = wait_for(lambda: processes_of(binary))
        assert len(reporters) == 1, f"expected one reporter, found {reporters}"
        assert f"LUCE_CRASH_REPORT={report}" in environment_of(reporters[0]), environment_of(reporters[0])[:400]
        # the reporter read the report (and marked it taken) to fill its window
        seen = Path(f"{report}.seen")
        text = wait_for(lambda: seen.exists() and seen.read_text(errors="replace"))
        assert "app: crash-relaunch\nversion: 0.0.7\n" in text, text[:300]
        assert f"recovery: {recovered}" in text, text
        # the window stays up, waiting for a choice
        time.sleep(1.5)
        assert processes_of(binary) == reporters, "the crash window did not stay up"
        print("PASS a trapping luce-ui program is started again to show its report")
    finally:
        for pid in reporters:
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        if reporters:
            time.sleep(0.5)
            for pid in reporters:
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
