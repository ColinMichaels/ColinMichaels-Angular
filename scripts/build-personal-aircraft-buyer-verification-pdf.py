#!/usr/bin/env python3
"""Build the public Personal Aircraft Buyer Verification worksheet."""

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "downloads" / "captain-colin-personal-aircraft-buyer-verification.pdf"

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN = 30
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2)

INK = HexColor("#111827")
NAVY = HexColor("#172033")
CYAN = HexColor("#12B8C4")
CYAN_DARK = HexColor("#087A83")
AMBER = HexColor("#F2A93B")
RED = HexColor("#C84B4B")
MUTED = HexColor("#5B6472")
LINE = HexColor("#C7CDD6")
PANEL = HexColor("#F5F7FA")
WHITE = HexColor("#FFFFFF")


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
    draw_text(c, upper, x, y + 2, 6, MUTED, "Helvetica-Bold")
    label_width = stringWidth(upper, "Helvetica-Bold", 6) + 7
    c.setStrokeColor(LINE)
    c.setLineWidth(0.65)
    c.line(x + label_width, y, x + width, y)


def draw_checkbox(c: canvas.Canvas, label: str, x: float, y: float, width: float,
                  size: float = 6.8, color=INK) -> float:
    c.setStrokeColor(CYAN_DARK)
    c.setLineWidth(0.75)
    c.rect(x, y - 1, 7, 7, stroke=1, fill=0)
    lines = wrap_lines(label, "Helvetica", size, width - 12)
    line_y = y
    for line in lines:
        draw_text(c, line, x + 12, line_y, size, color)
        line_y -= size * 1.3
    return line_y - 4


def draw_section(c: canvas.Canvas, x: float, y: float, width: float, height: float,
                 title: str, step: str, accent=CYAN) -> tuple[float, float, float, float]:
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y, width, height, 5, stroke=1, fill=1)
    c.setFillColor(PANEL)
    c.roundRect(x, y + height - 24, width, 24, 5, stroke=0, fill=1)
    c.rect(x, y + height - 24, width, 5, stroke=0, fill=1)
    c.setFillColor(accent)
    c.roundRect(x + 7, y + height - 18, 22, 13, 3, stroke=0, fill=1)
    draw_text(c, step, x + 12.2, y + height - 14.8, 6.4, NAVY, "Helvetica-Bold")
    draw_text(c, title.upper(), x + 36, y + height - 16, 8.1, NAVY, "Helvetica-Bold")
    return x + 10, y + 10, width - 20, height - 43


def draw_header(c: canvas.Canvas, page_label: str, subtitle: str) -> None:
    c.setFillColor(NAVY)
    c.roundRect(MARGIN, 692, CONTENT_WIDTH, 70, 7, stroke=0, fill=1)
    c.setFillColor(CYAN)
    c.rect(MARGIN, 692, 7, 70, stroke=0, fill=1)
    draw_text(c, "CAPTAIN COLIN", MARGIN + 20, 744, 8, CYAN, "Helvetica-Bold")
    draw_text(c, "PERSONAL AIRCRAFT BUYER VERIFICATION", MARGIN + 20, 720, 16.7, WHITE, "Helvetica-Bold")
    draw_text(c, subtitle, MARGIN + 20, 704, 7.4, HexColor("#D7E3EA"))
    draw_right_text(c, page_label, PAGE_WIDTH - MARGIN - 14, 744, 6.8, AMBER, "Helvetica-Bold")


def draw_page_one(c: canvas.Canvas) -> None:
    draw_header(c, "PAGE 1 OF 2", "Before you send the deposit: verify the offer, the seller, and the written terms")

    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 626, CONTENT_WIDTH, 56, 5, stroke=1, fill=1)
    draw_text(c, "OFFER FILE", MARGIN + 10, 668, 7.2, NAVY, "Helvetica-Bold")
    draw_label_line(c, "Date reviewed", MARGIN + 10, 651, 126)
    draw_label_line(c, "Reviewer", MARGIN + 150, 651, 134)
    draw_label_line(c, "Seller", MARGIN + 298, 651, 224)
    draw_label_line(c, "Model / configuration", MARGIN + 10, 634, 274)
    draw_label_line(c, "Offer URL / quote ID", MARGIN + 298, 634, 224)

    gap = 8
    column_width = (CONTENT_WIDTH - gap) / 2

    x1, y1, w1, h1 = draw_section(c, MARGIN, 402, column_width, 214, "Seller identity", "01")
    current_y = y1 + h1
    for label in (
        "Legal business name",
        "Physical address",
        "Named sales contact",
        "Phone / email",
        "Company registration checked",
        "Payment recipient matches seller",
    ):
        draw_label_line(c, label, x1, current_y, w1)
        current_y -= 21
    current_y -= 1
    current_y = draw_checkbox(c, "Seller identifies the contracting entity in writing", x1, current_y, w1)
    draw_checkbox(c, "Independent contact details match the offer", x1, current_y, w1)

    x2, y2, w2, h2 = draw_section(c, MARGIN + column_width + gap, 402, column_width, 214,
                                  "Offer and delivery", "02")
    current_y = y2 + h2
    for label in (
        "Exact model / version / options",
        "Written quote date / expiry",
        "Amount due now",
        "Expected total cost",
        "Build slot / order position",
        "Promised delivery window",
    ):
        draw_label_line(c, label, x2, current_y, w2)
        current_y -= 21
    current_y -= 1
    current_y = draw_checkbox(c, "Current delivered-customer evidence reviewed", x2, current_y, w2)
    draw_checkbox(c, "Exact configuration is named in every key promise", x2, current_y, w2)

    x3, y3, w3, h3 = draw_section(c, MARGIN, 158, CONTENT_WIDTH, 234, "Money and written terms", "03")
    inner_gap = 18
    third = (w3 - (inner_gap * 2)) / 3
    columns = [
        (
            x3,
            "DEPOSIT",
            [
                "Refundable amount and deadline",
                "Non-refundable amount",
                "Cancellation process",
                "Delay / failure-to-deliver remedy",
                "Transfer / resale restrictions",
            ],
        ),
        (
            x3 + third + inner_gap,
            "TOTAL COST",
            [
                "Payment milestones",
                "Taxes and transaction fees",
                "Freight / import / customs",
                "Assembly and inspection",
                "Training, storage, transport",
                "Insurance and recurring support",
            ],
        ),
        (
            x3 + ((third + inner_gap) * 2),
            "PAYMENT RECORD",
            [
                "Payment method and protections",
                "Invoice / order agreement saved",
                "Refund promises saved",
                "Delivery promises saved",
                "Emails and messages exported",
                "Credit / debit dispute timing checked",
            ],
        ),
    ]
    for column_x, heading, items in columns:
        draw_text(c, heading, column_x, y3 + h3, 6.6, CYAN_DARK, "Helvetica-Bold")
        current_y = y3 + h3 - 18
        for item in items:
            current_y = draw_checkbox(c, item, column_x, current_y, third, 6.45)
    draw_wrapped(
        c,
        "Review current consumer guidance and get qualified advice for the actual transaction. Do not assume a general online-shopping rule resolves an aircraft preorder or cross-border deposit.",
        x3,
        y3 + 22,
        w3,
        6.35,
        MUTED,
        "Helvetica-Oblique",
        8.2,
    )

    c.setFillColor(NAVY)
    c.roundRect(MARGIN, 30, CONTENT_WIDTH, 116, 6, stroke=0, fill=1)
    draw_text(c, "STOP BEFORE PAYMENT IF THE WRITING DOES NOT MATCH THE PITCH", MARGIN + 12, 130, 7.3, AMBER, "Helvetica-Bold")
    warnings = [
        "Refund status is unclear or only explained verbally.",
        "Urgency replaces an itemized quote and written cancellation terms.",
        "The seller will not identify its legal entity, address, or payment recipient.",
        "The exact configuration differs between marketing, quote, invoice, and legal claim.",
    ]
    left_x = MARGIN + 12
    right_x = MARGIN + 278
    current_left = 111
    current_right = 111
    for index, warning in enumerate(warnings):
        if index < 2:
            current_left = draw_checkbox(c, warning, left_x, current_left, 250, 6.25, WHITE)
        else:
            current_right = draw_checkbox(c, warning, right_x, current_right, 260, 6.25, WHITE)
    draw_text(c, "Worksheet continues: legal category, operating reality, support, evidence, and decision.",
              MARGIN + 12, 45, 6.3, HexColor("#D7E3EA"))
    draw_right_text(c, "COLINMICHAELS.COM", PAGE_WIDTH - MARGIN - 12, 130, 7, CYAN, "Helvetica-Bold")


def draw_page_two(c: canvas.Canvas) -> None:
    draw_header(c, "PAGE 2 OF 2", "Verify what the exact aircraft is, how it may be operated, and who supports it")

    gap = 8
    column_width = (CONTENT_WIDTH - gap) / 2

    x1, y1, w1, h1 = draw_section(c, MARGIN, 465, column_width, 217, "Legal category claim", "04")
    current_y = y1 + h1
    draw_label_line(c, "Seller's claimed U.S. category", x1, current_y, w1)
    current_y -= 22
    draw_label_line(c, "Written basis for this configuration", x1, current_y, w1)
    current_y -= 24
    draw_text(c, "IF PART 103 IS CLAIMED, VERIFY:", x1, current_y, 6.5, CYAN_DARK, "Helvetica-Bold")
    current_y -= 17
    for item in (
        "Single occupant and recreation / sport only",
        "Empty-weight treatment for the exact aircraft",
        "Fuel-capacity and performance limits",
        "No airworthiness certificate is being assumed",
        "Operating, daylight, visibility, and airspace limits",
    ):
        current_y = draw_checkbox(c, item, x1, current_y, w1, 6.35)
    draw_wrapped(c, "Do not decide category from a listing headline, a video, or one specification.",
                 x1, y1 + 5, w1, 6.2, MUTED, "Helvetica-Oblique", 8)

    x2, y2, w2, h2 = draw_section(c, MARGIN + column_width + gap, 465, column_width, 217,
                                  "Operating reality", "05")
    current_y = y2 + h2
    for item in (
        "Registration / certification path confirmed if not Part 103",
        "Pilot qualification and training requirements checked",
        "Operating limitations and permitted airspace checked",
        "Launch / landing site permissions checked",
        "Insurance availability confirmed in writing",
        "Transport, charging, storage, and fire planning priced",
        "Local weather, terrain, neighbors, and emergency access considered",
        "Qualified aviation / legal review recorded when needed",
    ):
        current_y = draw_checkbox(c, item, x2, current_y, w2, 6.35)
    draw_wrapped(c, "A successful filmed flight does not establish repeatable reliability, classification, insurance, site legality, or pilot readiness.",
                 x2, y2 + 5, w2, 6.2, MUTED, "Helvetica-Oblique", 8)

    x3, y3, w3, h3 = draw_section(c, MARGIN, 283, CONTENT_WIDTH, 172, "Safety, training, and support", "06")
    inner_gap = 18
    third = (w3 - (inner_gap * 2)) / 3
    groups = [
        ("TRAINING", ["Training syllabus and instructor", "Emergency / abort procedures", "Launch and landing standards", "Weather and site minimums"]),
        ("AIRCRAFT", ["Manual and maintenance schedule", "Recovery / emergency systems", "Battery limits and replacement", "Inspection and life-limited parts"]),
        ("SUPPORT", ["Warranty and exclusions", "Parts availability / lead times", "Service locations / shipping", "Delivered-customer references"]),
    ]
    for index, (heading, items) in enumerate(groups):
        column_x = x3 + (index * (third + inner_gap))
        draw_text(c, heading, column_x, y3 + h3, 6.6, CYAN_DARK, "Helvetica-Bold")
        current_y = y3 + h3 - 18
        for item in items:
            current_y = draw_checkbox(c, item, column_x, current_y, third, 6.45)
    draw_label_line(c, "Unresolved safety / support question", x3, y3 + 4, w3)

    x4, y4, w4, h4 = draw_section(c, MARGIN, 123, column_width, 150, "Evidence file", "07")
    current_y = y4 + h4
    for item in (
        "Dated listing and specification snapshots",
        "Quote, order agreement, invoice, receipt",
        "Emails, texts, and call notes",
        "Configuration / serial / build position",
        "Classification basis and technical documents",
        "Customer references and incident search",
    ):
        current_y = draw_checkbox(c, item, x4, current_y, w4, 6.35)
    draw_label_line(c, "File location", x4, y4 + 4, w4)

    x5, y5, w5, h5 = draw_section(c, MARGIN + column_width + gap, 123, column_width, 150,
                                  "Decision", "08", AMBER)
    current_y = y5 + h5
    decisions = (
        "STOP - unresolved red flags",
        "VERIFY FURTHER - evidence incomplete",
        "SEEK QUALIFIED HELP - category / terms / safety",
        "REVIEWED NEXT STEP - no unanswered red flags",
    )
    for item in decisions:
        current_y = draw_checkbox(c, item, x5, current_y, w5, 6.35)
    draw_label_line(c, "Reviewer / date", x5, y5 + 26, w5)
    draw_wrapped(c, "No deposit until unanswered red flags are resolved in writing.",
                 x5, y5 + 4, w5, 6.3, RED, "Helvetica-Bold", 8)

    c.setFillColor(NAVY)
    c.roundRect(MARGIN, 30, CONTENT_WIDTH, 82, 6, stroke=0, fill=1)
    draw_text(c, "CURRENT U.S. STARTING POINTS", MARGIN + 12, 96, 7, AMBER, "Helvetica-Bold")
    references = [
        ("eCFR Part 103", "ecfr.gov/current/title-14/chapter-I/subchapter-F/part-103"),
        ("FAA Ultralights", "faa.gov/aircraft/gen_av/ultralights"),
        ("FAA Aircraft Registry", "faa.gov/licenses_certificates/aircraft_certification/aircraft_registry"),
        ("NTSB aviation search", "ntsb.gov/Pages/AviationQueryV2.aspx"),
    ]
    for index, (label, url) in enumerate(references):
        row = index % 2
        col = index // 2
        x = MARGIN + 12 + (col * 276)
        y = 80 - (row * 14)
        draw_text(c, label, x, y, 6.2, HexColor("#BFD5DC"), "Helvetica-Bold")
        draw_text(c, url, x + 78, y, 5.7, WHITE)
    draw_text(c, "Research worksheet only - not financial, legal, aviation, safety, or purchase advice. It does not determine",
              MARGIN + 12, 45, 5.9, HexColor("#D7E3EA"))
    draw_text(c, "whether an aircraft qualifies for Part 103 or any other category. Verify the exact configuration and intended operation.",
              MARGIN + 12, 35.5, 5.9, HexColor("#D7E3EA"))
    draw_right_text(c, "COLINMICHAELS.COM", PAGE_WIDTH - MARGIN - 12, 96, 7, CYAN, "Helvetica-Bold")


def build_pdf() -> Path:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=letter, pageCompression=1)
    c.setTitle("Captain Colin - Personal Aircraft Buyer Verification")
    c.setAuthor("Colin Michaels")
    c.setSubject("Printable personal aircraft offer, deposit, category, support, and evidence worksheet")
    c.setCreator("ColinMichaels.com")

    draw_page_one(c)
    c.showPage()
    draw_page_two(c)
    c.showPage()
    c.save()
    return OUTPUT


if __name__ == "__main__":
    print(build_pdf())
