from datetime import datetime

from flask import jsonify, request

from utils.db import get_connection


VALID_CATEGORIES = {"行测", "申论", "时政", "面试资料"}


def _normalize_category(value):
    return value if value in VALID_CATEGORIES else "行测"


def register(app):
    @app.route("/api/resources", methods=["GET"])
    def get_resources():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, author, category, content, image_data, time
            FROM resources
            ORDER BY id DESC
            """
        )
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({"code": 200, "data": rows})

    @app.route("/api/resources", methods=["POST"])
    def create_resource():
        payload = request.get_json(silent=True) or {}
        content = (payload.get("content") or "").strip()
        image_data = payload.get("image_data") or ""
        author = (payload.get("author") or "热心考友").strip()
        category = _normalize_category((payload.get("category") or "").strip())
        if not content and not image_data:
            return jsonify({"code": 400, "msg": "资料内容或图片不能都为空"})

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO resources (author, category, content, image_data, time)
            VALUES (?, ?, ?, ?, ?)
            """,
            (author, category, content, image_data, datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        )
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "msg": "分享成功"})

    @app.route("/api/resources/<int:resource_id>", methods=["DELETE"])
    def delete_resource(resource_id):
        payload = request.get_json(silent=True) or {}
        current_user = (payload.get("current_user") or request.args.get("author") or "").strip()
        role = (payload.get("role") or request.args.get("role") or "guest").strip()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT author FROM resources WHERE id = ?", (resource_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"code": 404, "msg": "资料不存在"})

        if role != "admin" and row["author"] != current_user:
            conn.close()
            return jsonify({"code": 403, "msg": "无权限删除该资料"})

        cursor.execute("DELETE FROM resources WHERE id = ?", (resource_id,))
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "msg": "删除成功"})
