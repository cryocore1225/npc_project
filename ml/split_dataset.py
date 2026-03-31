import argparse
import random
import shutil
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def collect_images(class_dir: Path) -> list[Path]:
    files = [p for p in class_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS]
    return sorted(files)


def copy_split(files: list[Path], train_ratio: float, val_ratio: float, seed: int) -> tuple[list[Path], list[Path], list[Path]]:
    rng = random.Random(seed)
    shuffled = files[:]
    rng.shuffle(shuffled)

    n = len(shuffled)
    n_train = int(n * train_ratio)
    n_val = int(n * val_ratio)
    n_test = n - n_train - n_val

    train_files = shuffled[:n_train]
    val_files = shuffled[n_train : n_train + n_val]
    test_files = shuffled[n_train + n_val : n_train + n_val + n_test]
    return train_files, val_files, test_files


def copy_files(files: list[Path], target_dir: Path) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    for src in files:
        shutil.copy2(src, target_dir / src.name)


def main() -> None:
    parser = argparse.ArgumentParser(description="Split image folder dataset into train/val/test.")
    parser.add_argument("--input-dir", required=True, type=Path, help="Input root: input_dir/<class_name>/*")
    parser.add_argument("--output-dir", required=True, type=Path, help="Output root with train/val/test")
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--min-images", type=int, default=20)
    parser.add_argument("--clean", action="store_true", help="Remove output-dir before splitting")
    args = parser.parse_args()

    if args.train_ratio <= 0 or args.val_ratio < 0 or args.train_ratio + args.val_ratio >= 1:
        raise ValueError("train_ratio and val_ratio are invalid; require 0 < train_ratio, 0 <= val_ratio, train+val < 1")

    if not args.input_dir.exists():
        raise FileNotFoundError(f"input-dir not found: {args.input_dir}")

    if args.clean and args.output_dir.exists():
        shutil.rmtree(args.output_dir)

    class_dirs = sorted([p for p in args.input_dir.iterdir() if p.is_dir()])
    if not class_dirs:
        raise RuntimeError(f"No class directories found in {args.input_dir}")

    summary: list[tuple[str, int, int, int, int]] = []

    for class_dir in class_dirs:
        class_name = class_dir.name
        images = collect_images(class_dir)
        if len(images) < args.min_images:
            print(f"[WARN] Skip class '{class_name}' because images={len(images)} < min-images={args.min_images}")
            continue

        train_files, val_files, test_files = copy_split(
            images,
            train_ratio=args.train_ratio,
            val_ratio=args.val_ratio,
            seed=args.seed,
        )

        copy_files(train_files, args.output_dir / "train" / class_name)
        copy_files(val_files, args.output_dir / "val" / class_name)
        copy_files(test_files, args.output_dir / "test" / class_name)

        summary.append((class_name, len(images), len(train_files), len(val_files), len(test_files)))

    if not summary:
        raise RuntimeError("No classes passed min-images filter; nothing was written.")

    print("\nSplit summary:")
    for row in summary:
        print(f"  class={row[0]:<25} total={row[1]:>5} train={row[2]:>5} val={row[3]:>5} test={row[4]:>5}")

    print(f"\nDone. Output: {args.output_dir}")


if __name__ == "__main__":
    main()
