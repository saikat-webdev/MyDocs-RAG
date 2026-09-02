import pytest
from pathlib import Path
from app.services.parser_service import ParserService, DocumentParseError

def test_parse_txt(tmp_path):
    txt_file = tmp_path / "test.txt"
    txt_file.write_text("This is a simple text document for testing.", encoding="utf-8")
    pages, total = ParserService.parse_document(txt_file, "txt")
    assert total == 1
    assert len(pages) == 1
    assert "simple text document" in pages[0]["text"]

def test_parse_markdown(tmp_path):
    md_file = tmp_path / "test.md"
    md_file.write_text("# Heading 1\n\nSome paragraph text.", encoding="utf-8")
    pages, total = ParserService.parse_document(md_file, "md")
    assert total == 1
    assert "Heading 1" in pages[0]["text"]

def test_empty_txt(tmp_path):
    empty_file = tmp_path / "empty.txt"
    empty_file.write_text("   ", encoding="utf-8")
    with pytest.raises(DocumentParseError):
        ParserService.parse_document(empty_file, "txt")
