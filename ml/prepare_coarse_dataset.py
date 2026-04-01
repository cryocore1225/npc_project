import argparse
import shutil
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Unified coarse classes use garbage_classification naming.
REALWASTE_TO_COARSE = {
    "cardboard": "cardboard",
    "food organics": "biological",
    "glass": "white-glass",
    "metal": "metal",
    "miscellaneous trash": "trash",
    "paper": "paper",
    "plastic": "plastic",
    "textile trash": "clothes",
    "vegetation": "biological",
}


def collect_images(class_dir: Path) -> list[Path]:
    return sorted(
        p for p in class_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )


def normalize_label(name: str) -> str:
    return " ".join(name.strip().lower().replace("_", " ").split())


def copy_with_unique_name(src: Path, target_dir: Path, prefix: str) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    base = f"{prefix}__{src.stem}"
    ext = src.suffix.lower()

    candidate = target_dir / f"{base}{ext}"
    if not candidate.exists():
        shutil.copy2(src, candidate)
        return

    i = 1
    while True:
        candidate = target_dir / f"{base}__dup{i}{ext}"
        if not candidate.exists():
            shutil.copy2(src, candidate)
            return
        i += 1


def import_garbage_classification(input_dir: Path, output_dir: Path) -> dict[str, int]:
    stats: dict[str, int] = {}
    for class_dir in sorted(p for p in input_dir.iterdir() if p.is_dir()):
        class_name = class_dir.name
        images = collect_images(class_dir)
        for idx, src in enumerate(images):
            copy_with_unique_name(
                src,
                output_dir / class_name,
                prefix=f"gc_{idx}",
            )
        stats[class_name] = len(images)
    return stats


def import_realwaste(input_dir: Path, output_dir: Path, unknown_policy: str) -> tuple[dict[str, int], dict[str, int]]:
    mapped_counts: dict[str, int] = {}
    skipped_counts: dict[str, int] = {}

    for class_dir in sorted(p for p in input_dir.iterdir() if p.is_dir()):
        raw_name = class_dir.name
        key = normalize_label(raw_name)
        mapped = REALWASTE_TO_COARSE.get(key)

        if mapped is None:
            images = collect_images(class_dir)
            if unknown_policy == "skip":
                skipped_counts[raw_name] = len(images)
                continue
            mapped = key.replace(" ", "-")

        images = collect_images(class_dir)
        for idx, src in enumerate(images):
            copy_with_unique_name(
                src,
                output_dir / mapped,
                prefix=f"rw_{idx}",
            )
        mapped_counts[mapped] = mapped_counts.get(mapped, 0) + len(images)

    return mapped_counts, skipped_counts


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare unified coarse waste dataset from garbage_classification + realwaste"
    )
    parser.add_argument("--garbage-dir", type=Path, required=True)
    parser.add_argument("--realwaste-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True, help="Output raw folder: output/<class_name>/*")
    parser.add_argument("--clean", action="store_true", help="Remove output-dir before processing")
    parser.add_argument(
        "--unknown-realwaste-label",
        choices=["skip", "new-class"],
        default="skip",
        help="How to handle realwaste labels not present in mapping",
    )
    args = parser.parse_args()

    if not args.garbage_dir.exists():
        raise FileNotFoundError(f"garbage-dir not found: {args.garbage_dir}")
    if not args.realwaste_dir.exists():
        raise FileNotFoundError(f"realwaste-dir not found: {args.realwaste_dir}")

    if args.clean and args.output_dir.exists():
        shutil.rmtree(args.output_dir)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    gc_stats = import_garbage_classification(args.garbage_dir, args.output_dir)
    rw_mapped, rw_skipped = import_realwaste(
        args.realwaste_dir,
        args.output_dir,
        unknown_policy=args.unknown_realwaste_label,
    )

    print("\nImported from garbage_classification:")
    for cls in sorted(gc_stats.keys()):
        print(f"  {cls:<25} {gc_stats[cls]:>6}")

    print("\nImported from realwaste (after mapping):")
    for cls in sorted(rw_mapped.keys()):
        print(f"  {cls:<25} {rw_mapped[cls]:>6}")

    if rw_skipped:
        print("\nSkipped realwaste classes:")
        for cls in sorted(rw_skipped.keys()):
            print(f"  {cls:<25} {rw_skipped[cls]:>6}")

    print(f"\nDone. Unified raw output: {args.output_dir}")


if __name__ == "__main__":
    main()
