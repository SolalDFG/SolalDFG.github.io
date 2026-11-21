#!/usr/bin/env python3
"""Caviardage réel du CV avant publication (PyMuPDF : add_redact_annot + apply_redactions).

Le texte est SUPPRIMÉ du flux PDF (pas un simple rectangle posé par-dessus) :
  - la ligne du numéro de téléphone (format français) est retirée ;
  - la ligne « Ville (code postal) » est remplacée par « Île-de-France », à la même place,
    dans la même police, le même corps, la même couleur et le même interlettrage.
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


def find_line(page, pattern, max_x=210):
    """Ligne de la colonne de gauche dont le texte matche : (rect, origine, corps, couleur, texte)."""
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            spans = [s for s in line["spans"] if s["bbox"][0] < max_x]
            text = "".join(s["text"] for s in spans).strip()
            if spans and pattern.search(text):
                rect = pymupdf.Rect(spans[0]["bbox"])
                for s in spans:
                    rect |= s["bbox"]
                return rect, spans[0]["origin"], spans[0]["size"], spans[0]["color"], text
    sys.exit(f"Ligne introuvable ({pattern.pattern}) : rien n'a été écrit.")


def main(src, fontfile, out):
    if out == src:
        sys.exit("La sortie doit être différente de l'entrée (ne jamais modifier l'original).")
    doc = pymupdf.open(src)
    page = doc[0]
    phone = find_line(page, PHONE)
    city = find_line(page, CITY)

    for rect in (phone[0], city[0]):
        # rectangle resserré verticalement : les lignes voisines ne sont pas touchées
        page.add_redact_annot(pymupdf.Rect(rect.x0 - 1, rect.y0 + 1, rect.x1 + 1, rect.y1 - 1), fill=None)
    page.apply_redactions(
        images=pymupdf.PDF_REDACT_IMAGE_NONE,
        graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
        text=pymupdf.PDF_REDACT_TEXT_REMOVE,
    )

    font = pymupdf.Font(fontfile=fontfile)
    (x, y), size, c = city[1], city[2], city[3]
    rgb = ((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255
    writer = pymupdf.TextWriter(page.rect, color=rgb)
    for ch in REPLACEMENT:
        writer.append((x, y), ch, font=font, fontsize=size)
        x += font.text_length(ch, size) + TRACKING_EM * size
    writer.write_text(page)

    doc.set_metadata({"title": "CV Solal Diedhiou", "author": "Solal Diedhiou", "creator": "", "producer": "", "subject": "", "keywords": ""})
    doc.subset_fonts()
    doc.save(out, garbage=4, deflate=True, clean=True)

    text = pymupdf.open(out)[0].get_text()
    leaks = [t for t in (phone[4], city[4]) if t in text or t.replace(" ", "") in text.replace(" ", "")]
    if leaks or REPLACEMENT not in text:
        sys.exit(f"Échec de vérification : {leaks or 'texte de remplacement absent'}")
    print(f"✓ {out} : 2 lignes caviardées, « {REPLACEMENT} » réécrit")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
