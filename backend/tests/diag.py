import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))
from app.services.embedding_service import get_embedding_service
from app.services.vector_service import get_vector_service
import numpy as np

emb = get_embedding_service()
vec = get_vector_service()

text = "3. Termination: Either party may terminate this agreement with 30 days written notice."
q = "What is the termination notice period?"

v_text = emb.embed_text(text)
v_q = emb.embed_query(q)

dot = float(np.dot(v_text, v_q))
print(f"Dot product (Cosine Similarity): {dot:.4f}")

chunk = [{
    "chunk_id": "test_0",
    "chunk_index": 0,
    "document_id": "test_doc",
    "filename": "test.txt",
    "file_type": "txt",
    "page_number": 1,
    "text": text
}]
vec.insert_chunks("test_doc", chunk, [v_text])
res = vec.query_vectors("test_doc", v_q, top_k=1)
print("Chroma Query Result:")
print("Distances:", res["distances"])
print("1 - distance:", 1.0 - res["distances"][0][0])
vec.delete_document_vectors("test_doc")