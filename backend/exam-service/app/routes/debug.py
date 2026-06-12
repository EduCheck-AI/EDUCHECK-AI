from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from ..utils.pdf_utils import is_pdf_with_text, extract_text_from_pdf
from ..utils.ocr_client import call_ocr_service

router = APIRouter(prefix="/debug", tags=["Debug"])

@router.post("/ocr")
async def debug_ocr(file: UploadFile = File(...)):
    try:
        extension = file.filename.split(".")[-1].lower()
        if extension == "pdf":
            if is_pdf_with_text(file):
                text = extract_text_from_pdf(file)
            else:
                text = await call_ocr_service(file)
        elif extension in ["jpg", "jpeg", "png"]:
            text = await call_ocr_service(file)
        else:
            content = await file.read()
            text = content.decode("utf-8")
        return {"original_text": text[:1000], "length": len(text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ocr-raw")
async def debug_ocr_raw(file: UploadFile = File(...)):
    extension = file.filename.split(".")[-1].lower()
    if extension in ["jpg", "jpeg", "png"]:
        text = await call_ocr_service(file)
    else:
        content = await file.read()
        text = content.decode("utf-8")
    
    lines = text.split("\n")
    return {
        "total_lines": len(lines),
        "lines": [{"num": i + 1, "content": line} for i, line in enumerate(lines[:50])],
    }