import sounddevice as sd
from scipy.io.wavfile import write

def record(output_file, duration, sample_rate, device=None):
    try:
        # Try to use the provided device, or fallback to default
        recording = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=1,
            dtype='int16',
            device=device  # Can be None or int
        )
        sd.wait()
        write(output_file, sample_rate, recording)
        print(f"✅ Recording saved to {output_file}")

    except Exception as e:
        print(f"❌ Error using device {device or 'default'}: {e}")
        print("🔁 Falling back to default microphone...")

        # Retry with default device (None)
        recording = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=1,
            dtype='int16',
            device=None  # Let sounddevice auto-pick
        )
        sd.wait()
        write(output_file, sample_rate, recording)
        print(f"✅ Recording saved to {output_file} using default mic.")
