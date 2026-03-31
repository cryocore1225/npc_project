import argparse
import shutil
import subprocess
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Export SavedModel to TensorFlow.js graph model")
    parser.add_argument("--saved-model", type=Path, default=Path("ml/artifacts/saved_model"))
    parser.add_argument("--labels", type=Path, default=Path("ml/artifacts/labels.txt"))
    parser.add_argument("--output-dir", type=Path, default=Path("ml/artifacts/tfjs_model"))
    parser.add_argument("--quantization", choices=["none", "float16", "uint8"], default="float16")
    args = parser.parse_args()

    if not args.saved_model.exists():
        raise FileNotFoundError(f"SavedModel not found: {args.saved_model}")

    args.output_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        "tensorflowjs_converter",
        "--input_format", "tf_saved_model",
        "--output_format", "tfjs_graph_model",
        "--signature_name", "serving_default",
        "--saved_model_tags", "serve",
    ]

    if args.quantization == "float16":
        cmd.extend(["--quantize_float16", "*"])
    elif args.quantization == "uint8":
        cmd.extend(["--quantize_uint8", "*"])

    cmd.extend([str(args.saved_model), str(args.output_dir)])

    subprocess.run(cmd, check=True)

    if args.labels.exists():
        shutil.copy2(args.labels, args.output_dir / "labels.txt")

    print(f"TF.js model exported: {args.output_dir / 'model.json'}")
    if args.labels.exists():
        print(f"Labels copied: {args.output_dir / 'labels.txt'}")


if __name__ == "__main__":
    main()
