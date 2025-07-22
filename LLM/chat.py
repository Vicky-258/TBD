import os
from llama_cpp import Llama

def initialize_llm():
    return Llama(
        model_path="models/gemma-3n-E4B-it-Q4_K_M.gguf",
        n_ctx=2048,
        n_gpu_layers=20,
        n_threads=os.cpu_count(),
        n_batch=64,
        last_n_tokens_size=128,
        verbose=False,
    )

# This function will handle getting a response from the model
def get_gemma_response(llm, chat_history, user_input, context=None):
    # Only the original user input is added to history
    chat_history.append({"role": "user", "content": user_input})

    # Construct enriched prompt if context is provided
    full_prompt = (
        f"Use the following context to help answer the question:\n{context}\n\nQuestion: {user_input}"
        if context else user_input
    )

    response = llm.create_chat_completion(
        messages=[*chat_history[:-1], {"role": "user", "content": full_prompt}],
        stream=True
    )

    response_text = ""
    print("🤖 Gemma:", end=" ", flush=True)
    for chunk in response:
        delta = chunk["choices"][0]["delta"]
        if "content" in delta:
            text = delta["content"]
            print(text, end="", flush=True)
            response_text += text
    print()  # newline

    chat_history.append({"role": "assistant", "content": response_text})
    return response_text

