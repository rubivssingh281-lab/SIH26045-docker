"""PDF generation for case reports and archive exports (reportlab)."""
from __future__ import annotations

import datetime
from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, HRFlowable)

FOREST = colors.HexColor("#2D4A32")
EMERALD = colors.HexColor("#3E6045")
GOLD = colors.HexColor("#9C7A18")
NAVY = colors.HexColor("#1F3A5F")
IVORY = colors.HexColor("#F5F2EB")
SAND = colors.HexColor("#E8E0D5")
INK = colors.HexColor("#33352F")
GREY = colors.HexColor("#6B6F68")
DANGER = colors.HexColor("#8B2C25")
WHITE = colors.white

_ss = getSampleStyleSheet()


def _st(name, **kw):
    kw.setdefault("parent", _ss["Normal"])
    return ParagraphStyle(name, **kw)


H_TITLE = _st("t", fontName="Helvetica-Bold", fontSize=20, textColor=FOREST, leading=23)
H_SUB = _st("s", fontName="Helvetica", fontSize=9.5, textColor=GREY, leading=13)
H_SEC = _st("sec", fontName="Helvetica-Bold", fontSize=12, textColor=FOREST, leading=15,
            spaceBefore=10, spaceAfter=4)
BODY = _st("b", fontName="Helvetica", fontSize=9.5, textColor=INK, leading=14)
LABEL = _st("l", fontName="Helvetica-Bold", fontSize=7.5, textColor=GREY, leading=10)
VAL = _st("v", fontName="Helvetica-Bold", fontSize=9.5, textColor=INK, leading=12)
TH = _st("th", fontName="Helvetica-Bold", fontSize=8.2, textColor=WHITE, leading=10)
TD = _st("td", fontName="Helvetica", fontSize=8.2, textColor=INK, leading=11)
TDB = _st("tdb", fontName="Helvetica-Bold", fontSize=8.2, textColor=NAVY, leading=11)
SMALL = _st("sm", fontName="Helvetica-Oblique", fontSize=8, textColor=GREY, leading=11)


def _now():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M")


def _meta_row(pairs):
    cells = []
    for label, value in pairs:
        cells.append(Table([[Paragraph(label, LABEL)], [Paragraph(str(value or "—"), VAL)]]))
    t = Table([cells], colWidths=[None] * len(cells))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), IVORY),
        ("BOX", (0, 0), (-1, -1), 0.5, SAND),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, SAND),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def _md_line(text: str) -> str:
    """Escape a line for reportlab and convert **bold** markdown to <b> tags."""
    import re
    safe = (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", safe)


def _render_grounded_answer(story, grounded: Dict[str, Any]):
    """Render an Ask-Sahayak grounded answer (prose + cited sources) into the report."""
    story.append(HRFlowable(width="100%", thickness=0.6, color=SAND))
    story.append(Paragraph("Sahayak answer", H_SEC))
    answer = grounded.get("answer") or ""
    for raw in answer.replace("\r", "").split("\n"):
        line = raw.strip()
        if not line:
            story.append(Spacer(1, 4))
            continue
        bullet = None
        for mark in ("- ", "* ", "• "):
            if line.startswith(mark):
                bullet = line[len(mark):]
                break
        if bullet is not None:
            story.append(Paragraph("• " + _md_line(bullet), _st("gb", fontName="Helvetica", fontSize=9.5,
                                    textColor=INK, leading=14, leftIndent=10)))
        else:
            story.append(Paragraph(_md_line(line), BODY))
    citations = grounded.get("citations") or []
    if citations:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Sources", H_SEC))
        for i, c in enumerate(citations, 1):
            title = c.get("title") or c.get("reference") or f"Source {i}"
            ref = c.get("citation") or c.get("reference") or ""
            excerpt = (c.get("excerpt") or c.get("text") or "")[:300]
            story.append(Paragraph(f"<b>[{i}] {_md_line(title)}</b> &nbsp;<font size=7 color='#6B6F68'>{_md_line(ref)}</font>", TD))
            if excerpt:
                story.append(Paragraph(_md_line(excerpt), _st("ge", fontName="Helvetica", fontSize=8.5,
                                        textColor=GREY, leading=12, spaceAfter=4)))


def build_case_report_pdf(case: Dict[str, Any], analysis: Dict[str, Any]) -> bytes:
    analysis = analysis or {}
    conf = analysis.get("confidence") or {}
    rule = analysis.get("applicable_rule") or {}
    story = []

    story.append(Paragraph("IP-SAKTI Sahayak — Case Report", H_TITLE))
    story.append(Paragraph(f"Evidence-grounded research assessment &nbsp;|&nbsp; generated {_now()}", H_SUB))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.2, color=SAND))
    story.append(Spacer(1, 8))

    story.append(_meta_row([
        ("CASE ID", case.get("id")),
        ("JURISDICTION", case.get("jurisdiction")),
        ("AS-OF DATE", case.get("as_of_date")),
        ("VERSION", case.get("version")),
        ("STATUS", case.get("status")),
    ]))
    story.append(Spacer(1, 10))

    story.append(Paragraph(case.get("title") or "Untitled case", H_SEC))
    if case.get("description"):
        story.append(Paragraph(case["description"], BODY))
    story.append(Spacer(1, 6))

    # Classification + confidence
    classification = analysis.get("classification")
    if classification:
        band = conf.get("band", "—")
        story.append(HRFlowable(width="100%", thickness=0.6, color=SAND))
        story.append(Paragraph("Classification", H_SEC))
        story.append(Paragraph(f"<b>{classification}</b> &nbsp; (confidence band: <b>{band}</b>)", BODY))
        dims = [("Fact", conf.get("fact_conf")), ("Rule-fit", conf.get("rule_fit_conf")),
                ("Evidence", conf.get("evidence_conf")), ("Citation", conf.get("citation_conf")),
                ("Overall", conf.get("overall_conf"))]
        drow = [[Paragraph(f"<b>{n}</b>", TD) for n, _ in dims],
                [Paragraph(f"{round(float(v)*100)}%" if isinstance(v, (int, float)) else "—", TD) for _, v in dims]]
        dt = Table(drow, colWidths=[None] * 5)
        dt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), IVORY),
                                ("BOX", (0, 0), (-1, -1), 0.5, SAND),
                                ("INNERGRID", (0, 0), (-1, -1), 0.5, SAND),
                                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                                ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.append(Spacer(1, 4))
        story.append(dt)
        if rule.get("title") or rule.get("citation"):
            story.append(Spacer(1, 6))
            story.append(Paragraph(f"<b>Triggered rule:</b> {rule.get('title','—')} &nbsp;|&nbsp; "
                                   f"<b>Citation:</b> {rule.get('citation','—')}", BODY))

        # Evidence
        evidence = analysis.get("evidence") or []
        if evidence:
            story.append(Paragraph("Supporting evidence", H_SEC))
            data = [[Paragraph("SOURCE", TH), Paragraph("EXCERPT", TH), Paragraph("STATUS", TH)]]
            for e in evidence[:8]:
                excerpt = (e.get("excerpt") or "")[:300]
                data.append([
                    Paragraph(f"<b>{e.get('title','—')}</b><br/><font size=7 color='#6B6F68'>{e.get('citation','')}</font>", TD),
                    Paragraph(excerpt, TD),
                    Paragraph("Validated" if e.get("validated") else "Review", TD),
                ])
            et = Table(data, colWidths=[45 * mm, 105 * mm, 20 * mm])
            st = [("BACKGROUND", (0, 0), (-1, 0), FOREST),
                  ("BOX", (0, 0), (-1, -1), 0.5, SAND), ("LINEBELOW", (0, 0), (-1, -1), 0.4, SAND),
                  ("VALIGN", (0, 0), (-1, -1), "TOP"),
                  ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                  ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
            for i in range(1, len(data)):
                if i % 2 == 0:
                    st.append(("BACKGROUND", (0, i), (-1, i), IVORY))
            et.setStyle(TableStyle(st))
            story.append(et)

        # Posture / next action
        story.append(Spacer(1, 6))
        bits = []
        if analysis.get("abs_indication"):
            bits.append(f"<b>ABS indication:</b> {analysis['abs_indication']}")
        if analysis.get("tkdl_indication"):
            bits.append(f"<b>TKDL indication:</b> {analysis['tkdl_indication']}")
        if analysis.get("next_action"):
            bits.append(f"<b>Next action:</b> {analysis['next_action']}")
        for b in bits:
            story.append(Paragraph(b, BODY))
        limitations = analysis.get("limitations") or []
        if limitations:
            story.append(Paragraph("<b>Limitations:</b> " + "; ".join(limitations), BODY))
    elif analysis.get("grounded_answer"):
        _render_grounded_answer(story, analysis["grounded_answer"])
    else:
        story.append(HRFlowable(width="100%", thickness=0.6, color=SAND))
        story.append(Paragraph("This case has not been analyzed yet — run the analysis (or, for Ask Sahayak, "
                               "get a grounded answer) to populate this report.", SMALL))

    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.6, color=SAND))
    story.append(Spacer(1, 3))
    story.append(Paragraph("Informational research support only; not legal advice. "
                           "Generated by IP-SAKTI Sahayak.", SMALL))

    return _render(story, title=f"Case Report {case.get('id','')}")


def build_archive_pdf(rows: List[Dict[str, Any]]) -> bytes:
    story = []
    story.append(Paragraph("IP-SAKTI Sahayak — Case Archive", H_TITLE))
    story.append(Paragraph(f"Filtered export of {len(rows)} case(s) &nbsp;|&nbsp; generated {_now()}", H_SUB))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.2, color=SAND))
    story.append(Spacer(1, 8))

    data = [[Paragraph(h, TH) for h in ["TITLE", "TOOL", "JURISDICTION", "RESULT", "STATUS", "UPDATED"]]]
    for r in rows:
        data.append([
            Paragraph(str(r.get("title") or "—"), TD),
            Paragraph(str(r.get("tool") or "—"), TD),
            Paragraph(str(r.get("jurisdiction") or "—"), TD),
            Paragraph(str(r.get("classification") or "—"), TD),
            Paragraph(str(r.get("status") or "—"), TD),
            Paragraph(str((r.get("updated_at") or "")[:10] or "—"), TD),
        ])
    t = Table(data, colWidths=[52 * mm, 28 * mm, 26 * mm, 30 * mm, 22 * mm, 22 * mm])
    st = [("BACKGROUND", (0, 0), (-1, 0), FOREST),
          ("BOX", (0, 0), (-1, -1), 0.5, SAND), ("LINEBELOW", (0, 0), (-1, -1), 0.4, SAND),
          ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
          ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    for i in range(1, len(data)):
        if i % 2 == 0:
            st.append(("BACKGROUND", (0, i), (-1, i), IVORY))
    t.setStyle(TableStyle(st))
    story.append(t)
    story.append(Spacer(1, 10))
    story.append(Paragraph("Informational research support only; not legal advice. "
                           "Generated by IP-SAKTI Sahayak.", SMALL))
    return _render(story, title="Case Archive")


def _render(story, title: str) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
                            topMargin=15 * mm, bottomMargin=14 * mm, title=title,
                            author="IP-SAKTI Sahayak")
    doc.build(story)
    buf.seek(0)
    return buf.getvalue()
