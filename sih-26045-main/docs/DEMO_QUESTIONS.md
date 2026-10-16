# Sahayak AI — Demo Questions (guaranteed answers)

The chatbot has an **Ayurveda gatekeeper**: any message containing an Ayurveda/IP domain
term (a herb name, `ayurveda`, `formulation`, `patent`, `TKDL`, `ABS`, `dosha`, etc.) is
instantly routed to the RAG + phi3 answer path. Every question below contains such a term,
so it will **always get a full LLM answer** (not a greeting or an off-topic redirect).

## General Ayurveda
- What are the three **doshas** in **Ayurveda** and how do they differ?
- How can I balance **Vata dosha** through diet and lifestyle?
- What **Ayurvedic** remedies are traditionally used for better digestion?
- Which **herbs** are considered good for immunity in **Ayurveda**?
- What is the **Ayurvedic** view on managing stress naturally?

## Herb / formulation specific
- Is **turmeric** (curcuma longa) useful for inflammation in **Ayurveda**?
- What are the traditional uses of **Ashwagandha** (Withania somnifera)?
- Can **Triphala** help with constipation, and how is it prepared?
- What is **neem** (Azadirachta indica) traditionally used for?
- How is a classical **decoction** (kashaya) **formulation** prepared?
- What are the benefits of **Giloy** (Guduchi) as an **Ayurvedic** herb?

## IP & patentability
- Is a modified **Ashwagandha formulation patentable** in India?
- What makes an **Ayurvedic formulation novel** enough for a **patent**?
- Does the Section 3(p) **patent** bar apply to **traditional knowledge** formulations?
- Can I get a **trademark** or **GI** for an **Ayurvedic** product?
- What **intellectual property** options exist for a new herbal **formulation**?

## TKDL / prior art
- Is there **TKDL prior art** for a **turmeric**-based preparation?
- How does **TKDL** affect the **patentability** of a classical **formulation**?
- What is **prior art** and why does it matter for **Ayurvedic** medicines?
- How can I check if my **formulation** is already documented **traditional knowledge**?

## ABS / biodiversity
- What **ABS** (access-and-benefit-sharing) obligations apply to a **formulation** using **neem**?
- When does using a **biological resource** trigger **biodiversity** approval?
- What are the **ABS** rules for commercially selling an **Ayurvedic** product?

## Regulatory pathway
- What **regulatory** pathway applies to an **AYUSH** herbal **supplement**?
- Are **therapeutic claims** allowed on an **Ayurvedic** product label?
- Which **licence** is needed to manufacture an **Ayurvedic drug** in India?

---

### Tips
- Include at least one term: a herb name (ashwagandha, neem, turmeric, tulsi, amla, giloy…),
  or `ayurveda / formulation / dosha / herb / patent / TKDL / prior art / ABS / biodiversity /
  regulatory / AYUSH / drug`.
- Pure greetings ("hi", "thanks") get a short greeting; off-topic questions (weather, cricket,
  ibuprofen dose) get a polite redirect.
- On CPU each answer takes ~30–60s (local phi3); formulation questions cite retrieved TKDL records.
