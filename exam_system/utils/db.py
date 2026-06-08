import sqlite3
import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = Path(os.environ.get("DB_PATH", str(DATA_DIR / "exam_system.db")))


def get_connection():
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript(
        """
        CREATE TABLE IF NOT EXISTS wrong_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            module TEXT DEFAULT '',
            category TEXT DEFAULT '行测',
            content TEXT DEFAULT '',
            difficulty TEXT DEFAULT '中等',
            image TEXT DEFAULT '',
            image_data TEXT DEFAULT '',
            analysis TEXT DEFAULT '',
            author TEXT DEFAULT '热心考友',
            time TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS forum_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT DEFAULT '热心考友',
            content TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            time TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS forum_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            author TEXT DEFAULT '热心考友',
            content TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            time TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT DEFAULT '热心考友',
            content TEXT DEFAULT '',
            image_data TEXT DEFAULT '',
            time TEXT DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    for column_name, column_def in (
        ("tags", "TEXT DEFAULT ''"),
        ("mastery", "TEXT DEFAULT '未掌握'"),
    ):
        try:
            cursor.execute(f"ALTER TABLE wrong_questions ADD COLUMN {column_name} {column_def}")
        except sqlite3.OperationalError:
            pass

    try:
        cursor.execute("ALTER TABLE resources ADD COLUMN category TEXT DEFAULT '行测'")
    except sqlite3.OperationalError:
        pass
    cursor.execute("UPDATE resources SET category = '行测' WHERE category IS NULL OR category = ''")

    cursor.execute("SELECT COUNT(*) FROM wrong_questions")
    if cursor.fetchone()[0] == 0:
        cursor.executemany(
            """
            INSERT INTO wrong_questions (subject, module, content, difficulty, analysis, author)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("行测", "资料分析", "增长率比较题总是容易算错，需要加强速算和基期识别。", "中等", "[模块: 资料分析] | [难度: 中等]", "系统示例"),
                ("行测", "判断推理", "图推中位置类和数量类特征区分不够稳定。", "困难", "[模块: 判断推理] | [难度: 困难]", "系统示例"),
                ("申论", "言语理解", "概括题答案容易写散，缺少总分结构。", "中等", "[模块: 言语理解] | [难度: 中等]", "系统示例"),
            ],
        )

    demo_mistakes = {
        "admin": [
            ("行测", "资料分析", "增长率比较题容易把现期量和基期量代反，需要先圈出时间口径再列式。", "中等", "[模块: 资料分析] | [难度: 中等]", "admin"),
            ("行测", "判断推理", "图形推理中只观察数量规律不够，还要同步检查位置、样式和对称轴变化。", "困难", "[模块: 判断推理] | [难度: 困难]", "admin"),
            ("申论", "综合分析", "分析题答案缺少观点前置，导致阅卷时核心判断不够突出。", "中等", "[模块: 综合分析] | [难度: 中等]", "admin"),
        ],
        "小明": [
            ("行测", "言语理解", "中心理解题容易被细节选项带偏，需要先找主题词和转折后的重点句。", "简单", "[模块: 言语理解] | [难度: 简单]", "小明"),
            ("行测", "数量关系", "工程问题没有统一工作总量，导致方程设错。建议优先设总量为效率的最小公倍数。", "困难", "[模块: 数量关系] | [难度: 困难]", "小明"),
            ("申论", "归纳概括", "材料要点提取不全，尤其漏掉了对策类关键词。下次按主体、问题、原因、对策分层标注。", "中等", "[模块: 归纳概括] | [难度: 中等]", "小明"),
        ],
    }

    for author, rows in demo_mistakes.items():
        for row in rows:
            cursor.execute(
                "SELECT COUNT(*) FROM wrong_questions WHERE author = ? AND content = ?",
                (author, row[2]),
            )
            if cursor.fetchone()[0] > 0:
                continue
            cursor.execute(
                """
                INSERT INTO wrong_questions (subject, module, content, difficulty, analysis, author)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                row,
            )

    cursor.execute("UPDATE wrong_questions SET mastery = '未掌握' WHERE mastery IS NULL OR mastery = ''")
    cursor.execute("UPDATE wrong_questions SET tags = module WHERE (tags IS NULL OR tags = '') AND module IS NOT NULL AND module != ''")

    cursor.execute("SELECT COUNT(*) FROM forum_posts")
    if cursor.fetchone()[0] == 0:
        cursor.executemany(
            """
            INSERT INTO forum_posts (author, content, likes)
            VALUES (?, ?, ?)
            """,
            [
                ("上岸冲刺中", "今天把资料分析模块重新刷了一遍，感觉速度提升不少。", 3),
                ("系统示例", "建议大家每晚花 10 分钟回顾错题，会比盲目刷题更有效。", 5),
            ],
        )

    cursor.execute("SELECT COUNT(*) FROM resources")
    if cursor.fetchone()[0] == 0:
        cursor.executemany(
            """
            INSERT INTO resources (author, category, content)
            VALUES (?, '行测', ?)
            """,
            [
                ("系统示例", "资料分析速算口诀整理，可作为考前回顾清单。"),
                ("系统示例", "申论高频表达素材库，适合日常积累。"),
            ],
        )

    conn.commit()
    conn.close()
