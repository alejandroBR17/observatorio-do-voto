"""Repair 1998 presidential snapshots from the original TSE municipal archive.

This release has zeroes in QT_VOTOS_NOMINAIS. The explicit valid-vote column,
QT_VOTOS_NOMINAIS_VALIDOS, contains the counts. Never infer absent turnout data
or mix these totals with a different historical bulletin.

Source: https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_1998.zip
Usage: python scripts/repair-history-1998.py /path/to/the/original/archive.zip
"""

import argparse
import csv
import io
import json
import pathlib
import zipfile
from collections import defaultdict


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=pathlib.Path)
    parser.add_argument(
        "--output",
        type=pathlib.Path,
        default=pathlib.Path("public/data/history-1998.json"),
    )
    args = parser.parse_args()
    counts = defaultdict(lambda: defaultdict(int))
    people = {}
    generated = ""

    with zipfile.ZipFile(args.archive) as bundle:
        member = next(name for name in bundle.namelist() if name.endswith("_BRASIL.csv"))
        with bundle.open(member) as raw:
            rows = csv.DictReader(
                io.TextIOWrapper(raw, encoding="latin1", newline=""), delimiter=";"
            )
            if "QT_VOTOS_NOMINAIS_VALIDOS" not in rows.fieldnames:
                raise ValueError("Valid-vote column absent; refusing to guess counts")
            for row in rows:
                if row["CD_CARGO"] != "1" or row["NR_TURNO"] != "1":
                    continue
                if row["ANO_ELEICAO"] != "1998":
                    raise ValueError("Unexpected election year")
                votes = int(row["QT_VOTOS_NOMINAIS_VALIDOS"])
                if votes < 0:
                    raise ValueError("Negative vote count")
                number = row["NR_CANDIDATO"]
                uf = row["SG_UF"]
                if uf == "BR":
                    raise ValueError("Aggregated source row would double-count votes")
                people[number] = (
                    row["NM_URNA_CANDIDATO"],
                    row["SG_PARTIDO"],
                    row["DS_SIT_TOT_TURNO"],
                )
                counts[uf][number] += votes
                counts["BR"][number] += votes
                generated = row["DT_GERACAO"] + " " + row["HH_GERACAO"]

    previous = json.loads(args.output.read_text(encoding="utf-8"))
    rebuilt = []
    for result in previous:
        votes = counts[result["uf"]]
        total = sum(votes.values())
        if not total:
            raise ValueError("Missing votes for " + result["uf"])
        candidates = []
        for number, value in votes.items():
            name, party, status = people[number]
            candidates.append(
                dict(
                    number=number,
                    name=name,
                    party=party,
                    votes=value,
                    status=status,
                    elected=status == "ELEITO",
                    percent=100 * value / total,
                )
            )
        candidates.sort(key=lambda candidate: candidate["votes"], reverse=True)
        rebuilt.append(
            {
                **result,
                "valid": total,
                "candidates": candidates,
                "generated": "TSE · arquivo gerado em " + generated,
            }
        )
    national = next(result for result in rebuilt if result["uf"] == "BR")
    if national["valid"] != sum(
        result["valid"] for result in rebuilt if result["uf"] != "BR"
    ):
        raise ValueError("National and state totals differ")
    temporary = args.output.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(rebuilt, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    temporary.replace(args.output)
    print(json.dumps({"valid": national["valid"], "sourceGenerated": generated}))


if __name__ == "__main__":
    main()
