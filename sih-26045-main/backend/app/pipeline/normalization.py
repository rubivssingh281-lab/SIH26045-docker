import re

ALIAS_DICTIONARY = {
    "tulsi": "ocimum sanctum",
    "holy basil": "ocimum sanctum",
    "neem": "azadirachta indica",
    "ashwagandha": "withania somnifera",
    "haldi": "curcuma longa",
    "turmeric": "curcuma longa",
    "amla": "phyllanthus emblica",
    "indian gooseberry": "phyllanthus emblica",
    "brahmi": "bacopa monnieri",
    "giloy": "tinospora cordifolia",
    "guduchi": "tinospora cordifolia",
    "aloe": "aloe vera",
    "aloe vera": "aloe vera"
}

def normalize_text(value: str) -> str:
    """
    Normalizes text by lowercasing, removing extra whitespace, 
    stripping out unnecessary special characters, and mapping known aliases.
    """
    if not value:
        return ""
    
    # Lowercase and strip
    val = value.lower().strip()
    
    # Remove special characters except common punctuation (.,:;!?'"()[-])
    val = re.sub(r'[^\w\s.,:;!?\'"()\[\]-]', '', val)
    
    # Replace multiple whitespace characters with a single space
    val = re.sub(r'\s+', ' ', val)
    val = val.strip()
    
    # Map through alias dictionary if an exact match exists
    if val in ALIAS_DICTIONARY:
        val = ALIAS_DICTIONARY[val]
        
    return val
