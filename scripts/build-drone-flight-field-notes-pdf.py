#!/usr/bin/env python3
"""Build the public Drone Flight Field Notes printable worksheet."""

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "downloads" / "captain-colin-drone-flight-field-notes.pdf"

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


def draw_label_line(c: canvas.Canvas, label: str, x: float, y: float, width: float,
                    label_width: float | None = None) -> None:
    draw_text(c, label.upper(), x, y + 2, 6.2, MUTED, "Helvetica-Bold")
    actual_label_width = label_width or (stringWidth(label.upper(), "Helvetica-Bold", 6.2) + 7)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.65)
    c.line(x + actual_label_width, y, x + width, y)


def draw_checkbox(c: canvas.Canvas, label: str, x: float, y: float, size: float = 7.3) -> None:
    c.setStrokeColor(CYAN_DARK)
    c.setLineWidth(0.75)
    c.rect(x, y - 1, 7, 7, stroke=1, fill=0)
    draw_text(c, label, x + 11, y, size, INK)


def draw_section(c: canvas.Canvas, x: float, y: float, width: float, height: float,
                 title: str, step: str) -> tuple[float, float, float, float]:
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y, width, height, 5, stroke=1, fill=1)

    c.setFillColor(PANEL)
    c.roundRect(x, y + height - 22, width, 22, 5, stroke=0, fill=1)
    c.rect(x, y + height - 22, width, 5, stroke=0, fill=1)

    c.setFillColor(CYAN)
    c.roundRect(x + 7, y + height - 17, 19, 12, 3, stroke=0, fill=1)
    draw_text(c, step, x + 12.1, y + height - 14.2, 6.4, NAVY, "Helvetica-Bold")
    draw_text(c, title.upper(), x + 33, y + height - 15, 7.8, NAVY, "Helvetica-Bold")
    return x + 10, y + 9, width - 20, height - 38


def draw_multiline_note(c: canvas.Canvas, label: str, x: float, y: float,
                        width: float, lines: int, spacing: float = 16) -> None:
    draw_text(c, label.upper(), x, y, 6.2, MUTED, "Helvetica-Bold")
    c.setStrokeColor(LINE)
    c.setLineWidth(0.65)
    for index in range(lines):
        line_y = y - 8 - (index * spacing)
        c.line(x, line_y, x + width, line_y)


def build_pdf() -> Path:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=letter, pageCompression=1)
    c.setTitle("Captain Colin - Drone Flight Field Notes")
    c.setAuthor("Colin Michaels")
    c.setSubject("Printable drone preflight planning and post-flight debrief worksheet")
    c.setCreator("ColinMichaels.com")

    # Header
    c.setFillColor(NAVY)
    c.roundRect(MARGIN, 694, CONTENT_WIDTH, 68, 7, stroke=0, fill=1)
    c.setFillColor(CYAN)
    c.rect(MARGIN, 694, 7, 68, stroke=0, fill=1)
    draw_text(c, "CAPTAIN COLIN", MARGIN + 20, 742, 8, CYAN, "Helvetica-Bold")
    draw_text(c, "DRONE FLIGHT FIELD NOTES", MARGIN + 20, 719, 18, WHITE, "Helvetica-Bold")
    draw_text(c, "Purpose  >  Place  >  Setup  >  Exit  >  Debrief", MARGIN + 20, 704, 8, HexColor("#D7E3EA"))
    draw_right_text(c, "PRINTABLE FIELD SHEET", PAGE_WIDTH - MARGIN - 14, 742, 6.8, AMBER, "Helvetica-Bold")

    # Flight ID
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 628, CONTENT_WIDTH, 58, 5, stroke=1, fill=1)
    draw_text(c, "FLIGHT ID", MARGIN + 10, 673, 7.2, NAVY, "Helvetica-Bold")
    row_x = MARGIN + 10
    top_y = 657
    draw_label_line(c, "Date", row_x, top_y, 116)
    draw_label_line(c, "Time", row_x + 130, top_y, 102)
    draw_label_line(c, "Pilot", row_x + 246, top_y, 132)
    draw_label_line(c, "Aircraft", row_x + 392, top_y, 140)
    draw_label_line(c, "Location", row_x, 638, 230)
    draw_label_line(c, "Flight type", row_x + 246, 638, 132)
    draw_label_line(c, "Battery IDs", row_x + 392, 638, 140)

    gap = 8
    column_width = (CONTENT_WIDTH - gap) / 2

    # Purpose
    x1, y1, w1, h1 = draw_section(c, MARGIN, 454, column_width, 166, "Purpose", "01")
    draw_multiline_note(c, "One goal for this flight", x1, y1 + h1 - 3, w1, 2, 17)
    draw_multiline_note(c, "Shot, maneuver, or system being tested", x1, y1 + h1 - 51, w1, 2, 17)
    draw_multiline_note(c, "What success looks like", x1, y1 + h1 - 99, w1, 1, 17)

    # Place and readiness
    x2, y2, w2, h2 = draw_section(c, MARGIN + column_width + gap, 454, column_width, 166,
                                  "Place & readiness", "02")
    readiness = [
        "Airspace / authorization checked",
        "Site and local rules checked",
        "TRUST proof ready (recreational)",
        "Registration / marking confirmed if required",
        "Remote ID or FRIA status confirmed if applicable",
    ]
    check_y = y2 + h2 - 2
    for index, item in enumerate(readiness):
        draw_checkbox(c, item, x2, check_y - (index * 17), 6.9)
    draw_label_line(c, "Wind / weather", x2, check_y - 92, w2)
    draw_label_line(c, "People / property / obstacles", x2, check_y - 112, w2)

    # Aircraft and setup
    x3, y3, w3, h3 = draw_section(c, MARGIN, 348, CONTENT_WIDTH, 98, "Aircraft & setup", "03")
    setup_col = (w3 - 20) / 3
    draw_checkbox(c, "Frame / props / motors", x3, y3 + h3 - 2, 7)
    draw_checkbox(c, "Battery state / voltage", x3, y3 + h3 - 21, 7)
    draw_label_line(c, "Safety settings", x3, y3 + h3 - 43, setup_col)
    mid_x = x3 + setup_col + 10
    draw_label_line(c, "Camera / resolution / FPS", mid_x, y3 + h3 - 2, setup_col)
    draw_label_line(c, "Shutter / filter", mid_x, y3 + h3 - 21, setup_col)
    draw_label_line(c, "Rates / mode", mid_x, y3 + h3 - 43, setup_col)
    right_x = mid_x + setup_col + 10
    draw_label_line(c, "Launch / recovery area", right_x, y3 + h3 - 2, setup_col)
    draw_label_line(c, "Signal obstacles", right_x, y3 + h3 - 21, setup_col)
    draw_label_line(c, "Spotter / communication", right_x, y3 + h3 - 43, setup_col)

    # Bottom working columns
    bottom_gap = 8
    bottom_width = (CONTENT_WIDTH - (bottom_gap * 2)) / 3
    x4, y4, w4, h4 = draw_section(c, MARGIN, 153, bottom_width, 187, "Exit plan", "04")
    draw_multiline_note(c, "Planned return trigger", x4, y4 + h4 - 2, w4, 2, 18)
    draw_multiline_note(c, "Landing / recovery options", x4, y4 + h4 - 55, w4, 2, 18)
    draw_multiline_note(c, "Stop-flight conditions", x4, y4 + h4 - 108, w4, 1, 18)

    x5, y5, w5, h5 = draw_section(c, MARGIN + bottom_width + bottom_gap, 153, bottom_width, 187,
                                  "Shot plan", "05")
    for index in range(3):
        row_top = y5 + h5 - 2 - (index * 43)
        draw_text(c, f"{index + 1:02d}", x5, row_top, 6.5, CYAN_DARK, "Helvetica-Bold")
        c.setStrokeColor(LINE)
        c.line(x5 + 18, row_top - 1, x5 + w5, row_top - 1)
        c.line(x5 + 18, row_top - 17, x5 + w5, row_top - 17)
    draw_label_line(c, "Battery floor", x5, y5 + 3, w5)

    x6, y6, w6, h6 = draw_section(c, MARGIN + ((bottom_width + bottom_gap) * 2), 153, bottom_width, 187,
                                  "Debrief", "06")
    draw_multiline_note(c, "Best result", x6, y6 + h6 - 2, w6, 2, 18)
    draw_multiline_note(c, "One correction", x6, y6 + h6 - 55, w6, 2, 18)
    draw_multiline_note(c, "Next-pack change", x6, y6 + h6 - 108, w6, 1, 18)

    # Reference and safety footer
    c.setFillColor(NAVY)
    c.roundRect(MARGIN, 30, CONTENT_WIDTH, 115, 6, stroke=0, fill=1)
    draw_text(c, "CHECK CURRENT OFFICIAL GUIDANCE BEFORE EVERY FLIGHT", MARGIN + 12, 129, 7.2, AMBER, "Helvetica-Bold")
    draw_text(c, "FAA recreational flyers", MARGIN + 12, 111, 6.6, HexColor("#BFD5DC"), "Helvetica-Bold")
    draw_text(c, "faa.gov/uas/recreational_flyers", MARGIN + 118, 111, 6.6, WHITE)
    draw_text(c, "FAA where can I fly", MARGIN + 12, 95, 6.6, HexColor("#BFD5DC"), "Helvetica-Bold")
    draw_text(c, "faa.gov/uas/getting_started/where_can_i_fly", MARGIN + 118, 95, 6.6, WHITE)
    draw_text(c, "FAA Remote ID", MARGIN + 12, 79, 6.6, HexColor("#BFD5DC"), "Helvetica-Bold")
    draw_text(c, "faa.gov/uas/getting_started/remote_id", MARGIN + 118, 79, 6.6, WHITE)
    draw_text(c, "Planning and debrief worksheet only. Not a substitute for FAA guidance, CBO safety rules,",
              MARGIN + 12, 57, 6.5, HexColor("#D7E3EA"))
    draw_text(c, "manufacturer instructions, local restrictions, or pilot judgment. Official sources reviewed August 15, 2026.",
              MARGIN + 12, 45, 6.5, HexColor("#D7E3EA"))
    draw_right_text(c, "COLINMICHAELS.COM", PAGE_WIDTH - MARGIN - 12, 129, 7, CYAN, "Helvetica-Bold")

    c.showPage()
    c.save()
    return OUTPUT


if __name__ == "__main__":
    print(build_pdf())
