#!/usr/bin/env python3
"""
Script to fix TypeScript TS6133 errors (unused variables) by prefixing with underscore
"""
import re
import subprocess
import sys
from pathlib import Path

def get_ts_errors():
    """Run tsc and collect TS6133 errors"""
    result = subprocess.run(
        ['npm', 'run', 'build'],
        capture_output=True,
        text=True,
        cwd='/Users/vivek/elite/angel-investing-marketplace/frontend'
    )

    output = result.stdout + result.stderr
    errors = []

    # Parse errors: src/file.tsx(line,col): error TS6133: 'varName' is declared but its value is never read.
    pattern = r"(src/[^(]+)\((\d+),(\d+)\): error TS6133: '([^']+)'"
    for match in re.finditer(pattern, output):
        file_path, line, col, var_name = match.groups()
        errors.append({
            'file': file_path,
            'line': int(line),
            'col': int(col),
            'var': var_name
        })

    return errors

def fix_unused_variable(file_path, line_num, var_name):
    """Fix an unused variable by prefixing with underscore"""
    full_path = Path('/Users/vivek/elite/angel-investing-marketplace/frontend') / file_path

    if not full_path.exists():
        return False

    with open(full_path, 'r') as f:
        lines = f.readlines()

    if line_num > len(lines):
        return False

    line = lines[line_num - 1]  # Convert to 0-indexed

    # Skip if already has underscore prefix
    if f'_{var_name}' in line:
        return False

    # Different patterns to fix
    patterns_and_replacements = [
        # Import: import { Foo, Bar } from
        (rf'\b{var_name}\b(\s*,|\s*\}})', rf'_{var_name}\1'),
        # Destructuring: const { foo, bar } =
        (rf'\{(\s*){var_name}\b', rf'{{\1_{var_name}'),
        # Regular declaration: const foo =
        (rf'\b(const|let|var)\s+{var_name}\b', rf'\1 _{var_name}'),
        # Function parameter: function(foo, bar)
        (rf'\(([^)]*)\b{var_name}\b', rf'(\1_{var_name}'),
        # Arrow function parameter: (foo) =>
        (rf'\b{var_name}\s*:', rf'_{var_name}:'),
    ]

    modified = False
    new_line = line
    for pattern, replacement in patterns_and_replacements:
        new_line_temp = re.sub(pattern, replacement, new_line)
        if new_line_temp != new_line:
            new_line = new_line_temp
            modified = True
            break

    if modified:
        lines[line_num - 1] = new_line
        with open(full_path, 'w') as f:
            f.writelines(lines)
        return True

    return False

def main():
    print("Analyzing TypeScript errors...")
    errors = get_ts_errors()

    ts6133_errors = [e for e in errors if e]
    print(f"Found {len(ts6133_errors)} unused variable errors")

    if not ts6133_errors:
        print("No TS6133 errors found!")
        return 0

    # Group by file
    files_to_fix = {}
    for error in ts6133_errors:
        file_path = error['file']
        if file_path not in files_to_fix:
            files_to_fix[file_path] = []
        files_to_fix[file_path].append(error)

    print(f"Fixing {len(files_to_fix)} files...")

    fixed_count = 0
    for file_path, errors_in_file in sorted(files_to_fix.items()):
        print(f"  {file_path}: {len(errors_in_file)} errors")
        # Sort by line number descending to avoid line number shifts
        for error in sorted(errors_in_file, key=lambda e: e['line'], reverse=True):
            if fix_unused_variable(error['file'], error['line'], error['var']):
                fixed_count += 1

    print(f"\nFixed {fixed_count} unused variables")

    # Run build again to check
    print("\nRunning build to verify...")
    result = subprocess.run(
        ['npm', 'run', 'build'],
        capture_output=True,
        text=True,
        cwd='/Users/vivek/elite/angel-investing-marketplace/frontend'
    )

    remaining = len(re.findall(r'error TS6133:', result.stdout + result.stderr))
    print(f"Remaining TS6133 errors: {remaining}")

    return 0

if __name__ == '__main__':
    sys.exit(main())
