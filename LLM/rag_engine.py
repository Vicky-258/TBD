from sentence_transformers import SentenceTransformer
import numpy as np
import shutil
import faiss
import json
import pickle
import asyncio

# --- CORE COMPONENTS ---

# Initialize a single instance of the embedding model
embedder = SentenceTransformer("all-MiniLM-L6-v2")

import os
import fitz  # PyMuPDF

# --- Define your extractor functions ---

def _extract_from_txt(path):
    """Extracts text from a .txt file."""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def _extract_from_pdf(path):
    """Extracts text from a .pdf file."""
    try:
        doc = fitz.open(path)
        full_text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return full_text
    except Exception as e:
        print(f"Error processing PDF {path}: {e}")
        return "" # Return empty string on failure

# --- Create the dispatcher dictionary ---
# This maps file extensions to the function that processes them.
FILE_EXTRACTORS = {
    ".txt": _extract_from_txt,
    ".pdf": _extract_from_pdf,
}

def _load_and_chunk_doc(file_path):
    """Loads a single file using the correct extractor and splits it into chunks."""
    ext = os.path.splitext(file_path)[1].lower()
    extractor = FILE_EXTRACTORS.get(ext)

    if not extractor:
        print(f"Skipping unsupported file type: {file_path}")
        return []

    print(f"Processing file: {os.path.basename(file_path)}...")
    full_text = extractor(file_path)
    # Using a simple split, which works well with the text extracted from PDFs page by page.
    return [chunk for chunk in full_text.split('\n\n') if chunk.strip()]


# --- The main loader function, now upgraded! ---

def _load_docs_from_folder(folder_path):
    """Private helper to load and chunk docs of various supported types from a folder."""
    all_chunks = []
    for file_name in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file_name)
        if os.path.isfile(file_path): # Ensure we're only processing files
             all_chunks.extend(_load_and_chunk_doc(file_path))
    return all_chunks

async def _rebuild_rag_index(folder_path="rag_docs"):
    """
    Private helper function to build the index from scratch and create a manifest.
    """
    # Get the list of filenames that will be included in this build
    source_filenames = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]

    docs = await asyncio.to_thread(_load_docs_from_folder, folder_path)
    docs = [doc for doc in docs if doc.strip()]

    if not docs:
        print("No content found in documents. Creating a new, empty index.")
        d = embedder.get_sentence_embedding_dimension()
        return faiss.IndexFlatL2(d), []

    print(f"Found {len(docs)} chunks from {len(source_filenames)} files. Building new index...")
    embeddings = await asyncio.to_thread(embedder.encode, docs)

    index = faiss.IndexFlatL2(embeddings[0].shape[0])
    index.add(np.array(embeddings).astype("float32"))

    # Save everything to disk, including our new manifest
    await asyncio.gather(
        asyncio.to_thread(pickle.dump, docs, open("rag_cache/docs.pkl", "wb")),
        asyncio.to_thread(faiss.write_index, index, "rag_cache/index.faiss"),
        # Save the list of filenames that this cache represents
        asyncio.to_thread(json.dump, source_filenames, open("rag_cache/manifest.json", "w"))
    )
    print("Index rebuilt and saved successfully.")
    return index, docs

# --- PUBLIC API FUNCTIONS ---

async def load_rag_index():
    """
    Loads the RAG index from cache. If cache is invalid or outdated,
    it triggers a full rebuild automatically.
    """
    cache_path = "rag_cache"
    docs_path = "rag_docs"
    manifest_path = os.path.join(cache_path, "manifest.json")
    index_path = os.path.join(cache_path, "index.faiss")

    # Ensure directories exist before we do anything
    os.makedirs(cache_path, exist_ok=True)
    os.makedirs(docs_path, exist_ok=True)

    try:
        # Check 1: Do the core cache files exist?
        if not os.path.exists(index_path) or not os.path.exists(manifest_path):
             raise FileNotFoundError("Cache or manifest missing.")

        # Check 2: Are the source documents the same as when the cache was built?
        with open(manifest_path, "r") as f:
            cached_files = set(json.load(f))
        current_files = set(os.listdir(docs_path))

        if cached_files != current_files:
            print("Source documents have changed. Forcing a rebuild.")
            # We don't raise an error, we just proceed to the rebuild logic
            return await _rebuild_rag_index()

        # If all checks pass, load from the trusted cache
        print("Found valid and up-to-date cache. Loading index...")
        index = await asyncio.to_thread(faiss.read_index, index_path)
        with open(os.path.join(cache_path, "docs.pkl"), "rb") as f:
            docs = await asyncio.to_thread(pickle.load, f)

        print("RAG engine is ready.")
        return index, docs

    except Exception as e:
        print(f"Cache invalid or loading failed ({e}). Rebuilding from scratch...")
        return await _rebuild_rag_index()

def retrieve_context(query: str, index: faiss.Index, docs: list, k: int = 3):
    """
    Retrieves the top 'k' most relevant document chunks and their distances.
    """
    query_embedding = embedder.encode([query])
    distances, indices = index.search(np.array(query_embedding).astype("float32"), k)

    # Return both the text chunks and their corresponding distances
    return [docs[i] for i in indices[0]], distances[0]

async def add_document_to_rag(file_path: str, index: faiss.Index, docs: list):
    """
    Adds a new document to the existing in-memory index and doc list,
    then saves the updated versions to disk.
    """
    if not os.path.isfile(file_path) or not file_path.endswith(".txt"):
        raise ValueError("Invalid file provided. Must be a .txt file.")

    # Process ONLY the new document
    new_chunks = _load_and_chunk_doc(file_path)

    if not new_chunks:
        print("File is empty or contains no valid chunks. Nothing to add.")
        return index, docs

    # Add to the existing index and doc list
    new_embeddings = await asyncio.to_thread(embedder.encode, new_chunks)
    index.add(np.array(new_embeddings).astype("float32"))
    docs.extend(new_chunks)

    # Save the updated versions to disk
    await asyncio.gather(
        asyncio.to_thread(pickle.dump, docs, open("rag_cache/docs.pkl", "wb")),
        asyncio.to_thread(faiss.write_index, index, "rag_cache/index.faiss")
    )

    # Copy the source file to your RAG document collection
    shutil.copy(file_path, os.path.join("rag_docs", os.path.basename(file_path)))
    print(f"Successfully updated RAG with: {os.path.basename(file_path)}")
    return index, docs

# --- USAGE EXAMPLE ---

async def example_usage():
    """Shows how another script would use this engine."""

    # 1. On chatbot startup, load the engine once
    rag_index, rag_docs = await load_rag_index()

    # 2. When a user asks a question, retrieve context
    user_query = "What are the penalties for violating the Time Travel Regulation Act?"
    context = retrieve_context(user_query, rag_index, rag_docs)
    print(f"\nQuery: {user_query}")
    print(f"Retrieved Context: {context}")

    # 3. (Optional) When a user uploads a file, add it to the RAG
    # Note: In a real app, you'd get the file path from a file dialog
    # rag_index, rag_docs = await add_document_to_rag("path/to/new_file.txt", rag_index, rag_docs)


if __name__ == "__main__":
    print("Running RAG engine usage example...")
    asyncio.run(example_usage())