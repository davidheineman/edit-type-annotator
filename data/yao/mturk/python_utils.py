"""Python utils."""

import code  # code.interact(local=dict(globals(), **locals()))
import os
from typing import List, Tuple, Dict, Set, Any, Optional, Callable

import pandas as pd


def read(path: str) -> str:
    """Returns contents of file at `path`, leading/trailing whitespace stripped."""
    with open(os.path.expanduser(path), "r") as f:
        return f.read().strip()


def write(path: str, contents: str, info_print: bool = True) -> None:
    """Writes contents to path, makes dirs if needed, prints info msg w/ path."""
    dirname = os.path.dirname(path)
    if dirname != "":
        os.makedirs(dirname, exist_ok=True)
    with open(path, "w") as f:
        f.write(contents)
    if info_print:
        print('Wrote {} chars to "{}"'.format(len(contents), path))


def print_mturk_cols(path: str) -> None:
    """Prints mturk columns for csv file at `path`.

    NOTE: May want to make command line util at some point. Have to figure out how to do
    this.
    """
    df = pd.read_csv(path)
    inputs, outputs, admin = [], [], []
    for c in df.columns:
        if c.startswith("Input."):
            inputs.append(c)
        elif c.startswith("Answer."):
            outputs.append(c)
        else:
            admin.append(c)

    print("Admin:")
    print(", ".join(sorted(admin)))
    print()
    print("Inputs:")
    for i in sorted(inputs):
        print(f"\t{i}")
    print("Outputs:")
    for o in sorted(outputs):
        print(f"\t{o}")


def main() -> None:
    # This would be for testing out code only.
    pass


if __name__ == "__main__":
    main()