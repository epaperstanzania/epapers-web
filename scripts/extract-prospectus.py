"""Extract DIT module tables from the checked 2026/27 prospectus.

The paragraph anchors are tied to this exact source revision. A changed document
must be reviewed and the anchors updated before regenerating the seed.
"""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/source/dit_prospectus_2026_2027.docx'
TARGET = ROOT / 'packages/database/prisma/seed/prospectus-2026-2027.json'
EXPECTED_SHA256 = '72251df50fc4794af773c699064aced6baef7a528adc11f7f93eef0f2541535b'

# program code, first paragraph, first paragraph after table, program year at first semester
SECTIONS = [
    ('ODCE', 2676, 2750, 1), ('ODCE', 2750, 2833, 2), ('ODCE', 2833, 2940, 3),
    ('ODMINE', 2940, 3016, 1), ('ODMINE', 3016, 3127, 2), ('ODMINE', 3127, 3243, 3),
    ('BENGCE', 3243, 3479, 1), ('BENGCE', 3479, 3542, 4),
    ('BENGOGE', 3542, 3692, 1), ('BENGOGE', 3692, 3765, 3),
    ('ODCOE', 3919, 3989, 1), ('ODCOE', 3989, 4061, 2), ('ODCOE', 4061, 4134, 3),
    ('ODIT', 4134, 4209, 1), ('ODIT', 4209, 4288, 2), ('ODIT', 4288, 4360, 3),
    ('ODMFT', 4360, 4430, 1), ('ODMFT', 4430, 4494, 2), ('ODMFT', 4494, 4558, 3),
    ('ODIAE', 4558, 4636, 1), ('ODIAE', 4636, 4697, 2), ('ODIAE', 4697, 4747, 3),
    ('BENGCOE', 4747, 4998, 1), ('BENGCOE', 4998, 5074, 4),
    ('ODEE', 5508, 5585, 1), ('ODEE', 5585, 5676, 2), ('ODEE', 5676, 5753, 3),
    ('ODBME', 5753, 5839, 1), ('ODBME', 5839, 5926, 2), ('ODBME', 5926, 6009, 3),
    ('ODERE', 6009, 6116, 1), ('ODERE', 6116, 6227, 2), ('ODERE', 6227, 6327, 3),
    ('BENGEE', 6367, 6533, 1), ('BENGEE', 6533, 6617, 3),
    ('BENGBME', 6617, 6921, 1), ('BENGBME', 6921, 7028, 4),
    ('ODETE', 7208, 7281, 1), ('ODETE', 7281, 7341, 2), ('ODETE', 7341, 7407, 3),
    ('ODCST', 7407, 7482, 1), ('ODCST', 7482, 7547, 2), ('ODCST', 7547, 7612, 3),
    ('BENGETE', 7612, 7838, 1), ('BENGETE', 7838, 7916, 4),
    ('ODME', 8089, 8165, 1), ('ODME', 8165, 8251, 2), ('ODME', 8251, 8326, 3),
    ('BENGME', 8400, 8576, 1), ('BENGME', 8576, 8742, 3),
    ('ODSLT', 8749, 8830, 1), ('ODSLT', 8830, 8909, 2), ('ODSLT', 8909, 8984, 3),
    ('ODFST', 8984, 9056, 1), ('ODFST', 9056, 9129, 2), ('ODFST', 9129, 9194, 3),
    ('ODBT', 9194, 9269, 1), ('ODBT', 9269, 9357, 2), ('ODBT', 9357, 9437, 3),
    ('BTECHLS', 9437, 9655, 1), ('BTECHLS', 9655, 9802, 4),
    ('ODLPT', 10994, 11074, 1), ('ODLPT', 11074, 11153, 2), ('ODLPT', 11153, 11228, 3),
    ('ODLPCT', 11228, 11317, 1), ('ODLPCT', 11317, 11401, 2), ('ODLPCT', 11401, 11479, 3),
    ('ODFPT', 11479, 11560, 1), ('ODFPT', 11560, 11628, 2), ('ODFPT', 11628, 11700, 3),
    ('ODCE-SONGWE', 11983, 12069, 1), ('ODCE-SONGWE', 12069, 12173, 2), ('ODCE-SONGWE', 12173, 12279, 3),
]

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
CODE = re.compile(r'^[A-Z]{2,6}\s*[A-Z]?\s*\d{2,6}(?:-\d{1,3})?$', re.I)
# One programme's tables spell this "SEMISTER" in the source.
SEMESTER = re.compile(r'\bSEM[EI]STER\s*([IVX]+|[1-8])\b', re.I)
ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6}


def paragraphs():
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != EXPECTED_SHA256:
        raise SystemExit('Prospectus changed; review anchors before regeneration.')
    with zipfile.ZipFile(SOURCE) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    return [''.join(t.text or '' for t in p.findall('.//w:t', NS)).strip()
            for p in root.findall('.//w:p', NS)]


def extract():
    lines = paragraphs()
    result = {}
    rejected = []
    ambiguous = set()
    positions = {}
    for program, start, end, first_year in SECTIONS:
        if end > len(lines):
            raise SystemExit(f'Invalid paragraph range for {program}: {start}-{end}')
        term = 0
        for i in range(start, end):
            value = lines[i].strip()
            match = SEMESTER.search(value)
            if match and len(value) < 95:
                term = ROMAN.get(match.group(1).upper(), int(match.group(1)) if match.group(1).isdigit() else 0)
            if not CODE.fullmatch(value) or not term:
                continue
            code = re.sub(r'[^A-Z0-9]', '', value.upper())
            # Table cells are consecutive paragraphs: code, title, optional wrapped title,
            # optional class, then credits. Stop at the next code or table heading.
            parts = []
            credits = None
            for j in range(i + 1, min(i + 8, end)):
                cell = lines[j].strip()
                if not cell:
                    continue
                if CODE.fullmatch(cell) or SEMESTER.search(cell) or cell.upper().startswith('TOTAL'):
                    break
                if re.fullmatch(r'\d{1,3}(?:\.\d+)?', cell):
                    credits = float(cell)
                    break
                if cell.lower() not in {'core', 'elective', 'fundamental', 'optional', 'compulsory'}:
                    parts.append(cell)
            name = ' '.join(parts).strip()
            if not name or credits is None or credits > 60 or len(name) > 240:
                rejected.append((program, i, code, name[:50]))
                continue
            local_semester = (term - 1) % 2 + 1
            year = first_year + (term - 1) // 2
            if year > 8:
                rejected.append((program, i, code, 'year exceeds 8'))
                continue
            key = (program, code)
            record = {'programCode': program, 'code': code, 'name': name,
                      'levelYear': year, 'semester': local_semester, 'credits': credits}
            if key in result and result[key] != record:
                if key not in ambiguous:
                    rejected.append((program, positions[key], code, 'first conflicting source row'))
                ambiguous.add(key)
                rejected.append((program, i, code, 'duplicate with differing placement/name'))
                continue
            result[key] = record
            positions[key] = i
    for key in ambiguous:
        result.pop(key, None)
    return sorted(result.values(), key=lambda x: (x['programCode'], x['levelYear'], x['semester'], x['code'])), rejected


def main():
    rows, rejected = extract()
    review_path = ROOT / 'docs/source/prospectus-module-review.json'
    review_path.write_text(json.dumps({'sourceSha256': EXPECTED_SHA256, 'omittedRows': rejected}, indent=2) + '\n', encoding='utf-8')
    TARGET.write_text(json.dumps({'sourceSha256': EXPECTED_SHA256, 'modules': rows}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(rows)} modules for {len({row["programCode"] for row in rows})} programs; {len(rejected)} rows require review')


if __name__ == '__main__':
    main()
