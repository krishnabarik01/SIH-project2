# MONSOON-GUARD Makefile
# Ministry of Earth Sciences / NCMRWF Hyperlocal Prediction System

.PHONY: setup data train evaluate test serve dev demo help

help:
	@echo "MONSOON-GUARD Targets:"
	@echo "  make setup     - Install Python & Node dependencies"
	@echo "  make data      - Ingest & preprocess meteorological fields + generate ground truth labels"
	@echo "  make train     - Train multi-horizon probabilistic GBM models & calibrate"
	@echo "  make evaluate  - Generate verification report & compute Brier Skill Scores"
	@echo "  make test      - Run all unit & temporal leakage tests"
	@echo "  make serve     - Start FastAPI backend server"
	@echo "  make dev       - Start both backend and frontend concurrently"
	@echo "  make demo      - Execute 3-minute evaluation demo flow"

setup:
	pip install -r requirements.txt
	cd frontend && npm install

data:
	python backend/ml/preprocessing.py
	python backend/ml/labels.py
	python backend/ml/features.py

train:
	python backend/ml/model_gbm.py

evaluate:
	python backend/ml/evaluate.py

test:
	python -m unittest discover -s tests

serve:
	python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000

dev:
	npm run dev

demo:
	python -c "from backend.ml.hindcast import load_hindcast_case; res = load_hindcast_case('chhattisgarh_2023_false_onset'); print('HINDCAST DEMO RESULT:'); print('False Onset Alert:', res['false_onset_alert']); print('Model Forecast:', res['model_forecast']); print('Ground Truth:', res['actual_ground_truth']['summary'])"
