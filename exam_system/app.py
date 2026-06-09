from flask import Flask, send_from_directory
from flask_cors import CORS
import os
from api import init_app
from utils.db import init_db

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

# 注册所有模块
if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    init_db()

# 注册所有业务接口
init_app(app)

@app.route('/')
def index():
    return send_from_directory(os.path.join(os.path.dirname(__file__), 'static'), 'index.html')


@app.route('/<page>')
def static_page(page):
    pages = {
        'dashboard': 'index.html',
        'mistakes': 'mistakes.html',
        'checkin': 'checkin.html',
        'politics': 'politics.html',
        'idioms': 'idioms.html',
        'forum': 'forum.html',
        'resources': 'resources.html',
    }
    filename = pages.get(page)
    if not filename:
        return send_from_directory(os.path.join(os.path.dirname(__file__), 'static'), 'index.html')
    return send_from_directory(os.path.join(os.path.dirname(__file__), 'static'), filename)


@app.route('/healthz')
def healthz():
    return {"status": "ok"}

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(debug=debug, host='0.0.0.0', port=port)
