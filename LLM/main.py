import time
import asyncio
import os
# --- RAG ENGINE IMPORT ---
from rag_engine import load_rag_index, retrieve_context

# --- Your existing imports ---
from recordingUser import record
from whisper_transcript import whisper_transcript
from chat import initialize_llm, get_gemma_response
from caption import init_blip, caption_image

# --- Configuration ---
RECORDING_DURATION = 5
SAMPLE_RATE = 16000
WAV_OUTPUT_FILE = "user_audio.wav"
DISTANCE_THRESHOLD = 1.2
IMG_PTH = "image.jpg"

async def main():
    """Main asynchronous function to run the assistant."""
    # --- Initialization ---
    print("Rouge Coders Voice Assistant Initializing...")

    # Initialize all models concurrently for a faster start
    (llm, (processor, model), (rag_index, rag_docs)) = await asyncio.gather(
        asyncio.to_thread(initialize_llm),
        asyncio.to_thread(init_blip),
        load_rag_index() # This is already async
    )

    chat_history = []
    print("Ready! Let's talk.")
    print("-" * 20)

    # --- Main Loop ---
    while True:
        try:
            user_text = None  # Reset user_text at the start of the loop

            # Step 1: Choose Input Method
            choice = input("Choose input: (v)oice, (t)ext, (i)mage or (q)uit? ").lower().strip()

            if not choice:
                continue

            if choice == 'v':
                print(f"🎙️  Recording for {RECORDING_DURATION} seconds...")
                record(WAV_OUTPUT_FILE, RECORDING_DURATION, SAMPLE_RATE)
                print("Recording complete.")
                user_text = whisper_transcript(WAV_OUTPUT_FILE)
                print(f"👤 You said: {user_text}")

            elif choice == 't':
                user_text = input("⌨️  Type your message: ")

            elif choice == 'q':
                print("👋 Catch you later! Goodbye.")
                os._exit(0)

            elif choice == 'i':
                img_pth = input("Enter the image path: ")
                inp = input("⌨️  Type your message: ")
                caption = caption_image(processor, model, img_pth) # Use the correct path
                user_text = f"The user said {inp} and the given image has {caption}"

            else:
                print("Oops! Invalid choice. Please enter 'v', 't', 'i', or 'q'.")
                continue

            # Step 2: Check for valid input
            if not user_text or not user_text.strip():
                print("Hmmm, I didn't catch that. Let's try again.")
                continue

            print("Searching for relevant context...")
            context, distances = retrieve_context(user_text, rag_index, rag_docs)

            if distances[0] < DISTANCE_THRESHOLD:
                print("Relevant context found. Augmenting prompt.")
                augmented_prompt = f"""
                Use the following pieces of context to inform your response.

                Context:
                - {"\n- ".join(context)}

                User: {user_text}
                Assistant:
                """
                get_gemma_response(llm, chat_history, augmented_prompt)
            else:
                print("No relevant context found. Using original prompt.")
                get_gemma_response(llm, chat_history, user_text)

        except Exception as e:
            print(f"\nAn error occurred: {e}")
            print("Restarting the loop.")
            time.sleep(2)

if __name__ == "__main__":
    asyncio.run(main())