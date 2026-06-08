from datetime import datetime

from flask import jsonify, request

from utils.db import get_connection


def register(app):
    @app.route("/api/forum", methods=["GET"])
    def get_forum_posts():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, author, content, likes, time
            FROM forum_posts
            ORDER BY id DESC
            """
        )
        rows = [dict(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT id, post_id, author, content, likes, time
            FROM forum_comments
            ORDER BY id ASC
            """
        )
        comments_by_post = {}
        for row in cursor.fetchall():
            comment = dict(row)
            comments_by_post.setdefault(comment["post_id"], []).append(comment)

        for post in rows:
            post["comments"] = comments_by_post.get(post["id"], [])

        conn.close()
        return jsonify({"code": 200, "data": rows})

    @app.route("/api/forum", methods=["POST"])
    def create_forum_post():
        payload = request.get_json(silent=True) or {}
        content = (payload.get("content") or "").strip()
        author = (payload.get("author") or "热心考友").strip()
        if not content:
            return jsonify({"code": 400, "msg": "内容不能为空"})

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO forum_posts (author, content, likes, time)
            VALUES (?, ?, ?, ?)
            """,
            (author, content, 0, datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        )
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "msg": "发布成功"})

    @app.route("/api/forum/<int:post_id>", methods=["DELETE"])
    def delete_forum_post(post_id):
        payload = request.get_json(silent=True) or {}
        current_user = (payload.get("current_user") or request.args.get("author") or "").strip()
        role = (payload.get("role") or request.args.get("role") or "guest").strip()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT author FROM forum_posts WHERE id = ?", (post_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"code": 404, "msg": "动态不存在"})

        if role != "admin" and row["author"] != current_user:
            conn.close()
            return jsonify({"code": 403, "msg": "无权限删除该动态"})

        cursor.execute("DELETE FROM forum_comments WHERE post_id = ?", (post_id,))
        cursor.execute("DELETE FROM forum_posts WHERE id = ?", (post_id,))
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "msg": "删除成功"})

    @app.route("/api/forum/<int:post_id>/like", methods=["POST"])
    def like_forum_post(post_id):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE forum_posts SET likes = likes + 1 WHERE id = ?", (post_id,))
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({"code": 404, "msg": "动态不存在"})
        cursor.execute("SELECT likes FROM forum_posts WHERE id = ?", (post_id,))
        likes = cursor.fetchone()["likes"]
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "likes": likes})

    @app.route("/api/forum/<int:post_id>/comments", methods=["POST"])
    def create_forum_comment(post_id):
        payload = request.get_json(silent=True) or {}
        content = (payload.get("content") or "").strip()
        author = (payload.get("author") or "热心考友").strip()
        if not content:
            return jsonify({"code": 400, "msg": "评论内容不能为空"})

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM forum_posts WHERE id = ?", (post_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"code": 404, "msg": "动态不存在"})

        cursor.execute(
            """
            INSERT INTO forum_comments (post_id, author, content, likes, time)
            VALUES (?, ?, ?, ?, ?)
            """,
            (post_id, author, content, 0, datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        )
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "msg": "评论成功"})

    @app.route("/api/forum/comments/<int:comment_id>/like", methods=["POST"])
    def like_forum_comment(comment_id):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE forum_comments SET likes = likes + 1 WHERE id = ?", (comment_id,))
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({"code": 404, "msg": "评论不存在"})
        cursor.execute("SELECT likes FROM forum_comments WHERE id = ?", (comment_id,))
        likes = cursor.fetchone()["likes"]
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "likes": likes})

    @app.route("/api/forum/comments/<int:comment_id>", methods=["DELETE"])
    def delete_forum_comment(comment_id):
        payload = request.get_json(silent=True) or {}
        current_user = (payload.get("current_user") or request.args.get("author") or "").strip()
        role = (payload.get("role") or request.args.get("role") or "guest").strip()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT author FROM forum_comments WHERE id = ?", (comment_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"code": 404, "msg": "评论不存在"})

        if role != "admin" and row["author"] != current_user:
            conn.close()
            return jsonify({"code": 403, "msg": "无权限删除该评论"})

        cursor.execute("DELETE FROM forum_comments WHERE id = ?", (comment_id,))
        conn.commit()
        conn.close()
        return jsonify({"code": 200, "msg": "评论删除成功"})
