# 部署说明

这个项目现在已经可以作为 Flask Web Service 部署到线上，最省事的是 Render。

## Render

1. 把项目推到 GitHub。
2. 在 Render 新建 `Web Service`，连接你的仓库。
3. Render 会自动读取仓库根目录的 `render.yaml`。
4. 首次部署完成后，访问 Render 分配的公网域名。

当前仓库已经包含：

- `requirements.txt`
- `Procfile`
- `render.yaml`
- `/healthz` 健康检查接口
- 生产可用的 `gunicorn app:app` 启动命令

## 重要说明

项目默认使用 SQLite。

- 本地运行时：数据库在 `data/exam_system.db`
- 线上运行时：数据库位置由 `DB_PATH` 环境变量控制

如果你部署到 Render：

- 免费实例的文件系统是临时的，服务重启或重新部署后 SQLite 数据可能丢失。
- 如果你需要长期保留线上数据，建议：
  - 给服务挂载持久磁盘
  - 或改成 PostgreSQL / MySQL

## Railway

Railway 也可以部署这个项目，启动命令使用：

```bash
gunicorn app:app
```

但如果继续使用 SQLite，同样要考虑数据持久化问题。
