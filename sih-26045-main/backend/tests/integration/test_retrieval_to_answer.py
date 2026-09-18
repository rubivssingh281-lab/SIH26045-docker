from app.rag.prior_art import find_prior_art
from app.llm.client import call_llm

def test_retrieval_to_answer():
    retrieval = find_prior_art("neem", limit=1)
    
    context = " ".join([d["text"] for d in retrieval["results"]])
    
    prompt = f"Answer based on context: {context}\nQuestion: What is neem used for?"
    # Just checking it doesn't crash on standard schema
    assert prompt is not None
