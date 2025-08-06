#!/bin/bash
# run.sh - A simple script to start the ship routing backend server.

echo "Setting up Python virtual environment..."
# Check if venv exists, if not, create it
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

echo "Installing required packages from requirements.txt..."
pip install -r requirements.txt

echo "Starting Flask server..."
# Run the app.py using Flask's built-in server.
# The server will be available at http://localhost:5000
FLASK_APP=backend/app.py flask run --host=0.0.0.0 --port=5000
