import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()

def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["app_name"] == "MyDocs"
        assert "database" in data
        assert "chromadb" in data

def test_ollama_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health/ollama")
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert "model" in data

def test_document_crud_flow():
    with TestClient(app) as client:
        # 1. Upload a text document
        file_content = b"MyDocs is an isolated local AI document chat application."
        response = client.post(
            "/api/documents/upload",
            files={"file": ("test_doc.txt", file_content, "text/plain")}
        )
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["duplicate"] is False
        doc_id = res_data["document"]["id"]

        # 2. Get document
        get_res = client.get(f"/api/documents/{doc_id}")
        assert get_res.status_code == 200
        assert get_res.json()["original_filename"] == "test_doc.txt"

        # 3. Create conversation for document
        conv_res = client.post("/api/conversations", json={"document_id": doc_id, "title": "Test Chat"})
        assert conv_res.status_code == 200
        conv_id = conv_res.json()["id"]

        # 4. List conversations
        conv_list = client.get(f"/api/conversations?document_id={doc_id}")
        assert conv_list.status_code == 200
        assert len(conv_list.json()) >= 1

        # 5. Delete document
        del_res = client.delete(f"/api/documents/{doc_id}")
        assert del_res.status_code == 200

        # 6. Verify 404 after deletion
        assert client.get(f"/api/documents/{doc_id}").status_code == 404