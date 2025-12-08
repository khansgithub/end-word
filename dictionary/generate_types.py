# gpt code

import inspect
import importlib
from typing import Any


def format_annotation(ann):
    if ann is inspect._empty:
        return "Any"
    if isinstance(ann, type):
        return ann.__name__
    return repr(ann)


def signature_to_pyi(fn):
    try:
        sig = inspect.signature(fn)
    except Exception:
        return "(self, *args, **kwargs) -> Any"

    params = []
    for name, param in sig.parameters.items():
        ann = format_annotation(param.annotation)
        if param.default is inspect._empty:
            params.append(f"{name}: {ann}")
        else:
            params.append(f"{name}: {ann} = ...")

    ret = format_annotation(sig.return_annotation)
    return f"({', '.join(params)}) -> {ret}"


def is_cython_method(obj):
    """
    Detects Cython methods like:
      - builtin_function_or_method
      - method_descriptor
      - wrapper_descriptor
      - cython_function_or_method (Py3.12+)
    """
    return (
        inspect.isroutine(obj)
        or inspect.ismethoddescriptor(obj)
        or isinstance(obj, (type(object.__init__),))
    )


def extract_class(cls):
    lines = [f"class {cls.__name__}:"]
    indent = "    "

    attrs = cls.__dict__

    # ---- Class attributes ----
    for name, value in attrs.items():
        if not callable(value) and not name.startswith("__"):
            lines.append(f"{indent}{name}: Any")

    method_found = False

    # ---- Methods (Cython-compatible) ----
    for name, value in attrs.items():
        if name.startswith("__") and name not in ("__init__", "__call__"):
            continue

        if is_cython_method(value):
            method_found = True
            sig = signature_to_pyi(value)
            lines.append(f"{indent}def {name}{sig}: ...")

    if not method_found and len(lines) == 1:
        lines.append(f"{indent}...")

    return lines


def extract_function(name, fn):
    sig = signature_to_pyi(fn)
    return f"def {name}{sig}: ..."


def generate_pyi(module_name, output_path):
    module = importlib.import_module(module_name)
    lines = ["from typing import Any\n"]

    # ---- module-level functions ----
    for name, fn in module.__dict__.items():
        if inspect.isroutine(fn) and fn.__module__ == module_name:
            lines.append(extract_function(name, fn))

    # ---- classes ----
    for name, cls in module.__dict__.items():
        if inspect.isclass(cls) and cls.__module__ == module_name:
            lines.append("")  # spacing
            lines.extend(extract_class(cls))
            lines.append("")

    with open(output_path, "w") as f:
        f.write("\n".join(lines))

    print(f"Written {output_path}")

# Usage example:
generate_pyi("marisa_trie", "foo.pyi")