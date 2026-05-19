from . import db


def tokens_configured() -> dict[str, bool]:
    return {"bale": bool(db.get_token("bale")), "rubika": bool(db.get_token("rubika"))}


def any_token_configured() -> bool:
    return bool(db.get_token("bale") or db.get_token("rubika"))
