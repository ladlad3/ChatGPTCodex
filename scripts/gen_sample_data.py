#!/usr/bin/env python3
"""
簡易サンプルデータ生成スクリプト
使用: python gen_sample_data.py output_dir
"""
import json
from pathlib import Path

def create_geojson(path: Path):
    data = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [0, 0]}, "properties": {}}
        ]
    }
    path.write_text(json.dumps(data))

def main(out: Path):
    out.mkdir(parents=True, exist_ok=True)
    create_geojson(out / "sample.geojson")
    # TIFF作成にはGDALが必要。ここでは空ファイルのみ作成
    (out / "sample.tif").write_bytes(b"")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("usage: gen_sample_data.py output_dir")
    else:
        main(Path(sys.argv[1]))
