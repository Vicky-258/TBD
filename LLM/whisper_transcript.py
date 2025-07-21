import subprocess
import os

def whisper_transcript(file_name, model="tiny.en"):
    model_bin = f"ggml-{model}.bin"
    model_path = os.path.join("whisper.cpp", "models", model_bin)
    cli_path = os.path.join("whisper.cpp", "build", "bin", "Release", "whisper-cli.exe")

    transcript_file = file_name + ".txt"
    if os.path.exists(transcript_file):
        os.remove(transcript_file)

    cmd = [
        cli_path,
        "-m", model_path,
        "-f", file_name,
        "-nt",
        "-otxt"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return result.stdout.strip()


if __name__ == "__main__":
    print(whisper_transcript("harvard.wav"))