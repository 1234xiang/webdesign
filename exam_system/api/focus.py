from flask import jsonify


def register(app):
    @app.route("/api/focus", methods=["GET"])
    def get_focus():
        return jsonify({"code": 200, "data": {"today_focus_minutes": 0}})
