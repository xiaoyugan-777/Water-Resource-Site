#!/usr/bin/env python3
"""Apply the supplied 161-paper Oxford ecosystem mapping by paper ID.

Only ``ecosystem_types`` is changed; all other paper fields are preserved.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAPPING = ROOT / "data-import/ecosystem-161-excel-to-oxford26.json"
PAPERS = ROOT / "assets/data/nbs-papers.json"


def main():
    source = json.loads(MAPPING.read_text(encoding="utf-8"))
    papers = json.loads(PAPERS.read_text(encoding="utf-8"))
    records = source["records"]
    by_id = {str(row["paper_id"]): row for row in records}
    paper_ids = {str(paper["paper_id"]) for paper in papers}
    taxonomy = set(source["taxonomy"])
    if len(records) != len(by_id) or len(papers) != len(paper_ids):
        raise ValueError("Duplicate paper_id in source or website data")
    if len(records) != len(papers) or set(by_id) != paper_ids:
        raise ValueError("Source and website paper IDs do not match")
    for paper in papers:
        record = by_id[str(paper["paper_id"])]
        for source_key, paper_key in (
            ("doi_or_id", "Paper ID / DOI"),
            ("title", "Title"),
            ("original_ecosystem", "Ecosystem"),
        ):
            if record[source_key] != paper[paper_key]:
                raise ValueError(f"Paper {paper['paper_id']}: {paper_key} conflict")
        types = record["ecosystem_types"]
        if not isinstance(types, list) or not types or len(types) != len(set(types)) or not set(types) <= taxonomy:
            raise ValueError(f"Paper {paper['paper_id']}: invalid ecosystem_types")
    for paper in papers:
        paper["ecosystem_types"] = by_id[str(paper["paper_id"])]["ecosystem_types"]
    PAPERS.write_text(json.dumps(papers, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated ecosystem_types for {len(papers)} papers")


if __name__ == "__main__":
    main()
