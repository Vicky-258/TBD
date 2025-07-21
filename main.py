import time
from recordingUser import record
from whisper_transcript import whisper_transcript
from chat import initialize_llm, get_gemma_response

# --- Configuration ---
RECORDING_DURATION = 5  # in seconds
SAMPLE_RATE = 16000  # Whisper works best with 16 kHz
WAV_OUTPUT_FILE = "user_audio.wav"

# --- Initialization ---
print("🔥 Rouge Coders Voice Assistant Initializing...")
print("Loading LLM model... (This might take a moment)")
llm = initialize_llm()
chat_history = []
print("✅ Ready! Let's talk.")
print("-" * 20)

# --- Main Loop ---
while True:
    try:
        user_text = None  # Reset user_text at the start of the loop

        # Step 1: Choose Input Method
        choice = input("Choose input: (v)oice, (t)ext, or (q)uit? ").lower().strip()

        if choice == 'v':
            # --- Voice Input Path ---
            print(f"🎙️  Recording for {RECORDING_DURATION} seconds...")
            record(WAV_OUTPUT_FILE, RECORDING_DURATION, SAMPLE_RATE)
            print("✅ Recording complete.")
            user_text = whisper_transcript(WAV_OUTPUT_FILE)
            print(f"👤 You said: {user_text}")

        elif choice == 't':
            # --- Text Input Path ---
            user_text = input("⌨️  Type your message: ")

        elif choice == 'q':
            # --- Quit Path ---
            print("👋 Catch you later! Goodbye.")
            break  # Exit the while loop

        else:
            # --- Invalid Choice Path ---
            print("🤔 Oops! Invalid choice. Please enter 'v', 't', or 'q'.")
            continue # Skip the rest of the loop and ask again

        # Step 2 & 3: Process the input (now common for both)
        # Check if we got any input at all
        if not user_text or not user_text.strip():
            print("🧐 Hmmm, I didn't catch that. Let's try again.")
            continue

        get_gemma_response(llm, chat_history, user_text)

    except Exception as e:
        print(f"\n🚨 An error occurred: {e}")
        print("Restarting the loop.")
        time.sleep(2)