# OpenSentinel Lite

AI-assisted security log monitoring and threat detection system.

## Current Features

- Security log generation
- Log parsing
- Rule-based threat detection
- Brute force detection
- SQLite alert storage

## Tech Stack

- Python
- SQLite
- Scikit-learn (planned)
- FastAPI (planned)
- Docker (planned)

## Project Structure

backend/
- log_generator.py
- parser.py
- analyzer.py
- database.py
- test.py

## Running

Create environment:

python -m venv venv

Install dependencies:

pip install -r requirements.txt

Run log generator:

python backend/log_generator.py

Run scanner:

python backend/test.py