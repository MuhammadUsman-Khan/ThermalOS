import os
import logging
from dotenv import load_dotenv
import chromadb
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

try:
    from langchain_community.document_loaders import PyPDFLoader
except ImportError:
    PyPDFLoader = None

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        RecursiveCharacterTextSplitter = None

load_dotenv()

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
    """
    global _collection
    client = chromadb.Client()
    
    collection = client.get_or_create_collection(name="energy_codes")
    
    # Idempotency Guard: If collection already seeded, skip
    if collection.count() > 0:
        print("ChromaDB already seeded. Skipping.")
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
                docs = loader.load()
                chunks = splitter.split_documents(docs)
                for i, chunk in enumerate(chunks):
                    documents.append(chunk.page_content)
                    ids.append(f"ashrae55_chunk_{i}")
                    metadatas.append({"source": "ASHRAE-55-2023", "topic": "Thermal Comfort"})
                ashrae55_count = len(chunks)
            except Exception as e:
                print(f"WARNING: Error parsing ASHRAE 55 PDF: {e}")
        else:
            print(f"WARNING: PDF file not found at '{ashrae55_path}'")

        # 2. Load & chunk IECC 2021
        if os.path.exists(iecc_path):
            try:
                loader = PyPDFLoader(iecc_path)
                docs = loader.load()
                chunks = splitter.split_documents(docs)
                for i, chunk in enumerate(chunks):
                    documents.append(chunk.page_content)
                    ids.append(f"iecc_chunk_{i}")
                    metadatas.append({"source": "IECC-2021", "topic": "Building Envelope & Energy Conservation"})
                iecc_count = len(chunks)
            except Exception as e:
                print(f"WARNING: Error parsing IECC 2021 PDF: {e}")
        else:
            print(f"WARNING: PDF file not found at '{iecc_path}'")

        # 3. Load & chunk ASHRAE 90.1-2019
        if os.path.exists(ashrae901_path):
            try:
                loader = PyPDFLoader(ashrae901_path)
                docs = loader.load()
                chunks = splitter.split_documents(docs)
                for i, chunk in enumerate(chunks):
                    documents.append(chunk.page_content)
                    ids.append(f"ashrae901_chunk_{i}")
                    metadatas.append({"source": "ASHRAE-90.1-2019", "topic": "Energy Standard for Commercial Buildings"})
                ashrae901_count = len(chunks)
            except Exception as e:
                print(f"WARNING: Error parsing ASHRAE 90.1 PDF: {e}")
        else:
            print(f"WARNING: PDF file not found at '{ashrae901_path}'")

    # Graceful Fallback if no documents loaded
    if not documents:
        print("WARNING: Falling back to default baseline chunks.")
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

    # Add all chunks to ChromaDB in safe batches
    batch_size = 500
    for idx in range(0, len(documents), batch_size):
        collection.add(
            documents=documents[idx:idx + batch_size],
            ids=ids[idx:idx + batch_size],
            metadatas=metadatas[idx:idx + batch_size]
        )

    total_count = len(documents)
    print(f"Seeded {ashrae55_count} ashrae55 chunks, {iecc_count} iecc chunks, {ashrae901_count} ashrae901 chunks. Total: {total_count}")

    _collection = collection
    return _collection


def run_compliance_audit(city: str, temp_f: int) -> ComplianceReport:
    """
    Executes the Agent 1 RAG pipeline:
    1. Queries local ChromaDB for relevant building/energy codes.
    2. Invokes ChatGoogleGenerativeAI with LCEL and structured output using GEMINI_API_KEY from environment.
    """
    collection = _collection if _collection is not None else initialize_vector_db()
    
    # Query ChromaDB for relevant standards
    query_text = f"Building energy code compliance for {city} experiencing ambient temperature of {temp_f}°F"
    query_results = collection.query(
        query_texts=[query_text],
        n_results=2
    )
    
    retrieved_docs = query_results.get("documents", [[]])[0]
    context_str = "\n\n".join(retrieved_docs)
    
    # Resolve Gemini API Key from environment
    api_key = os.getenv("GEMINI_API_KEY")

    if api_key and api_key != "insert_your_actual_key_here" and api_key != "mock_key":
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-3.5-flash",
                google_api_key=api_key,
                temperature=0.2,
            )

            structured_llm = llm.with_structured_output(ComplianceReport)

            prompt = ChatPromptTemplate.from_messages([
                (
                    "system",
                    "You are the Urban Heat & Energy Compliance Analyst (Agent 1) for ThermalOS. "
                    "Evaluate city temperature telemetry against retrieved ASHRAE 55 and IECC energy codes. "
                    "Context documents:\n{context}\n\n"
                    "Provide a strict engineering compliance assessment."
                ),
                (
                    "human",
                    "Conduct energy and thermal comfort compliance audit for {city} currently registering {temp_f}°F."
                )
            ])

            chain = prompt | structured_llm
            result: ComplianceReport = chain.invoke({
                "context": context_str,
                "city": city,
                "temp_f": temp_f
            })
            logger.info("Agent 1: Gemini RAG inference succeeded for %s (%s°F).", city, temp_f)
            return result
        except Exception as e:
            logger.warning(
                "Agent 1: Gemini inference failed (%s). Falling back to DETERMINISTIC compliance engine.",
                e,
            )
    else:
        logger.warning(
            "Agent 1: GEMINI_API_KEY not configured. Using DETERMINISTIC compliance engine for %s (%s°F).",
            city,
            temp_f,
        )

    # Fallback rule evaluation strictly adhering to ASHRAE 55 and IECC chunks
    is_exceeded = temp_f > 79
    status = (
        f"EXCEEDS LIMIT: Temperature of {temp_f}°F exceeds ASHRAE 55 summer operative upper limit of 79°F (0.5 clo)."
        if is_exceeded
        else f"WITHIN LIMIT: Temperature of {temp_f}°F is within ASHRAE 55 summer comfort range (73°F-79°F)."
    )
    
    envelope_warning = (
        f"CRITICAL ENVELOPE STRESS: {city} at {temp_f}°F triggers mandatory IECC continuous insulation (ci) verification to prevent severe thermal bridging."
        if temp_f >= 100
        else f"IECC STANDARD: Verify continuous insulation (ci) and U-factor integrity for {city} climate zone."
    )
    
    hvac_action = (
        f"IMMEDIATE PRE-COOLING: Deploy stage-3 mechanical pre-cooling and cycle chiller loops to mitigate {temp_f}°F heat spike."
        if temp_f >= 105
        else f"MODULATED COOLING: Activate stage-1 economizer and variable refrigerant flow to maintain occupant setpoints below 79°F."
        if temp_f > 79
        else "STANDARD BASELINE: Maintain standard HVAC ventilation schedule."
    )
    
    return ComplianceReport(
        city=city,
        temperature_f=temp_f,
        ashrae_compliance_status=status,
        iecc_envelope_warning=envelope_warning,
        recommended_hvac_action=hvac_action
    )


# Pre-initialize vector DB on module import
initialize_vector_db()
