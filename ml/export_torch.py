import argparse
from pathlib import Path

import torch
from torch import nn
from torchvision import models


class InferenceModel(nn.Module):
    def __init__(self, model: nn.Module):
        super().__init__()
        self.model = model

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)


def build_model(num_classes: int, dropout: float = 0.35) -> nn.Module:
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[0] = nn.Dropout(p=dropout)
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description="Export PyTorch checkpoint to TorchScript and ONNX")
    parser.add_argument("--checkpoint", type=Path, default=Path("ml/artifacts/model.pt"))
    parser.add_argument("--output-dir", type=Path, default=Path("ml/artifacts/exports"))
    parser.add_argument("--opset", type=int, default=17)
    args = parser.parse_args()

    if not args.checkpoint.exists():
        raise FileNotFoundError(f"Checkpoint not found: {args.checkpoint}")

    payload = torch.load(args.checkpoint, map_location="cpu")
    class_names = payload["class_names"]
    image_size = int(payload.get("image_size", 224))

    model = build_model(num_classes=len(class_names))
    model.load_state_dict(payload["state_dict"])
    model.eval()

    wrapped = InferenceModel(model)
    wrapped.eval()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    dummy = torch.randn(1, 3, image_size, image_size)

    ts_path = args.output_dir / "model.torchscript.pt"
    scripted = torch.jit.trace(wrapped, dummy)
    scripted.save(str(ts_path))

    onnx_path = args.output_dir / "model.onnx"
    torch.onnx.export(
        wrapped,
        dummy,
        str(onnx_path),
        export_params=True,
        opset_version=args.opset,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={
            "input": {0: "batch"},
            "logits": {0: "batch"},
        },
    )

    (args.output_dir / "labels.txt").write_text("\n".join(class_names), encoding="utf-8")

    print(f"TorchScript exported: {ts_path}")
    print(f"ONNX exported: {onnx_path}")
    print(f"Labels exported: {args.output_dir / 'labels.txt'}")


if __name__ == "__main__":
    main()
