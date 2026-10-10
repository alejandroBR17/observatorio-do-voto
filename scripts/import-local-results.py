"""Build compact municipality/place/section indexes from the official TSE CSV.

Python standard library only. Run explicitly after each completed turn:
python scripts/import-local-results.py --zip path/to/votacao_secao_2026_BR.zip
The source CSV is never shipped to browsers or committed to Git.
"""

import argparse
import csv
import gzip
import io
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

SOURCE = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2026_BR.zip"
ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=Path, required=True)
    args = parser.parse_args()
    national = json.loads((ROOT / "public" / "data" / "2026-br.json").read_text(encoding="utf-8"))
    ballot = {str(c["n"]): c["nmu"] for a in national["carg"][0]["agr"] for p in a["par"] for c in p.get("cand", [])}
    regions, names, totals = {}, {}, {}
    generated = None
    with zipfile.ZipFile(args.zip) as archive:
        members = [n for n in archive.namelist() if n.endswith("_BR.csv")]
        if len(members) != 1:
            raise ValueError("Expected one national presidential CSV")
        with archive.open(members[0]) as binary:
            reader = csv.DictReader(io.TextIOWrapper(binary, encoding="latin-1"), delimiter=";")
            for row in reader:
                if row["ANO_ELEICAO"] != "2026" or row["NR_TURNO"] != "1" or row["CD_CARGO"] != "1":
                    continue
                uf, code = row["SG_UF"], row["CD_MUNICIPIO"].zfill(5)
                if uf == "ZZ":
                    continue
                vote, count = row["NR_VOTAVEL"], int(row["QT_VOTOS"])
                # The CSV retains votes for cancelled candidacies. EA20 assigns
                # these to total null votes (tvn), not to valid candidate votes.
                # Every state total is checked below before publishing.
                if vote not in ballot and vote not in ("95", "96"):
                    vote = "96"
                if count < 0:
                    raise ValueError("Negative vote count")
                generated = f'{row["DT_GERACAO"]} {row["HH_GERACAO"]} (Brasília)'
                municipality = regions.setdefault(uf, {}).setdefault(code, {
                    "code": code, "name": row["NM_MUNICIPIO"], "places": {}
                })
                zone, local = row["NR_ZONA"].zfill(4), row["NR_LOCAL_VOTACAO"]
                key = f"{zone}-{local}"
                place = municipality["places"].setdefault(key, {
                    "id": key, "number": local, "zone": zone,
                    "name": row["NM_LOCAL_VOTACAO"],
                    "address": row["DS_LOCAL_VOTACAO_ENDERECO"], "sections": {}
                })
                section = row["NR_SECAO"].zfill(4)
                votes = place["sections"].setdefault(section, {})
                votes[vote] = votes.get(vote, 0) + count
                names[vote] = ballot.get(vote, row["NM_VOTAVEL"])
                totals.setdefault(uf, {})[vote] = totals.setdefault(uf, {}).get(vote, 0) + count
    candidates = sorted(n for n in names if n not in ("95", "96"))
    if len(regions) != 27:
        raise ValueError("Expected all 27 Brazilian states; refusing partial import")
    # Stop rather than publish an incomplete or misclassified import.
    for uf, votes in totals.items():
        official = json.loads((ROOT / "public" / "data" / f"2026-{uf.lower()}.json").read_text(encoding="utf-8"))
        if sum(votes.get(n, 0) for n in candidates) != int(official["v"]["vv"]):
            raise ValueError(f"Candidate totals differ from official state result: {uf}")
        official_candidates = {str(c["n"]): int(c["vap"]) for a in official["carg"][0]["agr"] for p in a["par"] for c in p.get("cand", [])}
        if any(votes.get(n, 0) != v for n, v in official_candidates.items()):
            raise ValueError(f"Individual candidate totals differ: {uf}")
        if votes.get("95", 0) != int(official["v"]["vb"]) or votes.get("96", 0) != int(official["v"]["tvn"]):
            raise ValueError(f"Blank/null totals differ from official state result: {uf}")
    output = ROOT / "data" / "local-results"
    output.mkdir(parents=True, exist_ok=True)
    imported_at = datetime.now(timezone.utc).isoformat()
    summary = {"source": SOURCE, "year": 2026, "turn": 1, "generated": generated,
               "importedAt": imported_at, "states": [], "municipalities": 0, "places": 0, "sections": 0}
    for uf, municipalities in sorted(regions.items()):
        for municipality in municipalities.values():
            for place in municipality["places"].values():
                place["sections"] = [[s, [votes.get(n, 0) for n in candidates + ["95", "96"]]]
                                     for s, votes in sorted(place["sections"].items())]
                summary["sections"] += len(place["sections"])
            municipality["places"] = sorted(municipality["places"].values(), key=lambda p: (p["name"], p["zone"]))
            summary["places"] += len(municipality["places"])
        summary["municipalities"] += len(municipalities)
        summary["states"].append(uf)
        payload = {"source": SOURCE, "year": 2026, "turn": 1, "generated": generated,
                   "importedAt": imported_at,
                   "candidates": [{"number": n, "name": names[n]} for n in candidates],
                   "municipalities": sorted(municipalities.values(), key=lambda m: m["name"])}
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        (output / f"{uf.lower()}.json.gz").write_bytes(gzip.compress(encoded, mtime=0))
    (output / "manifest.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
