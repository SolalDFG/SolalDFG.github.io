#!/usr/bin/env python3
"""Caviardage réel du CV avant publication (PyMuPDF : add_redact_annot + apply_redactions).

Le texte est SUPPRIMÉ du flux PDF (pas un simple rectangle posé par-dessus) :
  - la ligne du numéro de téléphone (format français) est retirée ;
  - les lignes suivantes du bloc contact remontent d'un cran (pas de ligne vide) ;
  - la ligne « Ville (code postal) » devient « Île-de-France » ;
  tout est réécrit dans la même police, le même corps, la même couleur et le même interlettrage.
Le fond (aplat vectoriel) et la photo ne sont pas touchés.

Prérequis : pip install pymupdf fonttools
            police d'origine du CV (Lora Regular, Google Fonts, licence OFL) en .ttf
Usage :     python3 scripts/redact-cv.py <COPIE_du_CV.pdf> <Lora-Regular.ttf> public/cv.pdf
            (ne jamais passer l'original en sortie ; puis : npm run check:privacy)
"""
import re
import sys

import pymupdf

PHONE = re.compile(r"^(?:\+33\s?|0)[1-9](?:[ .-]?\d{2}){4}$")
CITY = re.compile(r"\(\d{5}\)\s*$")  # « Ville (12345) »
REPLACEMENT = "Île-de-France"
TRACKING_EM = 0.02  # interlettrage mesuré sur l'original (écart entre glyphes ≈ 0,02 em)


def left_lines(page, max_x=210):
    """Lignes de la colonne de gauche, de haut en bas : (rect, origine, corps, couleur, police, texte)."""
    out = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            spans = [s for s in line["spans"] if s["bbox"][0] < max_x]
            if not spans:
                continue
            rect = pymupdf.Rect(spans[0]["bbox"])
            for s in spans:
                rect |= s["bbox"]
            text = "".join(s["text"] for s in spans).strip()
            out.append((rect, spans[0]["origin"], spans[0]["size"], spans[0]["color"], spans[0]["font"], text))
    return sorted(out, key=lambda l: l[1][1])


def find_line(lines, pattern):
    for i, line in enumerate(lines):
        if pattern.search(line[5]):
            return i
    sys.exit(f"Ligne introuvable ({pattern.pattern}) : rien n'a été écrit.")


def main(src, fontfile, out):
    if out == src:
        sys.exit("La sortie doit être différente de l'entrée (ne jamais modifier l'original).")
    doc = pymupdf.open(src)
    page = doc[0]
    lines = left_lines(page)
    ip, ic = find_line(lines, PHONE), find_line(lines, CITY)
    phone, city = lines[ip], lines[ic]
    # Lignes du bloc contact sous le téléphone : même corps et interligne régulier, jusqu'au titre suivant
    # (les polices Type 3 changent de nom d'un fragment à l'autre : on ne compare pas les noms)
    block, prev_y = [], phone[1][1]
    leading = phone[2] * 1.8
    for line in lines[ip + 1:]:
        if abs(line[2] - phone[2]) > 0.1 or line[1][1] - prev_y > leading:
            break
        block.append(line)
        prev_y = line[1][1]
    if city not in block:
        sys.exit("La ville n'est pas dans le bloc contact sous le téléphone : mise en page inattendue.")

    for line in [phone, *block]:
        rect = line[0]
        # rectangle resserré verticalement : les lignes voisines ne sont pas touchées
        page.add_redact_annot(pymupdf.Rect(rect.x0 - 1, rect.y0 + 1, rect.x1 + 1, rect.y1 - 1), fill=None)
    page.apply_redactions(
        images=pymupdf.PDF_REDACT_IMAGE_NONE,
        graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
        text=pymupdf.PDF_REDACT_TEXT_REMOVE,
    )

    # Chaque ligne du bloc reprend l'origine de la ligne au-dessus d'elle : le trou du téléphone disparaît
    font = pymupdf.Font(fontfile=fontfile)
    origins = [phone[1]] + [l[1] for l in block[:-1]]
    for line, (x, y) in zip(block, origins):
        text = REPLACEMENT if line is city else line[5]
        size, c = line[2], line[3]
        rgb = ((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255
        writer = pymupdf.TextWriter(page.rect, color=rgb)
        for ch in text:
            writer.append((x, y), ch, font=font, fontsize=size)
            x += font.text_length(ch, size) + TRACKING_EM * size
        writer.write_text(page)

    doc.set_metadata({"title": "CV Solal Diedhiou", "author": "Solal Diedhiou", "creator": "", "producer": "", "subject": "", "keywords": ""})
    doc.subset_fonts()
    doc.save(out, garbage=4, deflate=True, clean=True)

    text = pymupdf.open(out)[0].get_text()
    leaks = [t for t in (phone[5], city[5]) if t in text or t.replace(" ", "") in text.replace(" ", "")]
    if leaks or REPLACEMENT not in text:
        sys.exit(f"Échec de vérification : {leaks or 'texte de remplacement absent'}")
    print(f"✓ {out} : téléphone et ville caviardés, {len(block)} ligne(s) remontée(s), « {REPLACEMENT} » réécrit")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
