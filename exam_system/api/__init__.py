from . import focus, forum, mistake, news, quote, resource, statistic


def init_app(app):
    mistake.register(app)
    resource.register(app)
    forum.register(app)
    focus.register(app)
    statistic.register(app)
    quote.register(app)
    news.register(app)
