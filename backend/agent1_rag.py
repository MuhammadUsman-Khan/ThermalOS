import os
from dotenv import load_dotenv
import chromadb
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()


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


def initialize_vector_db():
    """
    Initializes a local ChromaDB client and adds ASHRAE 55 & IECC building code standards.
    """
    global _collection
    client = chromadb.Client()
    
    collection = client.get_or_create_collection(name="energy_codes")
    
    if collection.count() == 0:
        documents = [
            "ASHRAE 55 Standard: The acceptable summer operative temperature range for building occupants wearing 0.5 clo is 73°F to 79°F. Temperatures above 79°F require mechanical pre-cooling.",
            "IECC Building Envelope Code: In extreme heat climate zones, continuous insulation (ci) and strict U-factor compliance are mandatory to prevent thermal bridging during heat spikes."
        ]
        ids = ["chunk_ashrae_55", "chunk_iecc_envelope"]
        metadatas = [
            {"source": "ASHRAE-55-2023", "topic": "Thermal Comfort"},
            {"source": "IECC-2024", "topic": "Building Envelope & Insulation"}
        ]
        collection.add(
            documents=documents,
            ids=ids,
            metadatas=metadatas
        )
    
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
                model="gemini-1.5-flash",
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
            return result
        except Exception as e:
            print(f"Gemini API invocation error: {e}. Falling back to deterministic code evaluation.")
    
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
