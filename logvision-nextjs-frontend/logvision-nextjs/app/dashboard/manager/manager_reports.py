from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.report_service import generate_executive_summary_xlsx

router = APIRouter(prefix="/api/manager/reports", tags=["Reports"])

@router.get("/executive-summary.xlsx")
async def get_executive_summary(db: Session = Depends(get_db)):
    """
    Endpoint for Managers to download the strategic Executive Summary.
    """
    try:
        file_stream = generate_executive_summary_xlsx(db)
        headers = {'Content-Disposition': 'attachment; filename="LogVision_Executive_Summary.xlsx"'}
        return StreamingResponse(file_stream, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")