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

Run the refined demo log generator from the project root. It overwrites
`data/security.log` by default, writes the same events to SQLite, and emits a
normal search, SQL injection, reconnaissance, and brute-force sequence:

python -m backend.log_generator --interval 2

Generate the sequence immediately:

python -m backend.log_generator --interval 0

Keep existing file contents instead of overwriting:

python -m backend.log_generator --append

Run scanner:

python backend/test.py