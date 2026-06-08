from flask import jsonify

from utils.db import get_connection


def register(app):
    @app.route("/api/statistics", methods=["GET"])
    def get_statistics():
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM wrong_questions")
        mistake_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM resources")
        resource_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM forum_posts")
        forum_count = cursor.fetchone()[0]

        conn.close()
        return jsonify(
            {
                "code": 200,
                "data": {
                    "mistake_count": mistake_count,
                    "resource_count": resource_count,
                    "forum_count": forum_count,
                },
            }
        )
