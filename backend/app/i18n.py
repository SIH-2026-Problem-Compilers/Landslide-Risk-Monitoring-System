"""Multilingual notification templates for North East India early warnings.

Templates are keyed by severity + language. When the evaluate engine creates
an alert, it stores the message in all supported languages so the frontend
or an SMS gateway can pick the right one based on subscriber preference.
"""
from __future__ import annotations

SUPPORTED_LANGUAGES = ["en", "hi", "as", "bn", "mni"]  # English, Hindi, Assamese, Bengali, Meiteilon
DEFAULT_LANGUAGE = "en"

# Templates: severity -> lang -> "{title}" / "{message}" placeholders
_TEMPLATES: dict[str, dict[str, dict[str, str]]] = {
    "emergency": {
        "en": {
            "title": "EMERGENCY: Severe Landslide Risk — {district}",
            "message": (
                "URGENT: LHASA estimates {probability} landslide probability in "
                "{zone_name}. Evacuation readiness for {district}. "
                "Contact district disaster management immediately."
            ),
        },
        "hi": {
            "title": "आपातकाल: गंभीर भूस्खलन जोखिम — {district}",
            "message": (
                "अत्यावश्यक: LHASA के अनुसार {zone_name} में {probability} "
                "भूस्खलन की संभावना है। {district} में निकासी की तैयारी करें। "
                "तुरंत जिला आपदा प्रबंधन से संपर्क करें।"
            ),
        },
        "as": {
            "title": "জৰুৰী: গুৰুতৰ ভূমধৰা বিপদ — {district}",
            "message": (
                "তাৎক্ষণিক: LHASA ৰ অনুসৰণে {zone_name}ত {probability} "
                "ভূমধৰাৰ সম্ভাবনা আছে। {district}ত উদ্ধাৰৰ প্ৰস্তুতি কৰক। "
                "তুৰিতে জিলা দুৰ্ঘটনা ব্যৱস্থাপনাৰ লগত সংযোগ কৰক।"
            ),
        },
        "bn": {
            "title": "জরুরি: তীব্র ভূমিধসংকট — {district}",
            "message": (
                "জরুরি: LHASA অনুযায়ী {zone_name} এ {probability} "
                "ভূমিধসংকটের সম্ভাবনা। {district} এ অপসারণের প্রস্তুতি নিন।"
            ),
        },
        "mni": {
            "title": "চাংশিদা: Lamsinba toudaba — {district}",
            "message": (
                "Toubakna: LHASA mathil {zone_name} da {probability} "
                "lamsinba ipa. {district} da thikna khangban Mathfam."
            ),
        },
    },
    "critical": {
        "en": {
            "title": "HIGH RISK: Landslide Alert — {district}",
            "message": (
                "High landslide risk detected in {zone_name} ({probability}). "
                "Increase monitoring and alert communities."
            ),
        },
        "hi": {
            "title": "उच्च जोखिम: भूस्खलन चेतावनी — {district}",
            "message": (
                "{zone_name} में भूस्खलन का उच्च जोखिम ({probability})। "
                "निगरानी बढ़ाएं और समुदायों को सचेत करें।"
            ),
        },
        "as": {
            "title": "উচ্চ বিপদ: ভূমধৰা সতৰ্কীকৰণ — {district}",
            "message": (
                "{zone_name}ত ভূমধৰাৰ উচ্চ বিপদ ({probability})। "
                "নিৰীক্ষণ বৃদ্ধি কৰক আৰু সমূহক সতৰ্ক কৰক।"
            ),
        },
        "bn": {
            "title": "উচ্চঝুঁকি: ভূমিধসংকট সতর্কতা — {district}",
            "message": (
                "{zone_name} এ ভূমিধসংকটের উচ্চঝুঁকি ({probability})। "
                "পর্যবেক্ষণ বৃদ্ধি করুন।"
            ),
        },
        "mni": {
            "title": "Yengamna: Lamsinba lehleiba — {district}",
            "message": (
                "{zone_name} da lamsinba yengamna ipa ({probability}). "
                "Nongshong thamkhi."
            ),
        },
    },
}


def get_alert_content(
    severity: str,
    zone_name: str,
    district: str,
    probability: str,
) -> dict[str, dict[str, str]]:
    """Return {lang: {title, message}} for all supported languages."""
    templates = _TEMPLATES.get(severity, _TEMPLATES.get("critical", {}))
    results: dict[str, dict[str, str]] = {}
    for lang in SUPPORTED_LANGUAGES:
        tpl = templates.get(lang, templates.get(DEFAULT_LANGUAGE, {}))
        results[lang] = {
            "title": tpl.get("title", "").format(
                district=district, zone_name=zone_name, probability=probability
            ),
            "message": tpl.get("message", "").format(
                district=district, zone_name=zone_name, probability=probability
            ),
        }
    return results
