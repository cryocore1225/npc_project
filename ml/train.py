import argparse
import json
from pathlib import Path

import tensorflow as tf


AUTOTUNE = tf.data.AUTOTUNE
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def make_datasets(train_dir: Path, val_dir: Path, image_size: int, batch_size: int):
    train_ds = tf.keras.utils.image_dataset_from_directory(
        train_dir,
        labels="inferred",
        label_mode="int",
        image_size=(image_size, image_size),
        batch_size=batch_size,
        shuffle=True,
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        val_dir,
        labels="inferred",
        label_mode="int",
        image_size=(image_size, image_size),
        batch_size=batch_size,
        shuffle=False,
    )

    class_names = train_ds.class_names

    train_ds = train_ds.cache().shuffle(2048).prefetch(AUTOTUNE)
    val_ds = val_ds.cache().prefetch(AUTOTUNE)
    return train_ds, val_ds, class_names


def build_model(num_classes: int, image_size: int, dropout: float):
    data_augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal"),
            tf.keras.layers.RandomRotation(0.08),
            tf.keras.layers.RandomZoom(0.12),
            tf.keras.layers.RandomContrast(0.1),
        ],
        name="data_augmentation",
    )

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(image_size, image_size, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(image_size, image_size, 3), name="image")
    x = data_augmentation(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base_model(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(dropout)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="classifier")(x)
    model = tf.keras.Model(inputs, outputs, name="waste_mobilenetv2")

    return model, base_model


def compute_class_weight_from_dir(train_dir: Path, class_names: list[str]) -> dict[int, float]:
    counts: list[int] = []
    for class_name in class_names:
        class_dir = train_dir / class_name
        image_count = sum(
            1
            for p in class_dir.rglob("*")
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS
        )
        if image_count <= 0:
            raise RuntimeError(f"Class '{class_name}' has 0 training images in {class_dir}")
        counts.append(image_count)

    total = sum(counts)
    num_classes = len(counts)
    return {
        idx: float(total / (num_classes * count))
        for idx, count in enumerate(counts)
    }


def fine_tune(
    model: tf.keras.Model,
    base_model: tf.keras.Model,
    train_ds,
    val_ds,
    epochs_finetune: int,
    fine_tune_at: int,
    output_dir: Path,
    class_weight: dict[int, float] | None = None,
):
    if epochs_finetune <= 0:
        return None

    base_model.trainable = True
    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy", tf.keras.metrics.SparseTopKCategoricalAccuracy(k=3, name="top3_acc")],
    )

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(output_dir / "best_finetune.keras"),
            monitor="val_accuracy",
            save_best_only=True,
            mode="max",
        ),
        tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=4, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2),
    ]

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs_finetune,
        callbacks=callbacks,
        class_weight=class_weight,
    )
    return history


def save_labels(class_names: list[str], output_dir: Path) -> None:
    labels_path = output_dir / "labels.txt"
    labels_path.write_text("\n".join(class_names), encoding="utf-8")


def save_history(history, path: Path) -> None:
    if history is None:
        return
    serializable = {k: [float(v) for v in values] for k, values in history.history.items()}
    path.write_text(json.dumps(serializable, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train MobileNetV2 waste classifier with TensorFlow 2")
    parser.add_argument("--data-root", type=Path, required=True, help="Dataset root with train/val dirs")
    parser.add_argument("--output-dir", type=Path, default=Path("ml/artifacts"))
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--epochs-head", type=int, default=12)
    parser.add_argument("--epochs-finetune", type=int, default=8)
    parser.add_argument("--dropout", type=float, default=0.35)
    parser.add_argument("--fine-tune-at", type=int, default=120)
    parser.add_argument(
        "--disable-class-weight",
        action="store_true",
        help="Disable automatic class weighting for imbalanced datasets.",
    )
    args = parser.parse_args()

    train_dir = args.data_root / "train"
    val_dir = args.data_root / "val"
    if not train_dir.exists() or not val_dir.exists():
        raise FileNotFoundError(f"Expected train/val folders under {args.data_root}")

    args.output_dir.mkdir(parents=True, exist_ok=True)

    train_ds, val_ds, class_names = make_datasets(
        train_dir=train_dir,
        val_dir=val_dir,
        image_size=args.image_size,
        batch_size=args.batch_size,
    )

    class_weight = None
    if not args.disable_class_weight:
        class_weight = compute_class_weight_from_dir(train_dir, class_names)
        readable_class_weight = {class_names[idx]: weight for idx, weight in class_weight.items()}
        (args.output_dir / "class_weights.json").write_text(
            json.dumps(readable_class_weight, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    model, base_model = build_model(
        num_classes=len(class_names),
        image_size=args.image_size,
        dropout=args.dropout,
    )

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy", tf.keras.metrics.SparseTopKCategoricalAccuracy(k=3, name="top3_acc")],
    )

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(args.output_dir / "best_head.keras"),
            monitor="val_accuracy",
            save_best_only=True,
            mode="max",
        ),
        tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=4, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2),
    ]

    history_head = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs_head,
        callbacks=callbacks,
        class_weight=class_weight,
    )

    history_finetune = fine_tune(
        model=model,
        base_model=base_model,
        train_ds=train_ds,
        val_ds=val_ds,
        epochs_finetune=args.epochs_finetune,
        fine_tune_at=args.fine_tune_at,
        output_dir=args.output_dir,
        class_weight=class_weight,
    )

    final_model_dir = args.output_dir / "saved_model"
    tf.saved_model.save(model, str(final_model_dir))
    model.save(args.output_dir / "model.keras")
    save_labels(class_names, args.output_dir)
    save_history(history_head, args.output_dir / "history_head.json")
    save_history(history_finetune, args.output_dir / "history_finetune.json")

    val_metrics = model.evaluate(val_ds, verbose=0)
    metric_names = model.metrics_names
    metrics_map = {name: float(value) for name, value in zip(metric_names, val_metrics)}
    (args.output_dir / "val_metrics.json").write_text(
        json.dumps(metrics_map, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("\nTraining done.")
    print(f"Classes: {len(class_names)}")
    print(f"SavedModel: {final_model_dir}")
    print(f"Labels: {args.output_dir / 'labels.txt'}")
    if class_weight is not None:
        print(f"Class weights: {args.output_dir / 'class_weights.json'}")
    print(f"Validation metrics: {metrics_map}")


if __name__ == "__main__":
    main()
