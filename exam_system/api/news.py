from datetime import datetime
from email.utils import parsedate_to_datetime
import html
import re
import urllib.request
import xml.etree.ElementTree as ET


RSS_URL = "http://www.people.com.cn/rss/politics.xml"

FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
]


def _clean_text(value):
    text = html.unescape(value or "")
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _format_time(value):
    if not value:
        return datetime.now().strftime("%m-%d %H:%M")
    try:
        dt = parsedate_to_datetime(value)
        return dt.strftime("%m-%d %H:%M")
    except (TypeError, ValueError):
        return _clean_text(value)


def _fetch_people_news():
    request = urllib.request.Request(
        RSS_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; ExamSystem/1.0; +https://www.people.com.cn/)"
        },
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        raw = response.read()

    root = ET.fromstring(raw)
    items = root.findall(".//item")[:6]
    news_items = []

    for index, item in enumerate(items):
        title = _clean_text(item.findtext("title"))
        link = _clean_text(item.findtext("link"))
        description = _clean_text(item.findtext("description"))
        pub_date = _format_time(item.findtext("pubDate"))

        if not title:
            continue

        news_items.append({
            "title": title,
            "source": "人民网",
            "time": pub_date,
            "image": FALLBACK_IMAGES[index % len(FALLBACK_IMAGES)],
            "content": description or f"点击原文可查看人民网发布的完整报道：{title}",
            "url": link,
        })

    return news_items


def register(app):
    @app.route("/api/news", methods=["GET"])
    def get_news():
        try:
            news_items = _fetch_people_news()
            if news_items:
                return {"code": 200, "source": "人民网时政 RSS", "data": news_items}
        except Exception as exc:
            return {
                "code": 503,
                "msg": f"新闻源暂时不可用：{exc}",
                "data": [],
            }, 503

        return {"code": 503, "msg": "新闻源暂无数据", "data": []}, 503
