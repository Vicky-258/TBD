# build_backend.py
import PyInstaller.__main__
import os
import shutil

# --- Configuration ---
APP_NAME = "app"
SCRIPT_TO_PACKAGE = os.path.join("backend", "app.py")
OUTPUT_FOLDER = os.path.join("dist", "backend")

# --- Data and Hidden Imports ---
# This tells PyInstaller exactly which folders to include.
data_to_add = [
    f"backend/data{os.pathsep}data",
    f"backend/weather{os.pathsep}weather",
    f"backend/routing{os.pathsep}routing"
]

# This tells PyInstaller about hidden modules that Flask needs to work correctly.
hidden_imports = [
    'werkzeug.serving',
    'engineio.async_drivers.threading'
]

def build_executable():
    """
    Runs the PyInstaller build process with a more reliable configuration.
    """
    print("--- Starting Backend Build Process ---")
    
    # Clean up previous builds to ensure a fresh start
    if os.path.exists(OUTPUT_FOLDER):
        print(f"Removing old build directory: {OUTPUT_FOLDER}")
        shutil.rmtree(OUTPUT_FOLDER)
    if os.path.exists(f"{APP_NAME}.spec"):
        os.remove(f"{APP_NAME}.spec")

    # Construct the PyInstaller command arguments
    pyinstaller_args = [
        '--name', APP_NAME,
        '--onefile',
        '--console', # UPDATED: Use '--console' for debugging backend errors
        '--distpath', OUTPUT_FOLDER
    ]

    # Add data files
    for data_folder in data_to_add:
        pyinstaller_args.extend(['--add-data', data_folder])

    # Add hidden imports
    for module in hidden_imports:
        pyinstaller_args.extend(['--hidden-import', module])

    # Add the main script
    pyinstaller_args.append(SCRIPT_TO_PACKAGE)

    # Run PyInstaller
    try:
        print(f"Running PyInstaller with args: {pyinstaller_args}")
        PyInstaller.__main__.run(pyinstaller_args)
        print("--- Backend Build Successful ---")
    except Exception as e:
        print(f"--- Backend Build FAILED ---")
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    build_executable()
