"""
nlp_engine.py — Phase 2: ATS Score Engine + Keyword Analyzer
Extracts keywords from the JD using spaCy, compares against resume text,
and computes a multi-dimensional ATS match score.
"""

import re
import math
from typing import TypedDict

# ── spaCy lazy-load ────────────────────────────────────────────────────────────
_nlp = None

def _get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            # Model not downloaded yet — pull it at runtime
            import subprocess, sys
            subprocess.run(
                [sys.executable, "-m", "spacy", "download", "en_core_web_sm"],
                check=True
            )
            _nlp = spacy.load("en_core_web_sm")
    return _nlp


# ── Skill vocabulary for boost scoring ────────────────────────────────────────
TECH_SKILLS = {
    # Languages
    "python","java","javascript","typescript","c++","c#","go","rust","kotlin",
    "swift","r","scala","ruby","php","bash","sql","html","css",
    # Frameworks / Libs
    "flask","django","fastapi","react","angular","vue","node","express","spring",
    "tensorflow","pytorch","keras","sklearn","scikit-learn","numpy","pandas",
    "matplotlib","seaborn","huggingface","transformers","langchain","openai",
    # Data / ML / AI
    "machine learning","deep learning","nlp","computer vision","llm","rag",
    "fine-tuning","reinforcement learning","feature engineering","data science",
    "neural network","random forest","xgboost","gradient boosting","clustering",
    # Cloud / DevOps
    "aws","gcp","azure","docker","kubernetes","terraform","ci/cd","github actions",
    "jenkins","ansible","linux","git","mlflow","airflow","spark","kafka",
    # Databases
    "postgresql","mysql","mongodb","redis","elasticsearch","sqlite","bigquery",
    # General
    "restful","api","microservices","agile","scrum","object-oriented","oop",
}


def _normalize(text: str) -> str:
    return text.lower().strip()


def _tokenize_keywords(text: str) -> list[str]:
    """Extract meaningful 1-gram and 2-gram tokens (no stopwords, no punct)."""
    nlp = _get_nlp()
    doc = nlp(text)

    tokens = []
    clean = []
    for tok in doc:
        if not tok.is_stop and not tok.is_punct and tok.is_alpha and len(tok.text) > 2:
            clean.append(tok.lemma_.lower())
            tokens.append(tok.lemma_.lower())

    # Add 2-grams for compound tech terms (e.g. "machine learning")
    for i in range(len(clean) - 1):
        bigram = f"{clean[i]} {clean[i+1]}"
        tokens.append(bigram)

    return tokens


def extract_jd_keywords(jd_text: str) -> dict:
    """
    Returns:
        {
          "all_keywords": [...],       # deduplicated, sorted by frequency
          "tech_keywords": [...],      # subset matching TECH_SKILLS vocab
          "soft_keywords": [...],      # everything else
        }
    """
    tokens = _tokenize_keywords(jd_text)

    # Frequency map
    freq: dict[str, int] = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1

    # Deduplicated sorted by frequency desc
    all_kw = sorted(freq.keys(), key=lambda k: -freq[k])

    tech_kw = [k for k in all_kw if k in TECH_SKILLS]
    soft_kw = [k for k in all_kw if k not in TECH_SKILLS]

    return {
        "all_keywords": all_kw[:60],      # top 60 to keep payload sane
        "tech_keywords": tech_kw[:30],
        "soft_keywords": soft_kw[:30],
        "freq": freq,
    }


def compute_ats_score(
    jd_text: str,
    resume_text: str,
    matched_skills: list[str],
    missing_skills: list[str],
) -> dict:
    """
    Returns a score dict:
    {
      "ats_score": int 0-100,
      "keyword_coverage": int 0-100,
      "skills_match": int 0-100,
      "experience_relevance": int 0-100,
      "keyword_hits": [...],    # JD keywords found in resume
      "keyword_misses": [...],  # JD keywords NOT in resume
    }
    """
    jd_kw_data  = extract_jd_keywords(jd_text)
    all_jd_kw   = jd_kw_data["all_keywords"]
    tech_jd_kw  = jd_kw_data["tech_keywords"]

    resume_lower = _normalize(resume_text)
    resume_tokens = set(_tokenize_keywords(resume_text))

    # ── 1. Keyword Coverage (40% weight) ─────────────────────────────────────
    hits   = [kw for kw in all_jd_kw if kw in resume_lower or kw in resume_tokens]
    misses = [kw for kw in all_jd_kw if kw not in hits]
    kw_coverage = round(len(hits) / max(len(all_jd_kw), 1) * 100)

    # ── 2. Skills Match (40% weight) ─────────────────────────────────────────
    total_skills = len(matched_skills) + len(missing_skills)
    skills_match = round(len(matched_skills) / max(total_skills, 1) * 100)

    # ── 3. Experience Relevance (20% weight) ─────────────────────────────────
    # Approximated: how many tech JD keywords appear in resume
    tech_hits = [kw for kw in tech_jd_kw if kw in resume_lower or kw in resume_tokens]
    exp_relevance = round(len(tech_hits) / max(len(tech_jd_kw), 1) * 100) if tech_jd_kw else 75

    # ── Weighted composite ────────────────────────────────────────────────────
    ats_score = round(
        kw_coverage   * 0.40 +
        skills_match  * 0.40 +
        exp_relevance * 0.20
    )
    ats_score = max(0, min(100, ats_score))  # clamp

    return {
        "ats_score":           ats_score,
        "keyword_coverage":    kw_coverage,
        "skills_match":        skills_match,
        "experience_relevance": exp_relevance,
        "keyword_hits":        hits[:25],
        "keyword_misses":      misses[:25],
    }
