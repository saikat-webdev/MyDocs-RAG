from app.services.chunking_service import ChunkingService

def test_chunking():
    chunker = ChunkingService(chunk_size=100, chunk_overlap=20)
    pages_data = [
        {"page_number": 1, "text": "This is page one text with enough words to split into small test chunks."},
        {"page_number": 2, "text": "This is page two text with more detailed data."}
    ]
    chunks = chunker.create_chunks("doc123", "test.txt", "txt", pages_data)
    assert len(chunks) >= 2
    assert chunks[0]["document_id"] == "doc123"
    assert chunks[0]["chunk_id"] == "doc123_0"
    assert chunks[0]["page_number"] == 1
