import pytest
from app.services.embedding_service import get_embedding_service
from app.services.vector_service import get_vector_service

def test_embedding_generation():
    emb_svc = get_embedding_service()
    vector = emb_svc.embed_text("MyDocs document artificial intelligence test.")
    assert len(vector) == 384  # all-MiniLM-L6-v2 dimension

def test_vector_storage_and_isolation():
    vec_svc = get_vector_service()
    emb_svc = get_embedding_service()

    # Document A
    doc_a_chunks = [{
        "chunk_id": "docA_0",
        "chunk_index": 0,
        "document_id": "docA",
        "filename": "docA.txt",
        "file_type": "txt",
        "page_number": 1,
        "text": "The secret code for Document A is AlphaBeta123."
    }]
    vec_svc.insert_chunks("docA", doc_a_chunks, emb_svc.embed_documents([c["text"] for c in doc_a_chunks]))

    # Document B
    doc_b_chunks = [{
        "chunk_id": "docB_0",
        "chunk_index": 0,
        "document_id": "docB",
        "filename": "docB.txt",
        "file_type": "txt",
        "page_number": 1,
        "text": "The secret code for Document B is GammaDelta999."
    }]
    vec_svc.insert_chunks("docB", doc_b_chunks, emb_svc.embed_documents([c["text"] for c in doc_b_chunks]))

    # Query docA - must ONLY return docA chunk
    query_vec = emb_svc.embed_query("secret code")
    res_a = vec_svc.query_vectors("docA", query_vec, top_k=5)
    retrieved_texts = res_a["documents"][0]
    assert any("AlphaBeta123" in t for t in retrieved_texts)
    assert not any("GammaDelta999" in t for t in retrieved_texts)

    # Cleanup
    vec_svc.delete_document_vectors("docA")
    vec_svc.delete_document_vectors("docB")
