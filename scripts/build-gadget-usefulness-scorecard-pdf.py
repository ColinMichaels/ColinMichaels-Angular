#!/usr/bin/env python3
"""Build the public Is It Actually Useful? Gadget Scorecard."""

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "downloads" / "captain-colin-gadget-usefulness-scorecard.pdf"

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN = 30
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2)

INK = HexColor("#111827")
NAVY = HexColor("#172033")
CYAN = HexColor("#12B8C4")
CYAN_DARK = HexColor("#087A83")
AMBER = HexColor("#F2A93B")
MUTED = HexColor("#5B6472")
LINE = HexColor("#C7CDD6")
PANEL = HexColor("#F5F7FA")
WHITE = HexColor("#FFFFFF")
ROSE = HexColor("#C84B4B")


def draw_text(c: canvas.Canvas, text: str, x: float, y: float, size: float = 8,
              color=INK, font: str = "Helvetica") -> None:
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, text)


def draw_right_text(c: canvas.Canvas, text: str, x: float, y: float, size: float = 8,
                    color=INK, font: str = "Helvetica") -> None:
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawRightString(x, y, text)


def wrap_lines(text: str, font: str, size: float, width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if not current or stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c: canvas.Canvas, text: str, x: float, y: float, width: float,
                 size: float = 7, color=INK, font: str = "Helvetica",
                 leading: float | None = None) -> float:
    actual_leading = leading or (size * 1.35)
    for line in wrap_lines(text, font, size, width):
        draw_text(c, line, x, y, size, color, font)
        y -= actual_leading
    return y


def draw_label_line(c: canvas.Canvas, label: str, x: float, y: float, width: float) -> None:
    upper = label.upper()
    draw_text(c, upper, x, y + 2, 6.1, MUTED, "Helvetica-Bold")
    label_width = stringWidth(upper, "Helvetica-Bold", 6.1) + 7
    c.setStrokeColor(LINE)
    c.setLineWidth(0.65)
    c.line(x + label_width, y, x + width, y)


def draw_checkbox(c: canvas.Canvas, label: str, x: float, y: float,
                  size: float = 6.6, color=INK) -> None:
    c.setStrokeColor(CYAN_DARK)
    c.setLineWidth(0.75)
    c.rect(x, y - 1, 7, 7, stroke=1, fill=0)
    draw_text(c, label, x + 11, y, size, color)


def draw_score_boxes(c: canvas.Canvas, x: float, y: float) -> None:
    draw_text(c, "SCORE", x, y + 3, 5.8, MUTED, "Helvetica-Bold")
    for score in range(5):
        box_x = x + 32 + (score * 19)
        c.setFillColor(WHITE)
        c.setStrokeColor(CYAN_DARK)
        c.setLineWidth(0.75)
        c.roundRect(box_x, y - 2, 14, 14, 2, stroke=1, fill=1)
        draw_text(c, str(score), box_x + 5.2, y + 2.1, 6.5, NAVY, "Helvetica-Bold")


def draw_section(c: canvas.Canvas, x: float, y: float, width: float, height: float,
                 title: str, step: str, prompt: str, details: str) -> None:
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y, width, height, 5, stroke=1, fill=1)
    c.setFillColor(PANEL)
    c.roundRect(x, y + height - 24, width, 24, 5, stroke=0, fill=1)
    c.rect(x, y + height - 24, width, 5, stroke=0, fill=1)
    c.setFillColor(CYAN)
    c.roundRect(x + 7, y + height - 18, 22, 13, 3, stroke=0, fill=1)
    draw_text(c, step, x + 12.2, y + height - 14.8, 6.4, NAVY, "Helvetica-Bold")
    draw_text(c, title.upper(), x + 36, y + height - 16, 7.8, NAVY, "Helvetica-Bold")
    draw_score_boxes(c, x + width - 131, y + height - 17)
    draw_wrapped(c, prompt, x + 10, y + height - 39, width - 20, 7.1, INK, "Helvetica-Bold", 9)
    draw_wrapped(c, details, x + 10, y + height - 62, width - 20, 6.25, MUTED, "Helvetica", 8)
    draw_label_line(c, "Evidence / note", x + 10, y + 12, width - 20)


def build_pdf() -> Path:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=letter, pageCompression=1)
    c.setTitle("Captain Colin - Is It Actually Useful? Gadget Scorecard")
    c.setAuthor("Colin Michaels")
    c.setSubject("Printable scorecard for evaluating gadget usefulness, evidence, cost, friction, and support")
    c.setCreator("ColinMichaels.com")

    c.setFillColor(NAVY)
    c.roundRect(MARGIN, 694, CONTENT_WIDTH, 68, 7, stroke=0, fill=1)
    c.setFillColor(CYAN)
    c.rect(MARGIN, 694, 7, 68, stroke=0, fill=1)
    draw_text(c, "CAPTAIN COLIN", MARGIN + 20, 742, 8, CYAN, "Helvetica-Bold")
    draw_text(c, "IS IT ACTUALLY USEFUL?", MARGIN + 20, 719, 18, WHITE, "Helvetica-Bold")
    draw_text(c, "Gadget scorecard: Problem  >  Proof  >  Cost  >  Friction  >  Support", MARGIN + 20, 704, 7.8, HexColor("#D7E3EA"))
    draw_right_text(c, "PRINTABLE FIELD SHEET", PAGE_WIDTH - MARGIN - 14, 742, 6.8, AMBER, "Helvetica-Bold")

    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 621, CONTENT_WIDTH, 63, 5, stroke=1, fill=1)
    draw_text(c, "ITEM AND EVIDENCE", MARGIN + 10, 670, 7.2, NAVY, "Helvetica-Bold")
    draw_label_line(c, "Item", MARGIN + 10, 653, 250)
    draw_label_line(c, "Price / date checked", MARGIN + 274, 653, 248)
    draw_label_line(c, "Source / listing", MARGIN + 10, 635, 250)
    draw_text(c, "RELATIONSHIP", MARGIN + 274, 638, 6.1, MUTED, "Helvetica-Bold")
    relationship_x = MARGIN + 348
    for index, label in enumerate(("Own", "Tried", "Borrowed", "Research only")):
        draw_checkbox(c, label, relationship_x + (index * 48), 635, 5.8)

    gap = 8
    column_width = (CONTENT_WIDTH - gap) / 2
    section_height = 114
    draw_section(
        c, MARGIN, 499, column_width, section_height,
        "Real problem fit", "01",
        "Does it solve a specific problem often enough to matter?",
        "Name the user, the problem, how often it happens, and the current workaround. A novelty can still be fun, but fun is a different promise from useful.",
    )
    draw_section(
        c, MARGIN + column_width + gap, 499, column_width, section_height,
        "Evidence quality", "02",
        "What proves the claim beyond the product page or one clip?",
        "Separate hands-on use, first-person footage, independent testing, manufacturer claims, and unanswered questions. Score the evidence you have, not the evidence you hope exists.",
    )
    draw_section(
        c, MARGIN, 377, column_width, section_height,
        "True cost", "03",
        "Is the complete cost proportionate to the problem it solves?",
        "Include shipping, tax, accessories, subscriptions, consumables, replacement parts, maintenance, and the cost of a failed experiment - not only the headline price.",
    )
    draw_section(
        c, MARGIN + column_width + gap, 377, column_width, section_height,
        "Everyday friction", "04",
        "Will setup and upkeep erase the promised convenience?",
        "Count charging, pairing, accounts, compatibility, space, cleanup, storage, learning, noise, and attention. Useful on day one is not the same as useful on day one hundred.",
    )
    draw_section(
        c, MARGIN, 255, column_width, section_height,
        "Support and exit", "05",
        "Can it be repaired, returned, resold, or abandoned safely?",
        "Check warranty, return terms, parts, app dependence, account or cloud dependence, privacy, support history, resale, and what stops working if the company disappears.",
    )

    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN + column_width + gap, 255, column_width, section_height, 5, stroke=1, fill=1)
    verdict_x = MARGIN + column_width + gap + 10
    verdict_width = column_width - 20
    draw_text(c, "VERDICT", verdict_x, 350, 8, NAVY, "Helvetica-Bold")
    draw_label_line(c, "Total / 20", verdict_x, 333, verdict_width)
    verdicts = (
        "16-20  Strong fit - still state the caveats",
        "11-15  Interesting - verify before buying",
        "06-10  Clever idea - weak everyday case",
        "00-05  Not useful yet",
    )
    for index, text in enumerate(verdicts):
        draw_checkbox(c, text, verdict_x, 315 - (index * 16), 6.3, NAVY)

    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 155, CONTENT_WIDTH, 92, 5, stroke=1, fill=1)
    draw_text(c, "THE USEFUL ANSWER", MARGIN + 10, 232, 7.2, NAVY, "Helvetica-Bold")
    draw_label_line(c, "One-sentence verdict", MARGIN + 10, 213, CONTENT_WIDTH - 20)
    draw_label_line(c, "Who it helps", MARGIN + 10, 193, 250)
    draw_label_line(c, "Who should skip it", MARGIN + 274, 193, 248)
    draw_text(c, "NEXT MOVE", MARGIN + 10, 172, 6.1, MUTED, "Helvetica-Bold")
    next_x = MARGIN + 72
    for index, label in enumerate(("Test", "Borrow", "Buy", "Wait", "Skip", "Watch list")):
        draw_checkbox(c, label, next_x + (index * 70), 169, 6.3)

    c.setFillColor(NAVY)
    c.roundRect(MARGIN, 30, CONTENT_WIDTH, 115, 6, stroke=0, fill=1)
    draw_text(c, "SCORE THE EVIDENCE, THEN EXPLAIN THE VERDICT", MARGIN + 12, 129, 7.2, AMBER, "Helvetica-Bold")
    draw_wrapped(
        c,
        "Scoring guide: 0 = no useful evidence, 1 = mostly promise, 2 = conditional or incomplete, 3 = solid with tradeoffs, 4 = unusually strong. The total is a conversation tool, not a scientific rating.",
        MARGIN + 12, 110, CONTENT_WIDTH - 24, 6.4, WHITE, "Helvetica", 8.6,
    )
    draw_wrapped(
        c,
        "Label the relationship to the item and disclose gifts, review units, sponsorships, affiliate links, and synthetic media. This worksheet organizes research and personal judgment; it is not product testing, safety, financial, or buying advice.",
        MARGIN + 12, 82, CONTENT_WIDTH - 24, 6.35, HexColor("#D7E3EA"), "Helvetica", 8.4,
    )
    draw_text(c, "Guide and printable: colinmichaels.com/resources/gadget-usefulness-scorecard",
              MARGIN + 12, 45, 6.5, CYAN, "Helvetica-Bold")
    draw_right_text(c, "COLINMICHAELS.COM", PAGE_WIDTH - MARGIN - 12, 129, 7, CYAN, "Helvetica-Bold")

    c.showPage()
    c.save()
    return OUTPUT


if __name__ == "__main__":
    print(build_pdf())
