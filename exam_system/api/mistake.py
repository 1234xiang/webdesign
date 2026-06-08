from datetime import datetime

from flask import jsonify, request

from utils.db import get_connection


def _parse_analysis(analysis):
    module = ""
    difficulty = "中等"

    if "[模块:" in analysis:
        try:
            module = analysis.split("[模块:", 1)[1].split("]", 1)[0].strip()
        except Exception:
            module = ""
    if "[难度:" in analysis:
        try:
            difficulty = analysis.split("[难度:", 1)[1].split("]", 1)[0].strip()
        except Exception:
            difficulty = "中等"
    return module, difficulty


def _normalize_mastery(value):
    return value if value in ("未掌握", "复习中", "已掌握") else "未掌握"


def register(app):
    @app.route("/api/mistakes", methods=["GET"])
    def get_mistakes():
        conn = get_connection()
        cursor = conn.cursor()
        author = request.args.get("author", "").strip()

        sql = """
            SELECT id, subject, module, content, difficulty, image, image_data,
                   analysis, tags, mastery, author, time
            FROM wrong_questions
        """
        params = ()
        if author:
            sql += " WHERE author = ?"
            params = (author,)
        sql += " ORDER BY id DESC"

        cursor.execute(sql, params)
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({"code": 200, "data": rows})

    @app.route("/api/mistakes", methods=["POST"])
    def create_mistake():
        payload = request.get_json(silent=True) or {}
        content = (payload.get("content") or "").strip()
        image_data = payload.get("image_data") or ""
        if not content and not image_data:
            return jsonify({"code": 400, "msg": "题目内容和图片不能都为空"})

        subject = (payload.get("subject") or "行测").strip()
        analysis = (payload.get("analysis") or "").strip()
        author = (payload.get("author") or "热心考友").strip()
        tags = (payload.get("tags") or "").strip()
        mastery = _normalize_mastery((payload.get("mastery") or "").strip())
        module, difficulty = _parse_analysis(analysis)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO wrong_questions
                (subject, module, content, difficulty, image_data, analysis, tags, mastery, author, time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                subject,
                module,
                content,
                difficulty,
                image_data,
                analysis,
                tags,
                mastery,
                author,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "msg": "录入成功"})

    @app.route("/api/mistakes/<int:item_id>", methods=["PUT"])
    def update_mistake(item_id):
        payload = request.get_json(silent=True) or {}
        current_user = (payload.get("current_user") or "").strip()
        role = (payload.get("role") or "guest").strip()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT author FROM wrong_questions WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"code": 404, "msg": "错题不存在"})

        if role != "admin" and row["author"] != current_user:
            conn.close()
            return jsonify({"code": 403, "msg": "无权限修改该错题"})

        subject = (payload.get("subject") or "行测").strip()
        content = (payload.get("content") or "").strip()
        image_data = payload.get("image_data") or ""
        analysis = (payload.get("analysis") or "").strip()
        tags = (payload.get("tags") or "").strip()
        mastery = _normalize_mastery((payload.get("mastery") or "").strip())
        module, difficulty = _parse_analysis(analysis)

        cursor.execute(
            """
            UPDATE wrong_questions
            SET subject = ?, module = ?, content = ?, difficulty = ?, image_data = ?,
                analysis = ?, tags = ?, mastery = ?
            WHERE id = ?
            """,
            (subject, module, content, difficulty, image_data, analysis, tags, mastery, item_id),
        )
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "msg": "修改成功"})

    @app.route("/api/mistakes/<int:item_id>", methods=["DELETE"])
    def delete_mistake(item_id):
        current_user = (request.args.get("author") or "").strip()
        role = (request.args.get("role") or "guest").strip()
        payload = request.get_json(silent=True) or {}
        if not current_user:
            current_user = (payload.get("current_user") or "").strip()
        if role == "guest":
            role = (payload.get("role") or "guest").strip()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT author FROM wrong_questions WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"code": 404, "msg": "错题不存在"})

        if role != "admin" and row["author"] != current_user:
            conn.close()
            return jsonify({"code": 403, "msg": "无权限删除该错题"})

        cursor.execute("DELETE FROM wrong_questions WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "msg": "删除成功"})
