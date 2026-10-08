from fastapi import FastAPI

from app.routes.anomaly import router as anomaly_router
from app.routes.fraud import router as fraud_router

app = FastAPI(title="AI Risk Manager Anomaly Service")

app.include_router(anomaly_router)
app.include_router(fraud_router)


@app.get("/health")
def health():
    return {"status": "ok"}