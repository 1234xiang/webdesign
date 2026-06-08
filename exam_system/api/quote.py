import random

from flask import jsonify


QUOTES = [
    {"content": "千淘万漉虽辛苦，吹尽狂沙始到金。", "author": "刘禹锡"},
    {"content": "路虽远，行则将至。", "author": "荀子"},
    {"content": "积力之所举，则无不胜也。", "author": "贾谊"},
    {"content": "功不唐捐，玉汝于成。", "author": "《法华经》"},
]


def register(app):
    @app.route("/api/quotes", methods=["GET"])
    def get_quote():
        return jsonify({"code": 200, "data": random.choice(QUOTES)})
