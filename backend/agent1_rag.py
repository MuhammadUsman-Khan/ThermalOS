import os
import sys
import time
import logging
from typing import Optional
from dotenv import load_dotenv
import requests
import chromadb
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

# Ensure backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from fortyguard_client import fortyguard_client, f_to_c, c_to_f

# Force the HuggingFace/transformers stack onto the PyTorch backend BEFORE any
# langchain import. Disabling TF/Flax prevents protobuf version crashes.
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_FLAX", "0")
os.environ.setdefault("TRANSFORMERS_NO_ADVISORY_WARNINGS", "1")

load_dotenv()

N8N_AUDIT_WEBHOOK_URL = os.getenv(
    "N8N_AUDIT_WEBHOOK_URL",
    "https://usmankhan0.app.n8n.cloud/webhook/thermalos-audit",
)

try:
    from langchain_community.document_loaders import PyPDFLoader
except Exception:  # noqa: BLE001
    PyPDFLoader = None

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except Exception:  # noqa: BLE001
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except Exception:  # noqa: BLE001
        RecursiveCharacterTextSplitter = None

logger = logging.getLogger("thermalos.agent1")


# Pydantic schema for structured output
class ComplianceReport(BaseModel):
    city: str = Field(description="The target city audited")
    temperature_f: int = Field(description="The ambient surface/air temperature in Fahrenheit")
    ashrae_compliance_status: str = Field(
        description="Must state if temperature is within or exceeds the 79°F summer operative limit according to ASHRAE 55"
    )
    iecc_envelope_warning: str = Field(
        description="Envelope warning addressing continuous insulation (ci), thermal bridging, and U-factor under extreme heat zones"
    )
    recommended_hvac_action: str = Field(
        description="Specific mechanical HVAC pre-cooling and load modulation recommendations"
    )


# Local ChromaDB Vector Store
_collection = None


def _resolve_pdf_path(path: str) -> str:
    """Helper to locate PDF files whether running from workspace root or backend dir."""
    if os.path.exists(path):
        return path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidate1 = os.path.join(script_dir, "data", os.path.basename(path))
    if os.path.exists(candidate1):
        return candidate1
    candidate2 = os.path.join(script_dir, path)
    if os.path.exists(candidate2):
        return candidate2
    return path


def initialize_vector_db():
    """
    Initializes a local ChromaDB client and chunks/embeds ASHRAE 55, IECC 2021, and ASHRAE 90.1-2019 PDF documents.
    Uses PersistentClient to cache vector index on disk.
    """
    global _collection
    persist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "chroma_db")
    os.makedirs(persist_dir, exist_ok=True)
    client = chromadb.PersistentClient(path=persist_dir)
    
    collection = client.get_or_create_collection(name="energy_codes")
    
    if collection.count() > 0:
        logger.info(f"ChromaDB already seeded ({collection.count()} chunks). Skipping re-seed.")
        _collection = collection
        return _collection

    ashrae55_path = _resolve_pdf_path("backend/data/ASHRAE-Standard-55.pdf")
    iecc_path = _resolve_pdf_path("backend/data/IECC 2021.pdf")
    ashrae901_path = _resolve_pdf_path("backend/data/ASHRAE 90.1-2019.pdf")

    documents = []
    ids = []
    metadatas = []

    ashrae55_count = 0
    iecc_count = 0
    ashrae901_count = 0

    if PyPDFLoader is not None and RecursiveCharacterTextSplitter is not None:
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

        # 1. Load & chunk ASHRAE 55
        if os.path.exists(ashrae55_path):
            try:
                loader = PyPDFLoader(ashrae55_path)
                docs = loader.load()[:15]
                chunks = splitter.split_documents(docs)[:20]
                for i, chunk in enumerate(chunks):
                    documents.append(chunk.page_content)
                    ids.append(f"ashrae55_chunk_{i}")
                    metadatas.append({"source": "ASHRAE-55-2023", "topic": "Thermal Comfort"})
                ashrae55_count = len(chunks)
            except Exception as e:
                logger.warning(f"Error parsing ASHRAE 55 PDF: {e}")

        # 2. Load & chunk IECC 2021
        if os.path.exists(iecc_path):
            try:
                loader = PyPDFLoader(iecc_path)
                docs = loader.load()[:15]
                chunks = splitter.split_documents(docs)[:20]
                for i, chunk in enumerate(chunks):
                    documents.append(chunk.page_content)
                    ids.append(f"iecc_chunk_{i}")
                    metadatas.append({"source": "IECC-2021", "topic": "Building Envelope & Energy Conservation"})
                iecc_count = len(chunks)
            except Exception as e:
                logger.warning(f"Error parsing IECC 2021 PDF: {e}")

        # 3. Load & chunk ASHRAE 90.1-2019
        if os.path.exists(ashrae901_path):
            try:
                loader = PyPDFLoader(ashrae901_path)
                docs = loader.load()[:15]
                chunks = splitter.split_documents(docs)[:20]
                for i, chunk in enumerate(chunks):
                    documents.append(chunk.page_content)
                    ids.append(f"ashrae901_chunk_{i}")
                    metadatas.append({"source": "ASHRAE-90.1-2019", "topic": "Energy Standard for Commercial Buildings"})
                ashrae901_count = len(chunks)
            except Exception as e:
                logger.warning(f"Error parsing ASHRAE 90.1 PDF: {e}")

    # Fallback baseline chunks
    if not documents:
        documents = [
            "ASHRAE 55 Standard: The acceptable summer operative temperature range for building occupants wearing 0.5 clo is 73°F to 79°F. Temperatures above 79°F require mechanical pre-cooling.",
            "IECC Building Envelope Code: In extreme heat climate zones, continuous insulation (ci) and strict U-factor compliance are mandatory to prevent thermal bridging during heat spikes.",
            "ASHRAE 90.1 Energy Standard: Commercial building mechanical systems and envelope components must modulate HVAC power and minimize conductive heat gains during peak thermal loads."
        ]
        ids = ["ashrae55_chunk_0", "iecc_chunk_0", "ashrae901_chunk_0"]
        metadatas = [
            {"source": "ASHRAE-55-2023", "topic": "Thermal Comfort"},
            {"source": "IECC-2021", "topic": "Building Envelope & Energy Conservation"},
            {"source": "ASHRAE-90.1-2019", "topic": "Energy Standard for Commercial Buildings"}
        ]
        ashrae55_count = 1
        iecc_count = 1
        ashrae901_count = 1

    batch_size = 500
    for idx in range(0, len(documents), batch_size):
        collection.add(
            documents=documents[idx:idx + batch_size],
            ids=ids[idx:idx + batch_size],
            metadatas=metadatas[idx:idx + batch_size]
        )

    logger.info(f"Seeded {ashrae55_count} ashrae55 chunks, {iecc_count} iecc chunks, {ashrae901_count} ashrae901 chunks. Total: {len(documents)}")
    _collection = collection
    return _collection


def _clean_schema_for_gemini(schema_dict):
    """Strips 'title' metadata from JSON schema to eliminate Gemini API schema conversion warnings."""
    if isinstance(schema_dict, dict):
        return {k: _clean_schema_for_gemini(v) for k, v in schema_dict.items() if k != "title"}
    elif isinstance(schema_dict, list):
        return [_clean_schema_for_gemini(item) for item in schema_dict]
    return schema_dict


def dispatch_n8n_audit(report: ComplianceReport, webhook_url: Optional[str] = None) -> bool:
    """
    Dispatches the RAG compliance audit to the n8n webhook.
    Maintains exact n8n JSON schema contract.
    """
    target_url = webhook_url or N8N_AUDIT_WEBHOOK_URL

    compliance_summary = f"{report.ashrae_compliance_status} | {report.iecc_envelope_warning}"
    action_items = [
        report.recommended_hvac_action,
        f"Verify IECC continuous insulation (ci) and U-factor integrity for {report.city} envelope zone.",
        f"Maintain operative temperature setpoint below 79°F per ASHRAE 55 standards."
    ]

    payload = {
        "agent": "Agent 1 (Urban Heat & Energy Compliance Analyst)",
        "city": str(report.city),
        "temperature_f": int(report.temperature_f),
        "ashrae_compliance_status": str(report.ashrae_compliance_status),
        "iecc_envelope_warning": str(report.iecc_envelope_warning),
        "recommended_hvac_action": str(report.recommended_hvac_action),
        "compliance_summary": compliance_summary,
        "action_items": action_items,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    try:
        response = requests.post(target_url, json=payload, timeout=5.0)
        if 200 <= response.status_code < 300:
            logger.info("🚀 Agent 1 n8n compliance audit dispatched successfully to %s", target_url)
            return True
        else:
            logger.warning("Agent 1 n8n dispatch returned status %s: %s", response.status_code, response.text[:100])
    except Exception as e:
        logger.info("Agent 1 n8n webhook dispatch attempted for %s (%s)", report.city, e)
        return False

    return False


def run_compliance_audit(city: str, temp_f: int) -> ComplianceReport:
    """
    Executes Agent 1 RAG pipeline powered by FortyGuard Microclimate Telemetry:
    1. Fetches FortyGuard environmental parameters, solar GHI, and satellite land-cover metrics.
    2. Queries local ChromaDB for relevant building/energy codes (ASHRAE 55, IECC).
    3. Prompts ChatGoogleGenerativeAI with RAG context and FortyGuard parameters.
    4. Dispatches the full Pydantic report to the n8n webhook.
    """
    # 1. Ingest FortyGuard real microclimate & satellite land cover data
    env_snapshot = fortyguard_client.get_live_telemetry_snapshot(city=city, temp_f=float(temp_f))
    sat_data = fortyguard_client.get_satellite_segmentation(city=city)
    
    surface_temp_f = env_snapshot.get("surface_temperature_f", float(temp_f) + 12.0)
    solar_ghi = env_snapshot.get("solar_irradiance_ghi", 580.0)
    building_pct = sat_data.get("segmentation", {}).get("material_fractions", {}).get("impervious_building_pct", 40.0)

    collection = _collection if _collection is not None else initialize_vector_db()
    
    # Query ChromaDB for relevant standards
    query_text = (
        f"Building energy code compliance for {city} ambient {temp_f}°F, "
        f"FortyGuard surface temperature {surface_temp_f}°F, solar GHI {solar_ghi} W/m2, "
        f"impervious building envelope {building_pct}%."
    )
    query_results = collection.query(
        query_texts=[query_text],
        n_results=2
    )
    
    retrieved_docs = query_results.get("documents", [[]])[0]
    context_str = "\n\n".join(retrieved_docs)
    
    api_key = os.getenv("GEMINI_API_KEY")

    if api_key and api_key != "insert_your_actual_key_here" and api_key != "mock_key":
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-flash-latest",
                google_api_key=api_key,
                temperature=0.2,
                timeout=10,
                max_retries=1,
            )

            clean_schema = _clean_schema_for_gemini(ComplianceReport.model_json_schema())
            structured_llm = llm.with_structured_output(clean_schema)

            prompt = ChatPromptTemplate.from_messages([
                (
                    "system",
                    "You are the Urban Heat & Energy Compliance Analyst (Agent 1) for ThermalOS. "
                    "Evaluate city temperature and FortyGuard microclimate telemetry (surface temperature, "
                    "solar irradiance, building material fractions) against retrieved ASHRAE 55 and IECC energy codes. "
                    "Context documents:\n{context}\n\n"
                    "FortyGuard Ground-Truth Telemetry:\n"
                    f"- Ambient Air Temp: {temp_f}°F\n"
                    f"- FortyGuard Surface Temp: {surface_temp_f}°F\n"
                    f"- Solar GHI: {solar_ghi} W/m²\n"
                    f"- Building Impervious Fraction: {building_pct}%\n\n"
                    "Provide a strict engineering compliance assessment."
                ),
                (
                    "human",
                    "Conduct energy and thermal comfort compliance audit for {city} currently registering {temp_f}°F."
                )
            ])

            chain = prompt | structured_llm
            raw_result = chain.invoke({
                "context": context_str,
                "city": city,
                "temp_f": temp_f
            })

            if isinstance(raw_result, dict):
                result = ComplianceReport(**raw_result)
            elif isinstance(raw_result, ComplianceReport):
                result = raw_result
            else:
                result = ComplianceReport.model_validate(raw_result)

            logger.info("Agent 1: Gemini RAG inference succeeded for %s (%s°F).", city, temp_f)
            dispatch_n8n_audit(result)
            return result
        except Exception as e:
            logger.warning(
                "Agent 1: Gemini inference failed (%s). Falling back to DETERMINISTIC FortyGuard compliance engine.",
                e,
            )
    else:
        logger.info(
            "Agent 1: GEMINI_API_KEY not configured. Using DETERMINISTIC FortyGuard compliance engine for %s (%s°F).",
            city,
            temp_f,
        )

    # Deterministic FortyGuard engineering evaluation
    is_exceeded = temp_f > 79
    status = (
        f"EXCEEDS LIMIT: Temperature of {temp_f}°F (FortyGuard Surface {surface_temp_f:.1f}°F) exceeds ASHRAE 55 summer operative upper limit of 79°F (0.5 clo)."
        if is_exceeded
        else f"WITHIN LIMIT: Temperature of {temp_f}°F is within ASHRAE 55 summer comfort range (73°F-79°F)."
    )
    
    envelope_warning = (
        f"CRITICAL ENVELOPE STRESS: {city} at {temp_f}°F with FortyGuard solar radiation of {solar_ghi} W/m² triggers mandatory IECC continuous insulation (ci) verification."
        if temp_f >= 100 or solar_ghi > 600.0
        else f"IECC STANDARD: Verify continuous insulation (ci) and U-factor integrity for {city} climate zone ({building_pct:.1f}% building fraction)."
    )
    
    hvac_action = (
        f"IMMEDIATE PRE-COOLING: Deploy stage-3 mechanical pre-cooling and cycle chiller loops to mitigate {temp_f}°F thermal peak."
        if temp_f >= 105 or surface_temp_f >= 115
        else f"MODULATED COOLING: Activate stage-1 economizer and variable refrigerant flow to maintain occupant setpoints below 79°F."
        if temp_f > 79
        else "STANDARD BASELINE: Maintain standard HVAC ventilation schedule."
    )
    
    fallback_report = ComplianceReport(
        city=city,
        temperature_f=temp_f,
        ashrae_compliance_status=status,
        iecc_envelope_warning=envelope_warning,
        recommended_hvac_action=hvac_action
    )
    dispatch_n8n_audit(fallback_report)
    return fallback_report


try:
    initialize_vector_db()
except Exception as _init_err:  # noqa: BLE001
    logger.warning("Agent 1: deferred vector DB initialization (%s).", _init_err)
