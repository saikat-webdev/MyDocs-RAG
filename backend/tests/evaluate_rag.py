import asyncio
import json
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.database import SessionLocal, init_db
from app.services.document_service import document_service
from app.services.rag_service import rag_service
from fastapi import UploadFile

async def run_evaluation():
    init_db()
    db = SessionLocal()
    tests_dir = Path(__file__).parent
    cases_file = tests_dir / "rag_test_cases.json"
    
    if not cases_file.exists():
        print("No test cases found.")
        return

    with open(cases_file, "r", encoding="utf-8") as f:
        cases = json.load(f)

    print("==================================================")
    print("          MyDocs RAG Evaluation Runner            ")
    print("==================================================")

    # Create a dummy sample contract if not exists
    sample_txt = tests_dir / "sample_contract.txt"
    sample_txt.write_text("""MASTER SERVICES AGREEMENT
1. Scope of Work: The vendor will provide local AI document chat solutions.
2. Financial Terms: The annual fee is $50,000 payable upon execution.
3. Termination: Either party may terminate this agreement with 30 days written notice.
4. Privacy: All data remains 100% local on customer infrastructure.
""", encoding="utf-8")

    # Ingest document
    with open(sample_txt, "rb") as f:
        upload_file = UploadFile(filename="sample_contract.txt", file=f)
        doc, _ = document_service.upload_document(upload_file, db)
    
    # Process document
    document_service.process_document(doc.id, db)
    print(f"Ingested Document: {doc.original_filename} (ID: {doc.id})")
    print("--------------------------------------------------")

    for idx, case in enumerate(cases, start=1):
        q = case["question"]
        expected_keywords = case.get("expected_answer_keywords", [])
        print(f"\n[Test Case {idx}] Question: '{q}'")
        
        sources = []
        tokens = []
        debug_data = None

        async for item in rag_service.stream_rag_chat(
            document_id=doc.id,
            question=q,
            debug_mode=True
        ):
            if item.get("type") == "metadata":
                sources = item.get("sources", [])
                debug_data = item.get("debug_info", {})
            elif item.get("type") == "token":
                tokens.append(item.get("token", ""))

        answer = "".join(tokens)
        print(f"Retrieved Chunks: {len(sources)}")
        for s in sources:
            print(f"  - Chunk {s['chunk_id']} | Sim: {s['similarity_score']} | Page {s['page_number']}")
        print(f"Generated Answer:\n{answer.strip()}")

        passed = any(kw.lower() in answer.lower() for kw in expected_keywords)
        print(f"Verdict: {'PASSED' if passed else 'REVIEW'}")

    # Cleanup
    document_service.delete_document(doc.id, db)
    sample_txt.unlink(missing_ok=True)
    db.close()
    print("\n================ Evaluation Complete ================")

if __name__ == "__main__":
    asyncio.run(run_evaluation())